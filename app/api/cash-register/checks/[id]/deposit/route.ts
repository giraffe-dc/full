import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST /api/cash-register/checks/[id]/deposit — Внести передплату по чеку
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { amount, method, authorName, shiftId } = body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: "Сума передплати повинна бути більше 0" }, { status: 400 });
        }
        if (!method || !['cash', 'card'].includes(method)) {
            return NextResponse.json({ error: "Невірний спосіб оплати (cash або card)" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        let updatedCheck: any = null;

        try {
            await session.withTransaction(async () => {
                // 1. Отримати чек
                const check = await db.collection("checks").findOne(
                    { _id: new ObjectId(id) },
                    { session }
                );

                if (!check) throw new Error("Чек не знайдено");
                if (check.status !== 'open') throw new Error("Чек вже закрито");
                if (check.deposit) throw new Error("По цьому чеку вже є активна передплата. Спочатку поверніть поточну.");

                const remaining = check.total - (check.paidAmount || 0);
                if (amount > remaining + 0.01) {
                    throw new Error(`Сума передплати (${amount}) перевищує залишок до сплати (${remaining.toFixed(2)})`);
                }

                const depositId = new ObjectId().toString();
                const now = new Date().toISOString();

                const deposit = {
                    id: depositId,
                    amount,
                    method,
                    createdAt: now,
                    authorName: authorName || "Касир",
                    transactionId: null as string | null
                };

                const newPaidAmount = (check.paidAmount || 0) + amount;
                const newPaymentStatus = newPaidAmount >= check.total - 0.01 ? 'paid' : 'deposit';

                // 2. Оновити чек
                await db.collection("checks").updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            deposit,
                            paidAmount: newPaidAmount,
                            paymentStatus: newPaymentStatus,
                            updatedAt: now
                        },
                        $push: {
                            history: {
                                action: 'deposit_added',
                                changedBy: authorName || "Касир",
                                date: now,
                                newValue: { amount, method }
                            }
                        } as any
                    },
                    { session }
                );

                // 3. Знайти налаштування фінансів для рахунків
                const settings = await db.collection("settings").findOne({ type: "global" }, { session });
                const financeSettings = settings?.finance || {};
                const accountIdStr = method === 'cash'
                    ? financeSettings.cashAccountId
                    : financeSettings.cardAccountId;

                let accountId: ObjectId | null = null;
                if (accountIdStr) {
                    try { accountId = new ObjectId(accountIdStr); } catch (e) { }
                }

                // 4. Записати касову операцію як внесення коштів (deposit)
                // Це буде видно в касовому звіті як частина продажів
                const transaction = {
                    shiftId: shiftId ? new ObjectId(shiftId) : null,
                    type: 'income',
                    category: 'deposit',
                    amount,
                    comment: `Передплата по чеку #${id.slice(-4)} (${check.tableName})`,
                    authorName: authorName || "Касир",
                    checkId: id,
                    paymentMethod: method || 'cash',
                    createdAt: new Date()
                };

                const txResult = await db.collection("cash_transactions").insertOne(transaction, { session });
                const transactionId = txResult.insertedId.toString();

                // Оновити transactionId в deposit
                await db.collection("checks").updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { "deposit.transactionId": transactionId } },
                    { session }
                );

                // 5. Створити бухгалтерську транзакцію для передплати
                const accountingTransaction = {
                    date: new Date(),
                    amount: amount,
                    type: "income",
                    category: "deposit",
                    description: `Передплата по чеку #${id.slice(-4)} (${check.tableName})`,
                    source: "cash-register",
                    referenceId: id,
                    paymentMethod: method || 'cash',
                    status: "completed",
                    moneyAccountId: accountId ? accountId.toString() : null,
                    shiftId: shiftId ? new ObjectId(shiftId) : null  // Прив'язка до зміни
                };

                await db.collection("transactions").insertOne(accountingTransaction, { session });

                // 5b. Оновити баланс грошового рахунку (депозит збільшує баланс каси)
                if (accountId) {
                    await db.collection("money_accounts").updateOne(
                        { _id: accountId },
                        { $inc: { balance: amount }, $set: { updatedAt: new Date() } },
                        { session }
                    );
                }

                // 6. Синхронізувати з Event якщо є checkId
                await db.collection("events").updateMany(
                    { checkId: id },
                    {
                        $set: {
                            paidAmount: newPaidAmount,
                            paymentStatus: newPaymentStatus === 'paid' ? 'paid' : 'deposit',
                            updatedAt: now
                        }
                    },
                    { session }
                );

                updatedCheck = {
                    ...check,
                    id: check._id.toString(),
                    deposit: { ...deposit, transactionId },
                    paidAmount: newPaidAmount,
                    paymentStatus: newPaymentStatus
                };
            });
        } catch (e) {
            console.error("Deposit transaction aborted:", e);
            return NextResponse.json({ error: (e as Error).message }, { status: 400 });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({
            success: true,
            data: updatedCheck
        });

    } catch (error) {
        console.error("Deposit error:", error);
        return NextResponse.json({ error: "Помилка внесення передплати" }, { status: 500 });
    }
}

