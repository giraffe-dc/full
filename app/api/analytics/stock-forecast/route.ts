import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Event } from '@/types/events';
import { MenuRecipe } from '@/types/accounting';

export async function GET(request: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');

        const searchParams = request.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '7');

        // 1. Get upcoming events (Draft & Confirmed)
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Statuses to include in analysis
        const targetStatuses = ['confirmed', 'draft', 'in_progress'];

        const events = await db.collection<Event>('events').find({
            date: { $gte: today, $lte: endDateStr },
            status: { $in: targetStatuses as any }
        }).toArray();

        // 2. Get all packages and recipes for mapping
        const packages = await db.collection('event_packages').find().toArray();
        const recipes = await db.collection<MenuRecipe>('recipes').find().toArray();

        // Map recipes by name (lowercase) for flexible lookup
        const recipeMap = new Map();
        recipes.forEach(r => recipeMap.set(r.name.toLowerCase().trim(), r));

        // 3. Aggregate ingredient demand (Group by normalized name)
        const ingredientDemand: Record<string, {
            name: string,
            unit: string,
            totalQty: number,
            confirmedQty: number,
            draftQty: number,
            events: { id: string, title: string, date: string, status: string, qty: number }[]
        }> = {};

        // Track the best available ID for a given normalized name
        const nameToRealId = new Map<string, string>();

        for (const event of events) {
            const eventServices = [...(event.customServices || [])];

            // If event has a package, add its included services to calculation
            if (event.packageId) {
                // Support both string ID and ObjectId
                const pkg = packages.find(p => p.id === event.packageId || p._id?.toString() === event.packageId);
                if (pkg && pkg.includedServices) {
                    eventServices.push(...pkg.includedServices);
                }
            }

            for (const service of eventServices) {
                // Try to find recipe by name
                const serviceNameNorm = service.name.toLowerCase().trim();
                const recipe = recipeMap.get(serviceNameNorm);

                if (recipe && recipe.ingredients) {
                    for (const ing of recipe.ingredients) {
                        if (!ing.name) continue; // Skip if no valid name
                        
                        const normName = ing.name.toLowerCase().trim();

                        // Normalize ingredient ID to string tracking (from recipe)
                        let ingId = '';
                        if (typeof ing.id === 'string') {
                            ingId = ing.id;
                        } else if (ing.id && typeof ing.id === 'object') {
                            ingId = String((ing.id as any)._id || ing.id);
                        }
                        
                        // Update best known ID (recipe IDs are often temporary 'ing-1725...', so keep them as fallback if we have nothing else)
                        if (ingId && !nameToRealId.has(normName) && !ingId.startsWith('ing-')) {
                            nameToRealId.set(normName, ingId);
                        } else if (ingId && !nameToRealId.has(normName)) {
                            nameToRealId.set(normName, ingId);
                        }

                        if (!ingredientDemand[normName]) {
                            ingredientDemand[normName] = {
                                name: ing.name,
                                unit: ing.unit,
                                totalQty: 0,
                                confirmedQty: 0,
                                draftQty: 0,
                                events: []
                            };
                        }

                        // Calculate required quantity for this service
                        // Usually Recipe quantity is per 1 unit/portion of the recipe results
                        // Service quantity is how many portions were ordered
                        const requiredQty = (ing.quantity || ing.gross || 0) * (service.quantity || 1);

                        ingredientDemand[normName].totalQty += requiredQty;
                        if (event.status === 'confirmed' || event.status === 'in_progress') {
                            ingredientDemand[normName].confirmedQty += requiredQty;
                        } else {
                            ingredientDemand[normName].draftQty += requiredQty;
                        }

                        ingredientDemand[normName].events.push({
                            id: event.id,
                            title: event.title,
                            date: event.date,
                            status: event.status,
                            qty: requiredQty
                        });
                    }
                }
            }
        }

        // 4. Get current stock balances (using same logic as balances route)
        const stockItems = await db.collection("stock_movements").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            {
                $project: {
                    type: 1,
                    date: 1,
                    warehouseId: { $toString: "$warehouseId" },
                    itemId: { $toString: "$items.itemId" },
                    itemName: "$items.itemName",
                    unit: "$items.unit",
                    qty: { $toDouble: "$items.qty" },
                    actualQty: { $toDouble: { $ifNull: ["$items.actualQty", "$items.qty"] } },
                    cost: { $toDouble: { $ifNull: ["$items.lastCost", { $ifNull: ["$items.cost", 0] }] } }
                }
            },
            {
                $project: {
                    movements: [
                        {
                            warehouseId: "$warehouseId",
                            itemId: "$itemId",
                            itemName: "$itemName",
                            unit: "$unit",
                            date: "$date",
                            cost: "$cost",
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
                        }
                    ]
                }
            },
            { $unwind: "$movements" },
            { $match: { "movements.warehouseId": { $ne: null } } },
            { $sort: { "movements.date": 1 } },
            {
                $group: {
                    _id: {
                        warehouseId: "$movements.warehouseId",
                        itemId: "$movements.itemId"
                    },
                    itemName: { $first: "$movements.itemName" },
                    unit: { $first: "$movements.unit" },
                    lastCost: { $last: "$movements.cost" },
                    history: { $push: "$movements" }
                }
            },
            {
                $addFields: {
                    quantity: {
                        $reduce: {
                            input: "$history",
                            initialValue: 0,
                            in: {
                                $cond: [
                                    { $eq: ["$$this.type", "inventory"] },
                                    "$$this.actualQty",
                                    { $add: ["$$value", "$$this.change"] }
                                ]
                            }
                        }
                    }
                }
            }
        ]).toArray();

        const stockMap = new Map<string, number>();
        const stockNamesMap = new Map<string, string>();
        const stockUnitsMap = new Map<string, string>();

        stockItems.forEach(item => {
            // Group and merge stock balances by normalized item name
            if (!item.itemName) return;
            
            const normName = item.itemName.toLowerCase().trim();
            const itemId = String(item._id.itemId);
            
            // Overwrite anything stored previously with this actual DB ID from stock
            if (itemId && itemId !== "undefined") {
                 nameToRealId.set(normName, itemId);
            }

            const currentQty = stockMap.get(normName) || 0;
            stockMap.set(normName, currentQty + (item.quantity || 0));
            
            // Store original name and unit for ingredients without demand
            if (!stockNamesMap.has(normName)) {
                stockNamesMap.set(normName, item.itemName);
                stockUnitsMap.set(normName, item.unit);
            }
        });

        // 5. Merge stock items with demand data (include ALL ingredients with any balance or demand by normalized name)
        const allIngredientNames = new Set([
            ...Object.keys(ingredientDemand),
            ...Array.from(stockMap.keys())
        ]);

        // 6. Build final report
        const forecastRaw = Array.from(allIngredientNames).map((normName) => {
            const demandData = ingredientDemand[normName];
            const currentBalance = stockMap.get(normName) || 0;

            // Resolve proper IDs and fallback original names
            const ingId = nameToRealId.get(normName) || normName; 
            const name = demandData?.name || stockNamesMap.get(normName) || 'Інгредієнт';
            
            const demandUnit = (demandData?.unit || '').toLowerCase();
            const stockUnit = (stockUnitsMap.get(normName) || '').toLowerCase();
            
            let totalQty = demandData?.totalQty || 0;
            let confirmedQty = demandData?.confirmedQty || 0;
            let draftQty = demandData?.draftQty || 0;
            const events = demandData?.events || [];

            // Standardize units if there is a mismatch (e.g., Recipe uses 'г' but Stock uses 'кг')
            let finalUnit = stockUnit || demandUnit || 'од.';
            
            if (demandUnit === 'г' && stockUnit === 'кг') {
                totalQty = totalQty / 1000;
                confirmedQty = confirmedQty / 1000;
                draftQty = draftQty / 1000;
                events.forEach(e => { e.qty = e.qty / 1000; });
            } else if (demandUnit === 'кг' && stockUnit === 'г') {
                totalQty = totalQty * 1000;
                confirmedQty = confirmedQty * 1000;
                draftQty = draftQty * 1000;
                events.forEach(e => { e.qty = e.qty * 1000; });
            } else if (!stockUnit && demandUnit) {
               finalUnit = demandUnit;
            }

            const shortage = Math.max(0, totalQty - currentBalance);
            const confirmedShortage = Math.max(0, confirmedQty - currentBalance);

            return {
                ingId,
                name,
                unit: finalUnit,
                currentBalance,
                demand: {
                    total: totalQty,
                    confirmed: confirmedQty,
                    draft: draftQty
                },
                shortage: {
                    total: shortage,
                    confirmed: confirmedShortage
                },
                events: events.sort((a, b) => {
                    const da = a.date ? new Date(a.date).getTime() : 0;
                    const db = b.date ? new Date(b.date).getTime() : 0;
                    return da - db;
                })
            };
        });

        // Фільтруємо: залишаємо тільки ті, де є потреба > 0
        const forecast = forecastRaw.filter(item => item.demand.total > 0);

        // Sort by largest confirmed shortage first, then total shortage
        forecast.sort((a, b) => (b.shortage.confirmed - a.shortage.confirmed) || (b.shortage.total - a.shortage.total));

        return NextResponse.json({
            success: true,
            data: forecast,
            meta: {
                eventsCount: events.length,
                daysAnalyzed: days
            }
        });

    } catch (error) {
        console.error('Forecast API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to calculate inventory forecast'
        }, { status: 500 });
    }
}
