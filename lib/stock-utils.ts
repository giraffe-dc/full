import { ObjectId } from "mongodb";

// Logic to APPLY stock changes
export async function applyBalances(db: any, data: any, session?: any) {
    if (!data.items || !Array.isArray(data.items)) return;

    for (const item of data.items) {
        const qty = parseFloat(item.qty);
        const cost = parseFloat(item.cost || 0);

        if (data.type === 'supply') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        lastCost: cost, // Update last cost only on supply
                        updatedAt: new Date()
                    }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'move') {
            // Revert Move: Increase Source, Decrease Target
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, ...(session ? { session } : {}) }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: { itemName: item.itemName, unit: item.unit, updatedAt: new Date() }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'inventory') {
            // For inventory, qty is the DELTA (Actual - Theoretical)
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        updatedAt: new Date(),
                        lastInventoryDate: new Date(data.date),
                        lastInventoryQty: item.actualQty
                    }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        }
    }
}

// Logic to REVERT stock changes (Exactly inverse of apply)
export async function revertBalances(db: any, data: any, session?: any) {
    if (!data.items || !Array.isArray(data.items)) return;

    for (const item of data.items) {
        const qty = parseFloat(item.qty);

        if (data.type === 'supply') {
            // Revert Supply: Decrease Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            // Revert Writeoff/Sale: Increase Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'move') {
            // Revert Move: Increase Source, Decrease Target
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'inventory') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } }, // Revert delta
                { ...(session ? { session } : {}) }
            );
        }
    }
}

// ============================================================
// PRICE SYNC (WMA) — план: docs/STOCK_PRICING_FIX_PLAN.md
// Активується ЛИШЕ через env: STOCK_PRICE_SYNC_ENABLED=true.
// Виконується ПОЗА транзакціями приходів: помилка синхронізації
// не може зламати проведення приходу (розділ 5.4 плану).
// ============================================================

export function isPriceSyncEnabled(): boolean {
    return process.env.STOCK_PRICE_SYNC_ENABLED === "true";
}

/**
 * Формула WMA (розділ 3.2 плану):
 * newCost = (oldQty*oldCost + inQty*inCost) / (oldQty + inQty)
 * При oldQty <= 0 (нуль/від'ємний залишок) — нова ціна = ціна приходу.
 * Повертає null, якщо прихід некоректний (qty/cost <= 0) — ціну не чіпаємо.
 */
export function calculateWeightedAverage(
    oldQty: number,
    oldCost: number,
    inQty: number,
    inCost: number
): number | null {
    if (!Number.isFinite(inQty) || inQty <= 0) return null;
    if (!Number.isFinite(inCost) || inCost <= 0) return null;
    if (!Number.isFinite(oldQty) || oldQty <= 0 || !Number.isFinite(oldCost) || oldCost <= 0) {
        return inCost;
    }
    const newCost = (oldQty * oldCost + inQty * inCost) / (oldQty + inQty);
    return newCost > 0 ? newCost : null;
}

async function findIngredient(db: any, itemId: string): Promise<any | null> {
    if (!itemId) return null;
    const filter = ObjectId.isValid(itemId)
        ? { $or: [{ _id: new ObjectId(itemId) }, { id: itemId }] }
        : { id: itemId };
    return db.collection("ingredients").findOne(filter);
}

/**
 * Сума залишків по itemId по ВСІХ складах — з історії stock_movements
 * (canonical-джерело, розділ 3.1 плану; логіка як у balances route,
 * включно з reset-ом на inventory). Використовується для oldQty у WMA.
 */
export async function getItemBalances(db: any, itemIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!itemIds || itemIds.length === 0) return result;

    const pipeline: any[] = [
        { $match: { isDeleted: { $ne: true } } },
        { $unwind: "$items" },
        {
            $project: {
                type: 1,
                date: 1,
                warehouseId: { $toString: { $ifNull: ["$warehouseId", null] } },
                toWarehouseId: { $toString: { $ifNull: ["$toWarehouseId", null] } },
                itemId: { $toString: "$items.itemId" },
                qty: { $toDouble: "$items.qty" },
                actualQty: { $toDouble: { $ifNull: ["$items.actualQty", "$items.qty"] } }
            }
        },
        { $match: { itemId: { $in: itemIds } } },
        {
            $project: {
                movements: [
                    {
                        warehouseId: "$warehouseId",
                        itemId: "$itemId",
                        date: "$date",
                        type: "$type",
                        qty: "$qty",
                        actualQty: "$actualQty",
                        change: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$type", "supply"] }, then: "$qty" },
                                    { case: { $eq: ["$type", "writeoff"] }, then: { $multiply: ["$qty", -1] } },
                                    { case: { $eq: ["$type", "sale"] }, then: { $multiply: ["$qty", -1] } },
                                    { case: { $eq: ["$type", "move"] }, then: { $multiply: ["$qty", -1] } },
                                    { case: { $eq: ["$type", "inventory"] }, then: 0 }
                                ],
                                default: 0
                            }
                        }
                    },
                    {
                        warehouseId: "$toWarehouseId",
                        itemId: "$itemId",
                        date: "$date",
                        type: "move_in",
                        qty: "$qty",
                        actualQty: "$actualQty",
                        change: { $cond: [{ $eq: ["$type", "move"] }, "$qty", 0] }
                    }
                ]
            }
        },
        { $unwind: "$movements" },
        { $match: { "movements.warehouseId": { $ne: null } } },
        { $sort: { "movements.date": 1, _id: 1 } },
        {
            $group: {
                _id: { warehouseId: "$movements.warehouseId", itemId: "$movements.itemId" },
                history: { $push: "$movements" }
            }
        }
    ];

    const rows = await db.collection("stock_movements").aggregate(pipeline).toArray();
    for (const row of rows) {
        let balance = 0;
        for (const m of row.history || []) {
            if (m.type === "inventory") {
                balance = m.actualQty || 0;
            } else {
                balance += m.change || 0;
            }
        }
        const itemId = row._id.itemId;
        result.set(itemId, (result.get(itemId) || 0) + balance);
    }
    return result;
}

