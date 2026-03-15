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
        recipes.forEach(r => recipeMap.set(r.name.toLowerCase(), r));

        // 3. Aggregate ingredient demand
        const ingredientDemand: Record<string, {
            name: string,
            unit: string,
            totalQty: number,
            confirmedQty: number,
            draftQty: number,
            events: { id: string, title: string, date: string, status: string, qty: number }[]
        }> = {};

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
                const recipe = recipeMap.get(service.name.toLowerCase());

                if (recipe && recipe.ingredients) {
                    for (const ing of recipe.ingredients) {
                        // Normalize ingredient ID to string
                        let ingId = '';
                        if (typeof ing.id === 'string') {
                            ingId = ing.id;
                        } else if (ing.id && typeof ing.id === 'object') {
                            // Handle ObjectId or object with _id
                            ingId = String(ing.id._id || ing.id);
                        }

                        if (!ingId) continue; // Skip if no valid ID

                        if (!ingredientDemand[ingId]) {
                            ingredientDemand[ingId] = {
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

                        ingredientDemand[ingId].totalQty += requiredQty;
                        if (event.status === 'confirmed' || event.status === 'in_progress') {
                            ingredientDemand[ingId].confirmedQty += requiredQty;
                        } else {
                            ingredientDemand[ingId].draftQty += requiredQty;
                        }

                        ingredientDemand[ingId].events.push({
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

        const stockMap = new Map();
        const stockNamesMap = new Map();
        const stockUnitsMap = new Map();

        stockItems.forEach(item => {
            // Sum quantities across all warehouses for each ingredient
            // Convert itemId to string for consistent comparison
            const itemId = String(item._id.itemId);
            const currentQty = stockMap.get(itemId) || 0;
            stockMap.set(itemId, currentQty + (item.quantity || 0));
            // Store name and unit for ingredients without demand
            if (!stockNamesMap.has(itemId)) {
                stockNamesMap.set(itemId, item.itemName);
                stockUnitsMap.set(itemId, item.unit);
            }
        });

        // 5. Merge stock items with demand data (include ALL ingredients with any balance or demand)
        const allIngredientIds = new Set([
            ...Object.keys(ingredientDemand),
            ...Array.from(stockMap.keys())
        ]);

        // 6. Build final report
        const forecast = Array.from(allIngredientIds).map((ingId) => {
            const demandData = ingredientDemand[ingId];
            const currentBalance = stockMap.get(ingId) || 0;

            // If no demand, use stock data for name/unit
            const name = demandData?.name || stockNamesMap.get(ingId) || 'Інгредієнт';
            const unit = demandData?.unit || stockUnitsMap.get(ingId) || 'од.';
            const totalQty = demandData?.totalQty || 0;
            const confirmedQty = demandData?.confirmedQty || 0;
            const draftQty = demandData?.draftQty || 0;
            const events = demandData?.events || [];

            const shortage = Math.max(0, totalQty - currentBalance);
            const confirmedShortage = Math.max(0, confirmedQty - currentBalance);

            return {
                ingId,
                name,
                unit,
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
