
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            items,
            paymentMethod,
            paymentDetails,
            total,
            subtotal,
            tax,
            customerId,
            shiftId,
            waiterName,
            waiterId,
            // New fields to preserve from check
            createdAt: originalCreatedAt,
            history: originalHistory,
            tableName,
            customerName,
            guestsCount,
            departmentId,
            comment
        } = body;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        let receiptId: ObjectId | undefined;
        let createdReceipt: any;

        try {
            await session.withTransaction(async () => {
                // Prepare history
                const history = Array.isArray(originalHistory) ? [...originalHistory] : [];
                history.push({
                    action: 'update_payment',
                    changedBy: waiterName || 'System',
                    date: new Date().toISOString(),
                    previousValue: 'unpaid',
                    newValue: paymentMethod,
                    paymentDetails
                });

                // 1. Create Receipt
                const receipt = {
                    receiptNumber: Date.now(), // Simple number generation for now
                    shiftId: shiftId ? new ObjectId(shiftId) : null, // Convert to ObjectId
                    customerId: customerId ? new ObjectId(customerId) : null,
                    waiter: waiterName,
                    waiterId: waiterId ? new ObjectId(waiterId) : null,
                    items: items,
                    subtotal,
                    tax,
                    total,
                    paymentMethod,
                    paymentDetails, // Added details
                    createdAt: originalCreatedAt ? new Date(originalCreatedAt) : new Date(),
                    updatedAt: new Date(),
                    // Preserved metadata
                    history,
                    tableName,
                    customerName,
                    guestsCount: guestsCount || 0,
                    departmentId: departmentId ? new ObjectId(departmentId) : null,
                    comment
                };

                const receiptResult = await db.collection("receipts").insertOne(receipt, { session });
                receiptId = receiptResult.insertedId;
                createdReceipt = receipt;

                // Match Accounts based on Settings
                const settings = await db.collection("settings").findOne({ type: "global" }, { session });
                const financeSettings = settings?.finance || {};

                // Unified transaction processing helper
                const processPaymentPart = async (method: string, amount: number, accountIdStr: string | null) => {
                    if (amount <= 0) return;

                    let accountId: ObjectId | null = null;
                    if (accountIdStr) {
                        try { accountId = new ObjectId(accountIdStr); } catch (e) { }
                    }

                    // Create Accounting Transaction
                    const transaction = {
                        date: new Date(),
                        amount: amount,
                        type: "income",
                        category: "sales",
                        description: `Чек #${receipt.receiptNumber} (${method})`,
                        source: "cash-register",
                        referenceId: receiptId,
                        paymentMethod: method,
                        status: "completed",
                        moneyAccountId: accountId ? accountId.toString() : null
                    };
                    await db.collection("transactions").insertOne(transaction, { session });

                    // Update Money Account Balance
                    if (accountId) {
                        await db.collection("money_accounts").updateOne(
                            { _id: accountId },
                            {
                                $inc: { balance: amount },
                                $set: { updatedAt: new Date() }
                            },
                            { session }
                        );
                    }
                };

                if (paymentMethod === 'mixed' && paymentDetails) {
                    await processPaymentPart('cash', paymentDetails.cash || 0, financeSettings.cashAccountId);
                    await processPaymentPart('card', paymentDetails.card || 0, financeSettings.cardAccountId);
                } else {
                    const accId = paymentMethod === 'cash' ? financeSettings.cashAccountId : financeSettings.cardAccountId;
                    await processPaymentPart(paymentMethod, total, accId);
                }

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
                            // Assuming default warehouse for now
                            const defaultWarehouse = await db.collection("warehouses").findOne({}, { session });

                            if (defaultWarehouse && ing.id) {
                                await db.collection("stock_balances").updateOne(
                                    { warehouseId: defaultWarehouse._id.toString(), itemId: ing.id },
                                    { $inc: { quantity: -qtyToDeduct } },
                                    { upsert: true, session }
                                );

                                // Also log a movement for traceability
                                await db.collection("stock_movements").insertOne({
                                    type: "sale", // Changed from 'writeoff' to 'sale'
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

                // 4. Delete Open Check and Free Table
                if (body.checkId) {
                    await db.collection("checks").deleteOne({ _id: new ObjectId(body.checkId) }, { session });

                    // Optional: Update table status to 'free' immediately?
                    // Actually, if we delete the check, the table logic in 'checks/route.ts' (DELETE) handled it.
                    // But here we are just deleting the document. We should also update the table manually.
                    if (body.tableId) {
                        await db.collection("tables").updateOne(
                            { _id: new ObjectId(body.tableId) },
                            { $set: { status: 'free', seats: 4 } }, // Resetting seats to default or 0? 4 is a safe default for now
                            { session }
                        );
                    }
                }
            });
        } catch (e) {
            console.error("Transaction aborted:", e);
            return NextResponse.json({ error: "Transaction failed: " + (e as Error).message }, { status: 500 });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({
            success: true,
            data: {
                ...createdReceipt,
                id: receiptId?.toString(),
                _id: undefined, // Remove MongoDB _id
                shiftId: createdReceipt.shiftId?.toString(),
                customerId: createdReceipt.customerId?.toString(),
                waiterId: createdReceipt.waiterId?.toString(),
                departmentId: createdReceipt.departmentId?.toString()
            }
        });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json({ error: "Checkout failed: " + (error as Error).message }, { status: 500 });
    }
}