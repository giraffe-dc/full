
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
                // Fetch default warehouse once for all items
                const defaultWarehouse = await db.collection("warehouses").findOne({}, { session });
                console.log("[CHECKOUT DEBUG] defaultWarehouse:", defaultWarehouse?._id, defaultWarehouse?.name);
                console.log("[CHECKOUT DEBUG] items count:", items.length);

                for (const item of items) {
                    console.log("[CHECKOUT DEBUG] item:", { productId: item.productId, serviceId: item.serviceId, serviceName: item.serviceName, quantity: item.quantity });
                    if (!item.productId) {
                        console.log("[CHECKOUT DEBUG] SKIP: no productId");
                        continue;
                    }

                    // The cash register menu merges products AND recipes into one list.
                    // So item.productId can be either a product._id or a recipe._id.
                    // Strategy: try products first, then fall back to recipes.

                    let product: any = null;
                    let recipe: any = null;

                    // 1. Try to find in products collection
                    try {
                        const query = ObjectId.isValid(item.productId)
                            ? { $or: [{ _id: new ObjectId(item.productId) }, { id: item.productId }] }
                            : { id: item.productId };
                        product = await db.collection("products").findOne(query, { session });
                    } catch (e) {
                        console.error(`Error finding product ${item.productId}`, e);
                    }

                    if (product) {
                        console.log("[CHECKOUT DEBUG] Found in products:", product._id, product.name);
                        // Look for a recipe with matching name
                        recipe = await db.collection("recipes").findOne(
                            { name: product.name, status: { $ne: 'inactive' } },
                            { session }
                        );
                        console.log("[CHECKOUT DEBUG] Matching recipe:", recipe?._id, recipe?.name, "ingredients:", recipe?.ingredients?.length);
                    } else {
                        // 2. Not in products — try recipes collection directly
                        try {
                            const query = ObjectId.isValid(item.productId)
                                ? { $or: [{ _id: new ObjectId(item.productId) }, { id: item.productId }] }
                                : { id: item.productId };
                            recipe = await db.collection("recipes").findOne(query, { session });
                        } catch (e) {
                            console.error(`Error finding recipe ${item.productId}`, e);
                        }

                        if (recipe) {
                            console.log("[CHECKOUT DEBUG] Found in recipes:", recipe._id, recipe.name, "ingredients:", recipe.ingredients?.length);
                        } else {
                            console.log("[CHECKOUT DEBUG] SKIP: not found in products or recipes");
                            continue;
                        }
                    }

                    // Now deduct stock
                    if (!defaultWarehouse) continue;

                    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
                        // Has recipe with ingredients → deduct each ingredient
                        for (const ing of recipe.ingredients) {
                            // Use gross (what's taken from stock) first, fall back to net
                            const qtyToDeduct = (ing.gross || ing.net) * item.quantity;
                            console.log("[CHECKOUT DEBUG] ingredient:", { id: ing.id, name: ing.name, net: ing.net, gross: ing.gross, unit: ing.unit, qtyToDeduct });

                            if (ing.id && qtyToDeduct > 0) {
                                await db.collection("stock_balances").updateOne(
                                    { warehouseId: defaultWarehouse._id.toString(), itemId: ing.id },
                                    { $inc: { quantity: -qtyToDeduct } },
                                    { upsert: true, session }
                                );

                                await db.collection("stock_movements").insertOne({
                                    type: "sale",
                                    date: new Date(),
                                    warehouseId: defaultWarehouse._id.toString(),
                                    items: [{
                                        itemId: ing.id,
                                        itemName: ing.name,
                                        qty: qtyToDeduct,
                                        unit: ing.unit || '',
                                        cost: 0
                                    }],
                                    description: `Продаж: Чек #${receipt.receiptNumber}`,
                                    referenceId: receiptId,
                                    isDeleted: false,
                                    createdAt: new Date()
                                }, { session });
                            }
                        }
                    } else {
                        // No recipe or empty ingredients → deduct the product/item itself
                        const itemName = product?.name || recipe?.name || item.serviceName;
                        const itemId = (product?._id || recipe?._id || item.productId).toString();
                        const unit = product?.unit || recipe?.unit || 'шт';
                        const qtyToDeduct = item.quantity;
                        console.log("[CHECKOUT DEBUG] Direct deduction:", { itemId, itemName, qty: qtyToDeduct, unit });

                        await db.collection("stock_balances").updateOne(
                            { warehouseId: defaultWarehouse._id.toString(), itemId: itemId },
                            { $inc: { quantity: -qtyToDeduct } },
                            { upsert: true, session }
                        );

                        await db.collection("stock_movements").insertOne({
                            type: "sale",
                            date: new Date(),
                            warehouseId: defaultWarehouse._id.toString(),
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