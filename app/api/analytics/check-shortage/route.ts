import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { products, packageId } = body;
        console.log('🔍 [API:check-shortage] Request body:', { productsCount: products?.length, packageId });

        const client = await clientPromise;
        const db = client.db('giraffe');

        // 1. Get all recipes and packages
        const recipes = await db.collection('recipes').find({ status: 'active' }).toArray();
        const packages = await db.collection('event_packages').find({ status: 'active' }).toArray();
        const ingredients = await db.collection('ingredients').find().toArray();

        console.log(`📊 [API:check-shortage] DB Data: ${recipes.length} recipes, ${packages.length} packages, ${ingredients.length} ingredients`);

        // 2. Map for quick lookup
        const recipeMap = new Map(recipes.map(r => [r.id || r._id.toString(), r]));
        const ingredientMap = new Map();
        ingredients.forEach(i => {
            if (i.id) ingredientMap.set(i.id, i);
            if (i._id) ingredientMap.set(i._id.toString(), i);
        });
        const packageMap = new Map(packages.map(p => [p.id || p._id.toString(), p]));

        const neededIngredients: Record<string, { qty: number, name: string, unit: string }> = {};

        function addRecipe(recipeId: string, qty: number) {
            const recipe = recipeMap.get(recipeId);
            if (!recipe) {
                console.warn(`⚠️ [API:check-shortage] Recipe not found: ${recipeId}`);
                return;
            }
            if (!recipe.ingredients) {
                console.warn(`⚠️ [API:check-shortage] Recipe has no ingredients: ${recipeId}`);
                return;
            }

            recipe.ingredients.forEach((ing: any) => {
                const id = ing.id;
                const amount = (ing.quantity || ing.gross || 0) * qty;
                if (!neededIngredients[id]) {
                    neededIngredients[id] = { qty: 0, name: ing.name || 'Unknown', unit: ing.unit || '' };
                }
                neededIngredients[id].qty += amount;
            });
        }

        // 3. Process products (manual selection)
        if (products && Array.isArray(products)) {
            products.forEach(p => {
                // If it's a recipe, decompose it
                if (recipeMap.has(p.id)) {
                    addRecipe(p.id, p.quantity);
                }
                // If it's directly an ingredient, add it
                else if (ingredientMap.has(p.id)) {
                    const ing = ingredientMap.get(p.id);
                    if (!neededIngredients[p.id]) {
                        neededIngredients[p.id] = { qty: 0, name: ing.name || 'Unknown', unit: ing.unit || '' };
                    }
                    neededIngredients[p.id].qty += p.quantity;
                } else {
                    console.log(`ℹ️ [API:check-shortage] Product ${p.id} is neither a recipe nor an ingredient`);
                }
            });
        }

        // 4. Process package
        if (packageId) {
            const pkg = packageMap.get(packageId);
            if (pkg) {
                console.log(`📦 [API:check-shortage] Processing package: ${pkg.name}`);
                if (pkg.includedServices) {
                    pkg.includedServices.forEach((service: any) => {
                        if (recipeMap.has(service.id)) {
                            addRecipe(service.id, service.quantity || 1);
                        } else {
                            console.log(`ℹ️ [API:check-shortage] Service ${service.id} in package is not a recipe`);
                        }
                    });
                }
            } else {
                console.warn(`⚠️ [API:check-shortage] Package not found: ${packageId}`);
            }
        }

        console.log('✅ [API:check-shortage] Total needed ingredients:', neededIngredients);

        if (Object.keys(neededIngredients).length === 0) {
            console.log('ℹ️ [API:check-shortage] No ingredients needed for this selection');
            return NextResponse.json({ success: true, shortages: [] });
        }

        // 5. Get current stock balances
        const stockItems = await db.collection("stock_movements").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $toString: "$items.itemId" },
                    movements: {
                        $push: {
                            type: "$type",
                            date: "$date",
                            qty: { $toDouble: "$items.qty" },
                            actualQty: { $toDouble: { $ifNull: ["$items.actualQty", "$items.qty"] } }
                        }
                    }
                }
            }
        ]).toArray();

        const balances: Record<string, number> = {};
        stockItems.forEach(item => {
            const sorted = item.movements.sort((a: any, b: any) => {
                const da = a.date ? new Date(a.date).getTime() : 0;
                const db = b.date ? new Date(b.date).getTime() : 0;
                return da - db;
            });
            let balance = 0;
            for (const m of sorted) {
                if (m.type === 'inventory') {
                    balance = m.actualQty;
                } else if (m.type === 'supply') {
                    balance += m.qty;
                } else if (['writeoff', 'sale', 'move'].includes(m.type)) {
                    balance -= m.qty;
                }
            }
            balances[item._id] = balance;
        });

        // 6. Calculate shortages
        const shortages = Object.entries(neededIngredients)
            .map(([ingId, data]) => {
                const current = balances[ingId] || 0;
                const deficit = data.qty - current;

                if (deficit > 0) {
                    return {
                        ingId,
                        name: data.name,
                        unit: data.unit,
                        needed: data.qty,
                        current,
                        deficit
                    };
                }
                return null;
            })
            .filter(Boolean);

        console.log(`🚀 [API:check-shortage] Calculated shortages: ${shortages.length}`, shortages);

        return NextResponse.json({
            success: true,
            shortages
        });

    } catch (error) {
        console.error('❌ [API:check-shortage] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
