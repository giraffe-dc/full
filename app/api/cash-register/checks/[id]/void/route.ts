import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST: Void/Cancel check (mark as voided, free table, update event, refund deposit if exists)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await clientPromise;
        const db = client.db("giraffe");

        const check = await db.collection("checks").findOne({ _id: new ObjectId(id) });
        if (!check) {
            return NextResponse.json({ error: "Check not found" }, { status: 404 });
        }

        // 1. Повернення депозиту якщо є
        if (check.deposit) {
            const deposit = check.deposit;

            const settings = await db.collection("settings").findOne({ type: "global" });
            const financeSettings = settings?.finance || {};
            const accountIdStr = deposit.method === 'cash'
                ? financeSettings.cashAccountId
                : financeSettings.cardAccountId;

            let accountId: ObjectId | null = null;
            if (accountIdStr) {
                try { accountId = new ObjectId(accountIdStr); } catch (e) { }
            }

            if (accountId) {
                await db.collection("transactions").insertOne({
                    date: new Date(),
                    amount: deposit.amount,
                    type: "expense",
                    category: "deposit_refund",
                    description: `Повернення передплати при ануляції чеку #${id.slice(-4)} (${check.tableName})`,
                    source: "cash-register",
                    referenceId: id,
                    paymentMethod: deposit.method,
                    status: "completed",
                    moneyAccountId: accountId.toString(),
                    shiftId: check.shiftId ? new ObjectId(check.shiftId) : null
                });

                await db.collection("money_accounts").updateOne(
                    { _id: accountId },
                    { $inc: { balance: -deposit.amount }, $set: { updatedAt: new Date() } }
                );
            }

            await db.collection("cash_transactions").insertOne({
                shiftId: check.shiftId ? new ObjectId(check.shiftId) : null,
                type: 'expense',
                category: 'deposit_refund',
                amount: deposit.amount,
                comment: `Повернення передплати при ануляції чеку #${id.slice(-4)} (${check.tableName})`,
                authorName: check.waiterName || 'System',
                checkId: id,
                paymentMethod: deposit.method,
                createdAt: new Date()
            });

            if (deposit.transactionId) {
                await db.collection("cash_transactions").updateOne(
                    { _id: new ObjectId(deposit.transactionId) },
                    {
                        $set: {
                            isDeleted: true,
                            deletedAt: new Date(),
                            deletedBy: check.waiterName || 'System',
                            deleteReason: 'void_deposit_refunded'
                        }
                    }
                );
            }
        }

        // 2. Позначити чек як анульований
        const voidHistory = {
            action: 'void',
            changedBy: check.waiterName || 'System',
            date: new Date().toISOString(),
            reason: 'Анульовано як помилковий'
        };

        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'voided',
                    voidedAt: new Date(),
                    updatedAt: new Date()
                },
                $push: { history: voidHistory }
            }
        );

        // 3. Оновити пов'язані події
        await db.collection("events").updateMany(
            { checkId: id },
            {
                $set: {
                    status: 'cancelled',
                    paymentStatus: 'unpaid',
                    paidAmount: 0,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        // 4. Звільнити стіл
        if (check.tableId) {
            await db.collection("tables").updateOne(
                { _id: new ObjectId(check.tableId) },
                { $set: { status: 'free', seats: 0 } }
            );
        }

        return NextResponse.json({ success: true, message: "Чек анульовано" });

    } catch (error) {
        console.error("Void check error:", error);
        return NextResponse.json({ error: "Failed to void check" }, { status: 500 });
    }
}
