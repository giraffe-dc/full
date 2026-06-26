import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET: Get single check by ID (searches in checks first, then receipts)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Attempt 1: Search in checks (if not deleted yet)
        let check = await db.collection("checks").findOne({
            _id: new ObjectId(id)
        });

        if (check) {
            return NextResponse.json({
                success: true,
                data: { ...check, id: check._id.toString(), source: 'checks' }
            });
        }

        // Attempt 2: Search in receipts by checkId
        check = await db.collection("receipts").findOne({
            checkId: id  // Search by checkId link
        });

        if (check) {
            return NextResponse.json({
                success: true,
                data: {
                    ...check,
                    id: check._id.toString(),
                    source: 'receipts',
                    _id: check.checkId  // Return original ID for compatibility
                }
            });
        }

        return NextResponse.json({
            error: "Check not found"
        }, { status: 404 });

    } catch (error) {
        console.error("Error fetching check:", error);
        return NextResponse.json({
            error: "Failed to fetch check"
        }, { status: 500 });
    }
}

// PUT: Update check items
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { items, subtotal, tax, total, customerId, customerName, user, guestsCount } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");

        const existingCheck = await db.collection("checks").findOne({ _id: new ObjectId(id) });

        // History Logic
        let historyEntries: any[] = [];
        const author = user || existingCheck?.waiterName || 'System';

        if (existingCheck) {
            if (items && JSON.stringify(items) !== JSON.stringify(existingCheck.items)) {
                historyEntries.push({
                    action: 'update_items',
                    changedBy: author,
                    date: new Date().toISOString(),
                    previousDetails: existingCheck.items,
                    newDetails: items
                });
            }
            // Check other fields
            const checkField = (fieldName: string, label: string) => {
                const val = body[fieldName];
                const oldVal = existingCheck[fieldName];
                if (val !== undefined && val !== oldVal) {
                    historyEntries.push({
                        action: `update_${fieldName}`,
                        changedBy: author,
                        date: new Date().toISOString(),
                        previousValue: oldVal,
                        newValue: val
                    });
                }
            };

            checkField('discount', 'discount');
            checkField('comment', 'comment');
            checkField('guestsCount', 'guests');
        }

        await db.collection("checks").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    items,
                    tax,
                    total,
                    subtotal,
                    customerId,
                    customerName,
                    discount: body.discount,
                    appliedPromotionId: body.appliedPromotionId,
                    comment: body.comment,
                    guestsCount: guestsCount !== undefined ? guestsCount : existingCheck?.guestsCount,
                    updatedAt: new Date()
                },
                $push: {
                    history: { $each: historyEntries }
                } as any
            }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Failed to update check" }, { status: 500 });
    }
}

// DELETE: Cancel check with deposit refund
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const client = await clientPromise;
        const db = client.db("giraffe");

        const check = await db.collection("checks").findOne({ _id: new ObjectId(id) });
        if (!check) return NextResponse.json({ error: "Check not found" }, { status: 404 });

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
                    description: `Повернення передплати при видаленні чеку #${id.slice(-4)} (${check.tableName})`,
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
                comment: `Повернення передплати при видаленні чеку #${id.slice(-4)} (${check.tableName})`,
                authorName: check.waiterName || 'System',
                checkId: id,
                paymentMethod: deposit.method,
                createdAt: new Date()
            });

            // Не видаляємо оригінальний deposit — він лишається для коректного розрахунку
            // deposit_refund окремо віднімається від deposit в totalSalesCash
        }

        // 2. Видалити чек
        await db.collection("checks").deleteOne({ _id: new ObjectId(id) });

        // 3. Скасувати пов'язані події
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

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Failed to delete check" }, { status: 500 });
    }
}
