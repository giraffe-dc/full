
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items, paymentMethod, total, subtotal, tax, customerId, shiftId } = body;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        let receiptId;

        try {
            await session.withTransaction(async () => {
                // 1. Create Receipt
                const receipt = {
                    receiptNumber: Date.now(), // Simple number generation for now
                    shiftId: shiftId ? new ObjectId(shiftId) : null, // Convert to ObjectId
                    customerId: customerId ? new ObjectId(customerId) : null,
                    items: items,
                    subtotal,
                    tax,
                    total,
                    paymentMethod,
                    createdAt: new Date(),
                };

                const receiptResult = await db.collection("receipts").insertOne(receipt, { session });
                receiptId = receiptResult.insertedId;

                // 2. Create Accounting Transaction (Revenue)
                const transaction = {
                    date: new Date(),
                    amount: total,
                    type: "income",
                    category: "sales",
                    description: `Чек #${receipt.receiptNumber}`,
                    source: "cash-register",
                    referenceId: receiptId,
                    paymentMethod: paymentMethod,
                    status: "completed"
                };
                await db.collection("transactions").insertOne(transaction, { session });

                // 3. Stock Deduction (Complex: Product -> Recipe -> Ingredients)
                // Optimization: Fetch all necessary data first to avoid N+1 queries ideally, 
                // but for now, we'll loop sequentially for simplicity and safety within transaction.

                for (const item of items) {
                    if (!item.productId) continue;

                    // Safe Product Lookup
                    let product;
                    try {
                        const query = ObjectId.isValid(item.productId)
                            ? { _id: new ObjectId(item.productId) }
                            : { id: item.productId };

                        // Also check if we can match by _id if productId is a string but technically an ObjectId
                        // It's safer to use $or if unsure
                        product = await db.collection("products").findOne(
                            {
                                $or: [
                                    ...(ObjectId.isValid(item.productId) ? [{ _id: new ObjectId(item.productId) }] : []),
                                    { id: item.productId }
                                ]
                            },
                            { session }
                        );
                    } catch (e) {
                        console.error(`Error finding product ${item.productId}`, e);
                        continue;
                    }

                    if (!product) continue;

                    // Find valid recipe linked to this product (using product._id)
                    const recipe = await db.collection("menu_recipes").findOne({ productId: product._id }, { session });

                    if (recipe && recipe.ingredients) {
                        for (const ing of recipe.ingredients) {
                            // Calculate quantity to deduct:
                            // Recipe defines quantity for 1 unit of product.
                            // Total deduction = ing.netQuantity * item.quantity

                            const qtyToDeduct = (ing.net || ing.gross) * item.quantity;

                            // Deduct from Stock Balances
                            // We need to know WHICH warehouse. Defaulting to a "Kitchen" or "Bar" would be good.
                            // For MVP, lets assume a default warehouse or find one.
                            // TODO: Pass warehouseId from frontend or settings.
                            // Using a wildcard logic: update ANY warehouse that has this item? No, that's dangerous.
                            // Let's assume a default warehouse ID for now or skip if not found.
                            // Better approach: Since we don't have warehouse selection in POS yet, 
                            // we will query for a warehouse that has this ingredient and deduct from it.
                            // Or better, just use a 'default' warehouse concept.

                            // Let's try to find a warehouseId from the item/ingredient mapping if possible
                            // or just use the first warehouse found with positive balance?
                            // Safe MVP: Just Log warning if no warehouse determined.

                            // Implementation: Decrement from a specific warehouse (e.g., Main Warehouse)
                            // You might need to fetch a default warehouse ID here.
                            const defaultWarehouse = await db.collection("warehouses").findOne({}, { session });

                            if (defaultWarehouse && ing.id) {
                                await db.collection("stock_balances").updateOne(
                                    { warehouseId: defaultWarehouse._id.toString(), itemId: ing.id },
                                    { $inc: { quantity: -qtyToDeduct } },
                                    { upsert: true, session }
                                );

                                // Also log a movement for traceability
                                await db.collection("stock_movements").insertOne({
                                    type: "writeoff", // or 'sale'
                                    date: new Date(),
                                    warehouseId: defaultWarehouse._id.toString(),
                                    items: [{
                                        itemId: ing.id,
                                        itemName: ing.name,
                                        quantity: qtyToDeduct,
                                        cost: 0 // We'd need to fetch cost to be accurate, setting 0 for now
                                    }],
                                    description: `Продаж: Check #${receipt.receiptNumber}`,
                                    referenceId: receiptId
                                }, { session });
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Transaction aborted:", e);
            return NextResponse.json({ error: "Transaction failed: " + (e as Error).message }, { status: 500 });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({ success: true, receiptId });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json({ error: "Checkout failed: " + (error as Error).message }, { status: 500 });
    }
}