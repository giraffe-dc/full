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
                        const key = ing.id || ing.name; // Use ID as primary key, fallback to name

                        if (!ingredientDemand[key]) {
                            ingredientDemand[key] = {
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

                        ingredientDemand[key].totalQty += requiredQty;
                        if (event.status === 'confirmed' || event.status === 'in_progress') {
                            ingredientDemand[key].confirmedQty += requiredQty;
                        } else {
                            ingredientDemand[key].draftQty += requiredQty;
                        }

                        ingredientDemand[key].events.push({
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

        // 4. Get current stock balances
        // Simplified balance fetch (similar to the one in balances route but more direct)
        const stockItems = await db.collection("stock_movements").aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $toString: "$items.itemId" },
                    // Note: This is a simplified version. For production we should use the exact 
                    // same balance calculation logic as in the stock module.
                    movements: { $push: { type: "$type", date: "$date", qty: { $toDouble: "$items.qty" }, actualQty: { $toDouble: { $ifNull: ["$items.actualQty", "$items.qty"] } } } }
                }
            }
        ]).toArray();

        const stockMap = new Map();
        stockItems.forEach(item => {
            // Sort movements by date
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
            stockMap.set(item._id, balance);
        });

        // 5. Build final report
        const forecast = Object.entries(ingredientDemand).map(([ingId, data]) => {
            const currentBalance = stockMap.get(ingId) || 0;
            const shortage = Math.max(0, data.totalQty - currentBalance);
            const confirmedShortage = Math.max(0, data.confirmedQty - currentBalance);

            return {
                ingId,
                name: data.name,
                unit: data.unit,
                currentBalance,
                demand: {
                    total: data.totalQty,
                    confirmed: data.confirmedQty,
                    draft: data.draftQty
                },
                shortage: {
                    total: shortage,
                    confirmed: confirmedShortage
                },
                events: data.events.sort((a, b) => {
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