// DELETE /api/cash-register/checks/[id]/deposit — Повернути передплату
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const authorName = searchParams.get('authorName') || "Касир";

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        let updatedCheck: any = null;

        try {
            await session.withTransaction(async () => {
                // 1. Отримати чек
                const check = await db.collection("checks").findOne(
                    { _id: new ObjectId(id) },
                    { session }
                );

                if (!check) throw new Error("Чек не знайдено");
                if (!check.deposit) throw new Error("По цьому чеку немає активної передплати");

                const deposit = check.deposit;
                const refundAmount = deposit.amount;
                const now = new Date().toISOString();

                // 2. Оновити статус депозиту (зберігаємо інформацію для історії)
                await db.collection("checks").updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            'deposit.refunded': true,
                            'deposit.refundedAt': now,
                            'deposit.refundedBy': authorName,
                            paidAmount: 0,
                            paymentStatus: 'unpaid',
                            updatedAt: now
                        },
                        $push: {
                            history: {
                                action: 'deposit_refunded',
                                changedBy: authorName,
                                date: now,
                                previousValue: { amount: refundAmount, method: deposit.method }
                            }
                        } as any
                    },
                    { session }
                );

                // Не видаляємо оригінальний deposit — він лишається для коректного розрахунку
                // deposit_refund окремо віднімається від deposit в totalSalesCash

                // 4. Знайти налаштування фінансів та створити бухгалтерську транзакцію повернення
                const settings = await db.collection("settings").findOne({ type: "global" }, { session });
                const financeSettings = settings?.finance || {};
                const accountIdStr = deposit.method === 'cash'
                    ? financeSettings.cashAccountId
                    : financeSettings.cardAccountId;

                let accountId: ObjectId | null = null;
                if (accountIdStr) {
                    try { accountId = new ObjectId(accountIdStr); } catch (e) { }
                }

                // Створити бухгалтерську транзакцію повернення передплати
                if (accountId) {
                    const refundTransaction = {
                        date: new Date(),
                        amount: refundAmount,
                        type: "expense",
                        category: "deposit_refund",
                        description: `Повернення передплати по чеку #${id.slice(-4)} (${check.tableName})`,
                        source: "cash-register",
                        referenceId: id,
                        paymentMethod: deposit.method,
                        status: "completed",
                        moneyAccountId: accountId.toString(),
                        shiftId: check.shiftId ? new ObjectId(check.shiftId) : null
                    };
                    await db.collection("transactions").insertOne(refundTransaction, { session });

                    // Зменшити баланс грошового рахунку (повернення зменшує касу)
                    await db.collection("money_accounts").updateOne(
                        { _id: accountId },
                        { $inc: { balance: -refundAmount }, $set: { updatedAt: new Date() } },
                        { session }
                    );
                }

                // 5. Записати касову транзакцію повернення
                await db.collection("cash_transactions").insertOne({
                    shiftId: check.shiftId ? new ObjectId(check.shiftId) : null,
                    type: 'expense',
                    category: 'deposit_refund',
                    amount: refundAmount,
                    comment: `Повернення передплати по чеку #${id.slice(-4)} (${check.tableName})`,
                    authorName,
                    checkId: id,
                    paymentMethod: deposit.method,
                    createdAt: new Date()
                }, { session });

                // 6. Синхронізувати з Event
                await db.collection("events").updateMany(
                    { checkId: id },
                    {
                        $set: {
                            paidAmount: 0,
                            paymentStatus: 'unpaid',
                            updatedAt: now
                        }
                    },
                    { session }
                );

                updatedCheck = {
                    ...check,
                    id: check._id.toString(),
                    deposit: { ...check.deposit, refunded: true, refundedAt: now, refundedBy: authorName },
                    paidAmount: 0,
                    paymentStatus: 'unpaid'
                };
            });
        } catch (e) {
            console.error("Refund transaction aborted:", e);
            return NextResponse.json({ error: (e as Error).message }, { status: 400 });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({
            success: true,
            data: updatedCheck
        });

    } catch (error) {
        console.error("Refund error:", error);
        return NextResponse.json({ error: "Помилка повернення передплати" }, { status: 500 });
    }
}