/**
 * Перерахунок WMA по ВСІХ активних (не-deleted) supply-рухах itemId
 * (розділ 3.3 плану): newCost = Σ(qty×cost) / Σ(qty).
 * Повертає null, якщо коректних supply немає — ціну не чіпаємо.
 */
export async function recalculateIngredientPriceFromSupplies(
    db: any,
    itemId: string
): Promise<number | null> {
    if (!itemId) return null;
    const rows = await db
        .collection("stock_movements")
        .aggregate([
            { $match: { type: "supply", isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            {
                $project: {
                    itemId: { $toString: "$items.itemId" },
                    qty: { $toDouble: "$items.qty" },
                    cost: { $toDouble: { $ifNull: ["$items.cost", 0] } }
                }
            },
            { $match: { itemId } }
        ])
        .toArray();

    let sum = 0;
    let qty = 0;
    for (const r of rows) {
        if ((r.qty || 0) > 0 && (r.cost || 0) > 0) {
            sum += r.qty * r.cost;
            qty += r.qty;
        }
    }
    return qty > 0 ? sum / qty : null;
}

/**
 * Оновлення ціни в довіднику інгредієнтів (canonical-джерело ціни).
 * Якщо itemId — не інгредієнт (напр., товар) — тихо пропускаємо.
 * Повертає true, якщо запис довідника оновлено.
 */
export async function syncIngredientCost(db: any, itemId: string, newCost: number): Promise<boolean> {
    const ingredient = await findIngredient(db, itemId);
    if (!ingredient) return false;
    await db
        .collection("ingredients")
        .updateOne({ _id: ingredient._id }, { $set: { costPerUnit: newCost, priceSyncedAt: new Date() } });
    return true;
}

/**
 * Каскадне оновлення техкарт після зміни ціни інгредієнта (розділ 3.4 плану).
 * Матчинг: за справжнім ingredientId (_id/id), fallback — normalized name
 * (поки в техкартах трапляються «фантомні» ing-... ID).
 * Оновлює: ing.costPerUnit, ing.totalCost, recipe.costPerUnit, markup.
 * Повертає кількість оновлених техкарт.
 */
export async function cascadeUpdateRecipes(db: any, ingredient: any, newCost: number): Promise<number> {
    if (!ingredient) return 0;

    const realId = ingredient._id ? ingredient._id.toString() : null;
    const altIds = new Set<string>([realId, ingredient.id].filter(Boolean) as string[]);
    const normName = (ingredient.name || "").toString().toLowerCase().trim();

    const recipes = await db
        .collection("recipes")
        .find({ status: "active", ingredients: { $exists: true, $ne: [] } })
        .toArray();

    const toUpdate: any[] = [];
    for (const recipe of recipes) {
        let changed = false;
        const newIngs = (recipe.ingredients || []).map((ing: any) => {
            const ingId = ing.id ? ing.id.toString() : "";
            const ingName = (ing.name || "").toString().toLowerCase().trim();
            const matches = altIds.has(ingId) || (normName.length > 0 && ingName === normName);
            if (!matches) return ing;
            changed = true;
            const qtyField = Number(ing.gross) || Number(ing.net) || Number(ing.quantity) || 0;
            return { ...ing, costPerUnit: newCost, totalCost: newCost * qtyField };
        });
        if (!changed) continue;

        const totalCost = newIngs.reduce((s: number, ing: any) => s + (Number(ing.totalCost) || 0), 0);
        let markup = recipe.markup;
        if (recipe.sellingPrice && totalCost > 0) {
            markup = ((recipe.sellingPrice - totalCost) / totalCost) * 100;
        }
        toUpdate.push({ _id: recipe._id, name: recipe.name, ingredients: newIngs, costPerUnit: totalCost, markup });
    }

    // Пакетне оновлення по 500 техкарт (розділ 5.3 плану — ліміт розміру операції)
    const BATCH = 500;
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
        const ops = toUpdate.slice(i, i + BATCH).map((r: any) => ({
            updateOne: {
                filter: { _id: r._id },
                update: {
                    $set: {
                        ingredients: r.ingredients,
                        costPerUnit: r.costPerUnit,
                        markup: r.markup,
                        lastModified: new Date().toISOString(),
                        priceSyncedAt: new Date()
                    }
                }
            }
        }));
        if (ops.length > 0) {
            const res = await db.collection("recipes").bulkWrite(ops, { ordered: false });
            updated += res.modifiedCount || 0;
        }
    }
    return updated;
}

/**
 * Синхронізація цін УСІХ інгредієнтів з активними supply-рухами (Етап 5,
 * викликається з recalculate). Повертає кількість оновлених інгредієнтів.
 */
export async function syncAllIngredientPrices(db: any): Promise<number> {
    const rows = await db
        .collection("stock_movements")
        .aggregate([
            { $match: { type: "supply", isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            { $group: { _id: { $toString: "$items.itemId" } } }
        ])
        .toArray();

    let updated = 0;
    for (const row of rows) {
        const itemId = row._id;
        const ingredient = await findIngredient(db, itemId);
        if (!ingredient) continue; // не інгредієнт (товар) — пропускаємо

        const newCost = await recalculateIngredientPriceFromSupplies(db, itemId);
        if (newCost === null) continue;

        await syncIngredientCost(db, itemId, newCost);
        await cascadeUpdateRecipes(db, ingredient, newCost);
        updated++;
    }
    console.log(`[PRICE_SYNC all] Оновлено цін інгредієнтів: ${updated} з ${rows.length}`);
    return updated;
}

/**
 * Вхідна точка ПІСЛЯ створення приходу (POST supply).
 * preBalances — залишки ДО приходу (зчитані до транзакції).
 * Виконується поза транзакцією; викликач ловить помилки.
 */
export async function syncSupplyPrices(
    db: any,
    supplyItems: any[],
    preBalances: Map<string, number>
): Promise<void> {
    for (const item of supplyItems || []) {
        const itemId = item?.itemId ? item.itemId.toString() : null;
        if (!itemId) continue;

        const inQty = parseFloat(item.qty);
        const inCost = parseFloat(item.cost || 0);
        const ingredient = await findIngredient(db, itemId);
        if (!ingredient) continue; // не інгредієнт (товар) — свідомо пропускаємо

        const oldCost = Number(ingredient.costPerUnit) || 0;
        const newCost = calculateWeightedAverage(preBalances.get(itemId) || 0, oldCost, inQty, inCost);
        if (newCost === null) {
            console.warn(`[PRICE_SYNC] Пропущено itemId=${itemId}: некоректний прихід (qty=${inQty}, cost=${inCost})`);
            continue;
        }

        const recipesUpdated = await syncIngredientCost(db, itemId, newCost)
            ? await cascadeUpdateRecipes(db, ingredient, newCost)
            : 0;

        if (oldCost > 0 && Math.abs(newCost - oldCost) / oldCost > 0.5) {
            console.warn(`[PRICE_SYNC] itemId=${itemId} (${ingredient.name}): ціна змінилась >50%: old=${oldCost} → new=${newCost.toFixed(4)}`);
        } else {
            console.log(`[PRICE_SYNC] itemId=${itemId} (${ingredient.name}): old=${oldCost} → new=${newCost.toFixed(4)}, recipes updated: ${recipesUpdated}`);
        }
    }
}

/**
 * Вхідна точка ПІСЛЯ зміни/видалення/відновлення приходу (PUT/DELETE).
 * Перераховує WMA наново по активних supply-рухах (розділ 3.3 плану)
 * для всіх itemId зі старого і нового складу позицій.
 * Виконується поза транзакцією; викликач ловить помилки.
 */
export async function recalcSupplyItemPrices(db: any, itemArrays: any[][]): Promise<void> {
    const ids = new Set<string>();
    for (const arr of itemArrays || []) {
        for (const item of arr || []) {
            if (item?.itemId) ids.add(item.itemId.toString());
        }
    }

    for (const itemId of ids) {
        const ingredient = await findIngredient(db, itemId);
        if (!ingredient) continue;

        const newCost = await recalculateIngredientPriceFromSupplies(db, itemId);
        if (newCost === null) continue;

        const oldCost = Number(ingredient.costPerUnit) || 0;
        const recipesUpdated = await syncIngredientCost(db, itemId, newCost)
            ? await cascadeUpdateRecipes(db, ingredient, newCost)
            : 0;

        console.log(`[PRICE_SYNC recalc] itemId=${itemId} (${ingredient.name}): old=${oldCost} → new=${newCost.toFixed(4)}, recipes updated: ${recipesUpdated}`);
    }
}





