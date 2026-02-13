
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
                    createdAt: new Date(),
                    openedAt: originalCreatedAt ? new Date(originalCreatedAt) : new Date(),
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
                const allWarehouses = await db.collection("warehouses").find({ status: { $ne: 'inactive' } }, { session }).toArray();
                const ingredientsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('інгредієнти')) || allWarehouses[0];
                const productsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('товари')) || allWarehouses[0];

                console.log("[CHECKOUT DEBUG] warehouses:", allWarehouses.map(w => w.name));
                console.log("[CHECKOUT DEBUG] default warehouses - Ing:", ingredientsWarehouse?.name, "Prod:", productsWarehouse?.name);

                for (const item of items) {
                    if (!item.productId) continue;

                    let product: any = null;
                    let recipe: any = null;

                    // Try to find the actual item to get its proper _id
                    const query = ObjectId.isValid(item.productId)
                        ? { $or: [{ _id: new ObjectId(item.productId) }, { id: item.productId }] }
                        : { id: item.productId };

                    // Try products, then recipes, then ingredients
                    product = await db.collection("products").findOne(query, { session });
                    if (!product) {
                        recipe = await db.collection("recipes").findOne(query, { session });
                    }
                    if (!product && !recipe) {
                        product = await db.collection("ingredients").findOne(query, { session });
                    }

                    // If it's a product, check if it has a recipe by name
                    if (product && !recipe) {
                        recipe = await db.collection("recipes").findOne(
                            { name: product.name, status: { $ne: 'inactive' } },
                            { session }
                        );
                    }

                    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
                        // DEDUCT INGREDIENTS
                        for (const ing of recipe.ingredients) {
                            const qtyToDeduct = (ing.gross || ing.net) * item.quantity;
                            if (qtyToDeduct <= 0) continue;

                            // Resolve ingredient's REAL _id from database to avoid ID mismatch (id vs _id)
                            const realIng = await db.collection("ingredients").findOne(
                                { $or: [{ id: ing.id }, { name: ing.name }] },
                                { session }
                            );
                            const ingId = realIng ? realIng._id.toString() : ing.id;
                            const ingName = realIng ? realIng.name : ing.name;
                            const ingUnit = realIng ? realIng.unit : (ing.unit || 'г');

                            // Find best warehouse for this ingredient (prefer one where it already exists)
                            let targetWH = ingredientsWarehouse;
                            const existingBalance = await db.collection("stock_balances").findOne(
                                { itemId: ingId, quantity: { $gt: 0 } },
                                { session }
                            );
                            if (existingBalance) {
                                targetWH = allWarehouses.find(w => w._id.toString() === existingBalance.warehouseId) || ingredientsWarehouse;
                            }

                            await db.collection("stock_balances").updateOne(
                                { warehouseId: targetWH._id.toString(), itemId: ingId },
                                {
                                    $inc: { quantity: -qtyToDeduct },
                                    $set: {
                                        itemName: ingName,
                                        unit: ingUnit,
                                        updatedAt: new Date()
                                    }
                                },
                                { upsert: true, session }
                            );

                            await db.collection("stock_movements").insertOne({
                                type: "sale",
                                date: new Date(),
                                warehouseId: targetWH._id.toString(),
                                items: [{
                                    itemId: ingId,
                                    itemName: ingName,
                                    qty: qtyToDeduct,
                                    unit: ingUnit,
                                    cost: 0
                                }],
                                description: `Продаж: Чек #${receipt.receiptNumber}`,
                                referenceId: receiptId,
                                isDeleted: false,
                                createdAt: new Date()
                            }, { session });
                        }
                    } else if (product || recipe) {
                        // DEDUCT DIRECTLY (Product or Ingredient)
                        const targetItem = product || recipe;
                        const itemId = targetItem._id.toString();
                        const itemName = targetItem.name;
                        const unit = targetItem.unit || 'шт';
                        const qtyToDeduct = item.quantity;

                        // Find best warehouse for this product
                        let targetWH = productsWarehouse;
                        const existingBalance = await db.collection("stock_balances").findOne(
                            { itemId: itemId, quantity: { $gt: 0 } },
                            { session }
                        );
                        if (existingBalance) {
                            targetWH = allWarehouses.find(w => w._id.toString() === existingBalance.warehouseId) || productsWarehouse;
                        }

                        await db.collection("stock_balances").updateOne(
                            { warehouseId: targetWH._id.toString(), itemId: itemId },
                            {
                                $inc: { quantity: -qtyToDeduct },
                                $set: {
                                    itemName: itemName,
                                    unit: unit,
                                    updatedAt: new Date()
                                }
                            },
                            { upsert: true, session }
                        );

                        await db.collection("stock_movements").insertOne({
                            type: "sale",
                            date: new Date(),
                            warehouseId: targetWH._id.toString(),
                            items: [{
                                itemId: itemId,
                                itemName: itemName,
                                qty: qtyToDeduct,
                                unit: unit,
                                cost: 0
                            }],
                            description: `Продаж: Чек #${receipt.receiptNumber}`,
                            referenceId: receiptId,
                            isDeleted: false,
                            createdAt: new Date()
                        }, { session });
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