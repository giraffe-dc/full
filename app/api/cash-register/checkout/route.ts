
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
            comment,
            // Передплата (deposit)
            paidAmount: bodyPaidAmount,
            deposit: bodyDeposit
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

        // Ensure we have a shiftId (find open shift if not provided)
        let activeShiftId = shiftId;
        let openShift: any = null;
        if (!activeShiftId) {
            openShift = await db.collection("cash_shifts").findOne({ status: "open" });
            if (openShift) {
                activeShiftId = openShift._id.toString();
            }
        } else if (shiftId) {
            openShift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(shiftId) });
        }

        try {
            await session.withTransaction(async () => {
                // Prepare history
                const history = Array.isArray(originalHistory) ? [...originalHistory] : [];
                
                // ========================================
                // ВИПРАВКА: Визначити реальний метод оплати
                const existingDepositAmount = bodyPaidAmount || 0;
                const depositMethod = bodyDeposit?.method;
                const remainingAmount = Math.max(0, total - existingDepositAmount);
                const isActuallyMixed = existingDepositAmount > 0 && paymentMethod !== 'mixed' && paymentMethod !== 'certificate' && depositMethod && depositMethod !== paymentMethod;

                let actualPaymentMethod: string;
                let actualPaymentDetails: any;

                if (remainingAmount === 0 && existingDepositAmount > 0) {
                    // Депозит повністю покриває чек — метод оплати = метод депозиту
                    actualPaymentMethod = depositMethod || 'cash';
                    actualPaymentDetails = {};
                    if (depositMethod === 'cash') actualPaymentDetails.cash = existingDepositAmount;
                    if (depositMethod === 'card') actualPaymentDetails.card = existingDepositAmount;
                } else {
                    actualPaymentMethod = isActuallyMixed ? 'mixed' : paymentMethod;

                    actualPaymentDetails = paymentDetails;
                    if (isActuallyMixed && bodyDeposit) {
                        // paymentDetails = лише залишок (deposit вже врахований окремо)
                        actualPaymentDetails = {};
                        if (paymentMethod === 'cash') actualPaymentDetails.cash = remainingAmount;
                        if (paymentMethod === 'card') actualPaymentDetails.card = remainingAmount;
                    } else if (existingDepositAmount > 0 && !isActuallyMixed) {
                        if (paymentMethod === 'mixed') {
                            actualPaymentDetails = paymentDetails;
                        } else {
                            actualPaymentDetails = {};
                            if (paymentMethod === 'cash') actualPaymentDetails.cash = remainingAmount;
                            if (paymentMethod === 'card') actualPaymentDetails.card = remainingAmount;
                        }
                    }
                }
                
                history.push({
                    action: 'update_payment',
                    changedBy: waiterName || 'System',
                    date: new Date().toISOString(),
                    previousValue: 'unpaid',
                    newValue: actualPaymentMethod,
                    paymentDetails: actualPaymentDetails,
                    depositAmount: existingDepositAmount > 0 ? existingDepositAmount : undefined
                });

                // 1. Create Receipt
                const receipt = {
                    receiptNumber: Date.now(), // Simple number generation for now
                    shiftId: activeShiftId ? new ObjectId(activeShiftId) : null, // Convert to ObjectId
                    customerId: customerId ? new ObjectId(customerId) : null,
                    waiter: waiterName,
                    waiterId: waiterId ? new ObjectId(waiterId) : null,
                    items: items,
                    subtotal,
                    tax,
                    total,
                    paymentMethod: actualPaymentMethod, // ✅ Використовуємо реальний метод
                    paymentDetails: actualPaymentDetails, // ✅ Використовуємо оновлені деталі
                    depositAmount: existingDepositAmount, // ✅ Зберігаємо суму передплати
                    depositMethod: depositMethod || null, // ✅ Зберігаємо метод депозиту (для reporting)
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

                // ========================================
                // ВИПРАВКА: Записати касову операцію
                // ========================================
                // Передплата вже записана як 'deposit' при deposit endpoint
                // Тут записуємо тільки залишок як 'sales'
                
                if (remainingAmount > 0) {
                    // Залишок після передплати
                    if (actualPaymentMethod === 'mixed' && (actualPaymentDetails || paymentDetails)) {
                        // Для змішаної оплати - розраховуємо тільки залишок по кожному методу
                        let cashAmount = 0;
                        let cardAmount = 0;

                        if (isActuallyMixed && bodyDeposit) {
                            // Передплата одним методом + залишок іншим методом
                            const depositMethod = bodyDeposit.method;
                            const remainderMethod = paymentMethod;

                            // Залишок йде тільки в remainderMethod
                            if (remainderMethod === 'cash') {
                                cashAmount = remainingAmount;
                                cardAmount = 0;
                            } else if (remainderMethod === 'card') {
                                cashAmount = 0;
                                cardAmount = remainingAmount;
                            }
                        } else {
                            // Звичайна змішана оплата без передплати
                            cashAmount = actualPaymentDetails?.cash || paymentDetails?.cash || 0;
                            cardAmount = actualPaymentDetails?.card || paymentDetails?.card || 0;
                        }

                        if (cashAmount > 0) {
                            await db.collection("cash_transactions").insertOne({
                                shiftId: openShift?._id || null,
                                type: 'income',
                                category: 'sales',
                                amount: cashAmount,
                                paymentMethod: 'cash',
                                comment: `Залишок по чеку #${receipt.receiptNumber}`,
                                checkId: body.checkId,
                                createdAt: new Date()
                            }, { session });
                        }
                        if (cardAmount > 0) {
                            await db.collection("cash_transactions").insertOne({
                                shiftId: openShift?._id || null,
                                type: 'income',
                                category: 'sales',
                                amount: cardAmount,
                                paymentMethod: 'card',
                                comment: `Залишок по чеку #${receipt.receiptNumber}`,
                                checkId: body.checkId,
                                createdAt: new Date()
                            }, { session });
                        }
                    } else if (actualPaymentMethod !== 'certificate') {
                        // Для готівки або картки - одна касова операція (залишок)
                        await db.collection("cash_transactions").insertOne({
                            shiftId: openShift?._id || null,
                            type: 'income',
                            category: 'sales',
                            amount: remainingAmount,
                            paymentMethod: actualPaymentMethod,
                            comment: `Залишок по чеку #${receipt.receiptNumber}`,
                            checkId: body.checkId,
                            createdAt: new Date()
                        }, { session });
                    }
                } else if (existingDepositAmount === 0) {
                    // БЕЗ передплати - весь платіж як 'sales'
                    if (actualPaymentMethod === 'mixed' && (actualPaymentDetails || paymentDetails)) {
                        const cashAmount = actualPaymentDetails?.cash || paymentDetails?.cash || 0;
                        const cardAmount = actualPaymentDetails?.card || paymentDetails?.card || 0;
                        
                        if (cashAmount > 0) {
                            await db.collection("cash_transactions").insertOne({
                                shiftId: openShift?._id || null,
                                type: 'income',
                                category: 'sales',
                                amount: cashAmount,
                                paymentMethod: 'cash',
                                comment: `Продаж по чеку #${receipt.receiptNumber}`,
                                checkId: body.checkId,
                                createdAt: new Date()
                            }, { session });
                        }
                        if (cardAmount > 0) {
                            await db.collection("cash_transactions").insertOne({
                                shiftId: openShift?._id || null,
                                type: 'income',
                                category: 'sales',
                                amount: cardAmount,
                                paymentMethod: 'card',
                                comment: `Продаж по чеку #${receipt.receiptNumber}`,
                                checkId: body.checkId,
                                createdAt: new Date()
                            }, { session });
                        }
                    } else if (actualPaymentMethod !== 'certificate') {
                        await db.collection("cash_transactions").insertOne({
                            shiftId: openShift?._id || null,
                            type: 'income',
                            category: 'sales',
                            amount: total,
                            paymentMethod: actualPaymentMethod,
                            comment: `Продаж по чеку #${receipt.receiptNumber}`,
                            checkId: body.checkId,
                            createdAt: new Date()
                        }, { session });
                    }
                }

                    // Process Certificate logic
                    if ((actualPaymentMethod === 'certificate' || actualPaymentMethod === 'mixed') && actualPaymentDetails?.certificateId) {
                        const certId = actualPaymentDetails.certificateId;
                        const certAmount = actualPaymentDetails.certificate || (actualPaymentMethod === 'certificate' ? total : 0);

                        const certificate = await db.collection("certificates").findOne({ _id: new ObjectId(certId) }, { session });
                        if (!certificate) throw new Error("Certificate not found");
                        if (certificate.status !== 'active') throw new Error("Certificate is not active");
                        if (certificate.expiresAt && new Date(certificate.expiresAt) < new Date()) throw new Error("Certificate expired");

                        // Fetch Global Settings
                        const certSettings = await db.collection('settings').findOne({ type: 'certificates' }, { session });

                        // Fetch Certificate Type settings
                        let typeSettings: any = null;
                        if (certificate.typeId) {
                            const typeDef = await db.collection('certificate_types').findOne({ _id: new ObjectId(certificate.typeId) }, { session });
                            if (typeDef) typeSettings = typeDef.settings;
                        }

                        // Enforce canBeMixed restriction
                        if (paymentMethod === 'mixed' && typeSettings?.canBeMixed === false) {
                            throw new Error(`This type of certificate ("${certificate.code}") does not allow mixed payments.`);
                        }

                        // Check if the service is present in the check for service/visits certificates
                        let certCoverage = 0;
                        if (certificate.type === 'service' || (certificate.type === 'visits' && certificate.serviceId)) {
                            const serviceItem = items.find((i: any) => i.productId === certificate.serviceId);
                            if (!serviceItem) throw new Error(`Certificate requires service "${certificate.serviceName}" which is not in the check`);
                            certCoverage = serviceItem.price;
                        } else if (certificate.type === 'amount') {
                            // Category filtering
                            const allowedCats = (certificate.applicableCategories && certificate.applicableCategories.length > 0)
                                ? certificate.applicableCategories
                                : (certSettings?.allowedCategories || []);
                            
                            let applicableTotal = total;
                            if (allowedCats.length > 0) {
                                applicableTotal = items
                                    .filter((i: any) => allowedCats.includes(i.category))
                                    .reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0);
                            }

                            certCoverage = Math.min(certificate.balance || 0, applicableTotal);

                            // Per visit limit
                            if (certificate.maxCoveragePerVisit && certificate.maxCoveragePerVisit > 0) {
                                certCoverage = Math.min(certCoverage, certificate.maxCoveragePerVisit);
                            }
                        } else {
                            certCoverage = total; // generic visits cover the check
                        }

                        if (certAmount > certCoverage + 0.01) {
                            throw new Error(`The certificate coverage limit is ${certCoverage.toFixed(2)}, but attempted to spend ${certAmount.toFixed(2)}.`);
                        }
                    
                    if (certificate.type === 'amount') {
                        if ((certificate.balance || 0) < certAmount && certAmount > 0) throw new Error("Insufficient certificate balance");
                        
                        const newBalance = (certificate.balance || 0) - certAmount;
                        const newStatus = newBalance <= 0.01 ? 'used' : 'active'; // 0.01 for floating point safety
                        
                        await db.collection("certificates").updateOne(
                            { _id: new ObjectId(certId) },
                            { $set: { balance: newBalance, status: newStatus } },
                            { session }
                        );
                    } else if (certificate.type === 'visits') {
                        const newVisits = (certificate.visitsUsed || 0) + 1;
                        const newStatus = newVisits >= (certificate.visitsTotal || 1) ? 'used' : 'active';
                        
                        await db.collection("certificates").updateOne(
                            { _id: new ObjectId(certId) },
                            { $set: { visitsUsed: newVisits, status: newStatus } },
                            { session }
                        );
                    } else if (certificate.type === 'service') {
                        await db.collection("certificates").updateOne(
                            { _id: new ObjectId(certId) },
                            { $set: { status: 'used' } },
                            { session }
                        );
                    }
                }

                // Match Accounts based on Settings
                const settings = await db.collection("settings").findOne({ type: "global" }, { session });
                const financeSettings = settings?.finance || {};

                // Unified transaction processing helper
                const processPaymentPart = async (method: string, amount: number, accountIdStr: string | null, transactionCategory: string = "sales") => {
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
                        category: transactionCategory, // ✅ Дозволяємо змінювати категорію
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

                // ========================================
                // ВИПРАВКА: Обробити платежі окремо
                // ========================================
                // Передплата вже записана як 'deposit' при deposit endpoint
                // Тут записуємо тільки залишок
                
                if (remainingAmount > 0) {
                    // Залишок після передплати
                    if (actualPaymentMethod === 'mixed' && (actualPaymentDetails || paymentDetails)) {
                        // Для змішаної оплати - розраховуємо тільки залишок по кожному методу
                        let cashAmount = 0;
                        let cardAmount = 0;

                        if (isActuallyMixed && bodyDeposit) {
                            // Передплата одним методом + залишок іншим методом
                            const depositMethod = bodyDeposit.method;
                            const remainderMethod = paymentMethod;

                            // Залишок йде тільки в remainderMethod
                            if (remainderMethod === 'cash') {
                                cashAmount = remainingAmount;
                                cardAmount = 0;
                            } else if (remainderMethod === 'card') {
                                cashAmount = 0;
                                cardAmount = remainingAmount;
                            }
                        } else {
                            // Звичайна змішана оплата без передплати
                            cashAmount = actualPaymentDetails?.cash || paymentDetails?.cash || 0;
                            cardAmount = actualPaymentDetails?.card || paymentDetails?.card || 0;
                        }

                        await processPaymentPart('cash', cashAmount, financeSettings.cashAccountId, 'sales');
                        await processPaymentPart('card', cardAmount, financeSettings.cardAccountId, 'sales');
                    } else if (actualPaymentMethod !== 'certificate') {
                        const accId = actualPaymentMethod === 'cash' ? financeSettings.cashAccountId : financeSettings.cardAccountId;
                        await processPaymentPart(actualPaymentMethod, remainingAmount, accId, 'sales');
                    }
                } else if (existingDepositAmount === 0) {
                    // БЕЗ передплати - весь платіж записуємо як 'sales'
                    if (actualPaymentMethod === 'mixed' && (actualPaymentDetails || paymentDetails)) {
                        await processPaymentPart('cash', (actualPaymentDetails?.cash || paymentDetails?.cash || 0), financeSettings.cashAccountId, 'sales');
                        await processPaymentPart('card', (actualPaymentDetails?.card || paymentDetails?.card || 0), financeSettings.cardAccountId, 'sales');
                    } else if (actualPaymentMethod !== 'certificate') {
                        const accId = actualPaymentMethod === 'cash' ? financeSettings.cashAccountId : financeSettings.cardAccountId;
                        await processPaymentPart(actualPaymentMethod, total, accId, 'sales');
                    }
                }

                // 3. Stock Deduction (Complex: Product -> Recipe -> Ingredients)
                const allWarehouses = await db.collection("warehouses").find({ status: { $ne: 'inactive' } }, { session }).toArray();
                const ingredientsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('інгредієнти')) || allWarehouses[0];
                const productsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('товари')) || allWarehouses[0];

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


                // 4. Create Receipt with checkId link and Delete Check
                if (body.checkId) {
                    // Get original check for additional data
                    const originalCheck = await db.collection("checks").findOne({
                        _id: new ObjectId(body.checkId)
                    });

                    if (originalCheck) {
                        // Зберегти інформацію про депозит у квитанції
                        const depositInfo = originalCheck.deposit || bodyDeposit || null;
                        const totalPaidDeposit = originalCheck.paidAmount || bodyPaidAmount || 0;

                        // Update receipt with checkId and additional data from check
                        await db.collection("receipts").updateOne(
                            { _id: receiptId },
                            {
                                $set: {
                                    checkId: body.checkId,  // Link to original check
                                    tableId: originalCheck.tableId,
                                    tableName: originalCheck.tableName,
                                    departmentId: originalCheck.departmentId,
                                    guestsCount: originalCheck.guestsCount,
                                    waiterId: originalCheck.waiterId,
                                    waiterName: originalCheck.waiterName,
                                    comment: originalCheck.comment,
                                    notes: originalCheck.notes,
                                    history: originalCheck.history || [],
                                    // Інформація про депозит
                                    depositAmount: totalPaidDeposit,
                                    depositInfo: depositInfo,
                                    depositMethod: depositInfo?.method || null
                                }
                            },
                            { session }
                        );

                        // --- Update linked Event status ---
                        await db.collection("events").updateMany(
                            { checkId: body.checkId },
                            {
                                $set: {
                                    status: 'completed',
                                    paymentStatus: 'paid',
                                    paidAmount: total,
                                    updatedAt: new Date().toISOString()
                                }
                            },
                            { session }
                        );

                        // --- Update linked Visit status ---
                        await db.collection("visits").updateMany(
                            { checkId: body.checkId },
                            {
                                $set: {
                                    paymentStatus: 'paid',
                                    updatedAt: new Date().toISOString()
                                }
                            },
                            { session }
                        );

                        // Delete from checks
                        await db.collection("checks").deleteOne({
                            _id: new ObjectId(body.checkId)
                        }, { session });

                        // Free the table
                        if (body.tableId) {
                            await db.collection("tables").updateOne(
                                { _id: new ObjectId(body.tableId) },
                                { $set: { status: 'free', seats: 4 } },
                                { session }
                            );
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