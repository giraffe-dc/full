/**
 * verify-wma.js — read-only верифікатор автооновлення цін (WMA).
 * План: docs/STOCK_PRICING_FIX_PLAN.md (Етап 1, розділ 5.6).
 *
 * Що робить:
 *   - перераховує очікувану ціну кожного інгредієнта за формулою WMA
 *     по активних (не-deleted) supply-рухах;
 *   - порівнює з поточним ingredients.costPerUnit;
 *   - показує, скільки активних техкарт зачіпає кожен інгредієнт;
 *   - попереджає про відхилення >50%.
 *
 * ВАЖЛИВО: НЕ виконує ЖОДНОГО запису до БД (read-only).
 *
 * Використання:
 *   node scripts/verify-wma.js               # БД з .env.local (MONGODB_URI)
 *   node scripts/verify-wma.js --db <uri>    # інша БД (наприклад, прод)
 */
require('dotenv').config({ path: '.env.local' });

const { MongoClient } = require('mongodb');

async function main() {
    const args = process.argv.slice(2);
    const dbArgIndex = args.indexOf('--db');
    const uri = dbArgIndex !== -1 ? args[dbArgIndex + 1] : process.env.MONGODB_URI;
    if (!uri) {
        console.error('[verify-wma] MONGODB_URI не задано (.env.local) і не передано --db');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('giraffe');

    console.log('[verify-wma] Read-only перевірка цін (WMA). Підключення встановлено.\n');

    // 1. Активні supply-рухи → накопичення Σ(qty×cost) і Σqty по itemId
    const supplies = await db
        .collection('stock_movements')
        .find({ type: 'supply', isDeleted: { $ne: true } })
        .toArray();

    const wma = new Map();
    for (const s of supplies) {
        for (const item of s.items || []) {
            const id = item.itemId ? item.itemId.toString() : null;
            if (!id) continue;
            const qty = Number(item.qty) || 0;
            const cost = Number(item.cost) || 0;
            if (qty > 0 && cost > 0) {
                const acc = wma.get(id) || { sum: 0, qty: 0 };
                acc.sum += qty * cost;
                acc.qty += qty;
                wma.set(id, acc);
            }
        }
    }

    // 2. Скільки активних техкарт зачіпає кожен інгредієнт
    // (рахуємо за обома ключами: ing.id І назвою — бо в техкартах зустрічаються
    // «фантомні» ing-... ID, а реальний матчинг у cascadeUpdateRecipes — id АБО ім'я)
    const recipes = await db.collection('recipes').find({ status: 'active' }).toArray();
    const norm = (v) => (v || '').toString().toLowerCase().trim();
    const recipeCount = new Map();
    const bump = (key) => { if (key) recipeCount.set(key, (recipeCount.get(key) || 0) + 1); };
    for (const r of recipes) {
        for (const ing of r.ingredients || []) {
            if (ing.id) bump(ing.id.toString());
            bump(`name:${norm(ing.name)}`);
        }
    }

    // 3. Порівняння з поточними цінами довідника
    const ingredients = await db.collection('ingredients').find({ status: 'active' }).toArray();
    let withSupplies = 0;
    let toChange = 0;
    let bigDeviation = 0;

    const line = '─'.repeat(100);
    console.log(line);
    console.log(
        'ІНГРЕДІЄНТ'.padEnd(34) +
        'ПОТОЧНА'.padEnd(12) +
        'WMA(очік.)'.padEnd(12) +
        'ВІДХИЛ.'.padEnd(12) +
        'ТЕХКАРТ'
    );
    console.log(line);

    for (const ing of ingredients) {
        const id = ing._id.toString();
        const current = Number(ing.costPerUnit) || 0;
        const acc = wma.get(id);
        const recipesTouched =
            recipeCount.get(id) || recipeCount.get(`name:${norm(ing.name)}`) || 0;

        if (!acc) {
            continue; // немає активних supply — ціна не зміниться
        }
        withSupplies++;

        const expected = acc.sum / acc.qty;
        const diffPct = current > 0 ? ((expected - current) / current) * 100 : NaN;
        const willChange = !Number.isFinite(diffPct) || Math.abs(diffPct) > 0.01;
        if (willChange) toChange++;
        if (Number.isFinite(diffPct) && Math.abs(diffPct) > 50) bigDeviation++;

        const flag = Math.abs(diffPct) > 50 ? '⚠ ' : '';
        const diffStr = Number.isFinite(diffPct) ? `${diffPct.toFixed(1)}%` : 'NEW';
        console.log(
            `${flag}${ing.name}`.slice(0, 34).padEnd(34) +
            current.toFixed(2).padEnd(12) +
            expected.toFixed(2).padEnd(12) +
            diffStr.padEnd(12) +
            String(recipesTouched)
        );
    }

    console.log(line);
    console.log(`Активних supply-рухів: ${supplies.length}`);
    console.log(`Інгредієнтів з активними supply: ${withSupplies}`);
    console.log(`Очікують оновлення ціни: ${toChange}`);
    console.log(`З них відхилення >50% (⚠ — переглянути вручну): ${bigDeviation}`);
    console.log('\n[verify-wma] Звіт завершено. Записів до БД не виконано (read-only).');

    await client.close();
}

main().catch((e) => {
    console.error('[verify-wma] Помилка:', e.message);
    process.exit(1);
});
