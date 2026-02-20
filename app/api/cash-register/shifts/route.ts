
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;

        const client = await clientPromise;
        const db = client.db("giraffe");

        const filter: any = {};
        if (status) {
            filter.status = status;
        }

        const shifts = await db.collection("cash_shifts")
            .find(filter)
            .sort({ createdAt: -1 }) // Newest first
            .limit(limit)
            .toArray();

        // Parallel fetch optimization
        const shiftIds = shifts.map(s => s._id);

        // Fetch receipts and transactions for these shifts
        // Note: For open shifts or older data without shiftId, we might need date fallback, 
        // but for now relying on shiftId is cleaner for the main list if data is populated.
        // Falls back to date matches inside the map for robustness if needed.

        // Let's iterate and build details
        const detailedShifts = await Promise.all(shifts.map(async (shift) => {
            const shiftId = shift._id.toString();
            const start = new Date(shift.startTime);
            const end = shift.endTime ? new Date(shift.endTime) : new Date();

            // 1. Fetch Receipts
            let shiftReceipts = await db.collection("receipts").find({ shiftId: shift._id }).toArray();
            if (shiftReceipts.length === 0) {
                // Fallback to date
                shiftReceipts = await db.collection("receipts").find({
                    createdAt: { $gte: start, $lte: end }
                }).toArray();
            }

            const totalSalesCash = shiftReceipts
                .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
                .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.cash || 0) : r.total), 0);

            const totalSalesCard = shiftReceipts
                .filter((r: any) => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
                .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.card || 0) : r.total), 0);

            // 2. Fetch Cash Transactions
            let cashTxs = await db.collection("cash_transactions").find({ shiftId: shift._id }).toArray();
            if (cashTxs.length === 0) {
                cashTxs = await db.collection("cash_transactions").find({ createdAt: { $gte: start, $lte: end } }).toArray();
            }

            // 3. General Transactions (Manual)
            const settings = await db.collection("settings").findOne({ type: "global" });
            const posAccountIds = [
                settings?.finance?.cashAccountId,
                settings?.finance?.cardAccountId
            ].filter(Boolean);

            const generalTxs = await db.collection("transactions").find({
                paymentMethod: 'cash', // Only cash impacts book balance
                $or: [
                    { shiftId: shift._id, moneyAccountId: { $in: posAccountIds } },
                    {
                        date: { $gte: start, $lte: end },
                        shiftId: { $exists: false },
                        $or: [
                            { source: { $ne: 'cash-register' } },
                            { moneyAccountId: { $in: posAccountIds } }
                        ]
                    }
                ]
            }).toArray();

            // 4. Fetch Stock Supplies (External Expenses)
            const supplies = await db.collection("stock_movements")
                .find({
                    type: 'supply',
                    paidAmount: { $gt: 0 },
                    paymentMethod: 'cash', // Only cash
                    $or: [
                        { shiftId: shift._id, moneyAccountId: { $in: posAccountIds } },
                        {
                            date: { $gte: start, $lte: end },
                            shiftId: { $exists: false },
                            moneyAccountId: { $in: posAccountIds }
                        }
                    ]
                })
                .toArray();

            let income = 0;
            let expenses = 0;
            let incasation = 0;

            const detailedTransactions: any[] = [];

            // Add Shift Open Event
            detailedTransactions.push({
                id: `open-${shiftId}`,
                type: 'Відкриття зміни',
                createdAt: new Date(shift.startTime).toISOString(),
                amount: shift.startBalance,
                authorName: shift.cashier || 'Касир',
                comment: '',
                editedBy: '—'
            });

            if (shift.status === 'closed' && shift.endTime) {
                detailedTransactions.push({
                    id: `close-cash-${shiftId}`,
                    type: 'Закриття готівкової каси',
                    createdAt: new Date(shift.endTime).toISOString(),
                    amount: totalSalesCash,
                    authorName: shift.cashier || 'Касир',
                    comment: '',
                    editedBy: '—'
                });
                detailedTransactions.push({
                    id: `close-card-${shiftId}`,
                    type: 'Закриття безготівкової каси',
                    createdAt: new Date(shift.endTime).toISOString(),
                    amount: totalSalesCard,
                    authorName: shift.cashier || 'Касир',
                    comment: '',
                    editedBy: '—'
                });
            }

            // Process Cash Transactions
            cashTxs.forEach((ct: any) => {
                const amt = Number(ct.amount) || 0;
                if (ct.type === 'income') income += amt;
                if (ct.type === 'expense') expenses += amt;
                if (ct.type === 'incasation') incasation += amt;

                detailedTransactions.push({
                    id: ct._id.toString(),
                    type: ct.type === 'incasation' ? 'Інкасація' : (ct.category || (ct.type === 'income' ? 'Прихід' : 'Витрата')),
                    createdAt: new Date(ct.createdAt).toISOString(),
                    amount: ct.type === 'expense' || ct.type === 'incasation' ? -amt : amt,
                    authorName: ct.authorName || shift.cashierName,
                    comment: ct.comment,
                    editedBy: '—'
                });
            });

            // Process General Transactions (Manual)
            generalTxs.forEach((t: any) => {
                // Determine if this is a double-count (already in cashTxs?)
                // cashTxs are source: 'cash-register'. 
                // generalTxs filter above already handles source: { $ne: 'cash-register' } OR account match.
                // We should be careful to NOT include source: 'cash-register' from transactions collection 
                // IF they are already being processed from cash_transactions collection.
                // Wait, cash-register receipts go to 'transactions' with source: 'cash-register' or 'pos'.
                if (t.source === 'cash-register' || t.source === 'pos') return;

                const amt = (t.amount || 0);
                if (t.type === 'income') income += amt;
                if (t.type === 'expense') expenses += amt;

                detailedTransactions.push({
                    id: t._id.toString(),
                    type: t.category || (t.type === 'income' ? 'Прихід' : 'Витрата'),
                    createdAt: new Date(t.date).toISOString(),
                    amount: t.type === 'expense' ? -amt : amt,
                    authorName: t.user || 'System',
                    comment: t.description,
                    editedBy: 'Accounting'
                });
            });

            // Process Supplies
            supplies.forEach((s: any) => {
                const amt = (s.paidAmount || 0);
                expenses += amt;

                detailedTransactions.push({
                    id: s._id.toString(),
                    type: 'Постачання (Stock)',
                    createdAt: new Date(s.date).toISOString(),
                    amount: -amt,
                    authorName: s.supplierName || 'Supplier',
                    comment: s.description || 'Оплата постачання',
                    editedBy: 'Stock'
                });
            });

            // Calculate Balances
            // Use startBalance / endBalance from DB
            const bookBalance = (shift.startBalance || 0) + totalSalesCash + income - expenses - incasation;
            const actualBalance = shift.endBalance !== undefined ? shift.endBalance : bookBalance;

            return {
                ...shift,
                id: shiftId,
                shiftNumber: shift.shiftNumber ? String(shift.shiftNumber) : shiftId.slice(-4),
                // Ensure frontend fields match
                startTime: shift.startTime,
                endTime: shift.endTime,
                startBalance: shift.startBalance,
                totalIncasation: incasation,
                totalSalesCash: totalSalesCash,

                bookBalance,
                endBalance: actualBalance,
                cashDifference: actualBalance - bookBalance,

                totalSalesCard: totalSalesCard,
                totalIncome: income,
                totalExpenses: expenses,

                transactions: detailedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
                cashier: shift.cashier || shift.cashierName || 'Касир'
            };
        }));

        return NextResponse.json({ success: true, data: detailedShifts });
    } catch (error) {
        console.error("Failed to fetch shifts:", error);
        return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startBalance, cashierId, cashierName } = body;

        if (!cashierId) {
            return NextResponse.json({ error: "Cashier (Staff) is required to open shift" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Check if there is already an open shift
        const activeShift = await db.collection("cash_shifts").findOne({ status: "open" });
        if (activeShift) {
            return NextResponse.json({ error: "Shift already open", shiftId: activeShift._id }, { status: 409 });
        }

        // Get last shift number
        const lastShift = await db.collection("cash_shifts").find().sort({ shiftNumber: -1 }).limit(1).next();
        const nextShiftNumber = lastShift ? lastShift.shiftNumber + 1 : 1;

        const newShift = {
            shiftNumber: nextShiftNumber,
            startTime: new Date(),
            startBalance: Number(startBalance) || 0,
            status: "open",
            cashier: cashierName || "Unknown",
            cashierId: cashierId,
            activeStaffIds: [cashierId], // Auto-add opener to active staff
            totalSales: 0,
            totalSalesCash: 0,
            totalSalesCard: 0,
            createdAt: new Date()
        };

        const result = await db.collection("cash_shifts").insertOne(newShift);
        const shiftId = result.insertedId;

        // Auto-clock in the cashier
        await db.collection("staff_logs").insertOne({
            staffId: cashierId,
            shiftId: shiftId,
            startTime: new Date(),
            endTime: null,
            createdAt: new Date()
        });

        return NextResponse.json({
            success: true,
            data: { ...newShift, id: shiftId.toString() }
        });

    } catch (error) {
        return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, endBalance, activeStaffIds } = body;

        if (!id) return NextResponse.json({ error: "Shift ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Handle Active Staff Update (Clock In/Out)
        if (activeStaffIds) {
            // 1. Fetch current active staff to determine added/removed
            const currentShift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });
            const currentIds: string[] = currentShift?.activeStaffIds || [];

            // 2. Identify changes
            const toAdd = activeStaffIds.filter((sid: string) => !currentIds.includes(sid));
            const toRemove = currentIds.filter((sid: string) => !activeStaffIds.includes(sid));

            // 3. Clock In (Add Log)
            if (toAdd.length > 0) {
                const newLogs = toAdd.map((sid: string) => ({
                    staffId: sid,
                    shiftId: new ObjectId(id),
                    startTime: new Date(),
                    endTime: null,
                    createdAt: new Date()
                }));
                await db.collection("staff_logs").insertMany(newLogs);
            }

            // 4. Clock Out (Close Log)
            if (toRemove.length > 0) {
                await db.collection("staff_logs").updateMany(
                    {
                        shiftId: new ObjectId(id),
                        staffId: { $in: toRemove },
                        endTime: null
                    },
                    { $set: { endTime: new Date() } }
                );
            }

            await db.collection("cash_shifts").updateOne(
                { _id: new ObjectId(id) },
                { $set: { activeStaffIds, updatedAt: new Date() } }
            );
            return NextResponse.json({ success: true });
        }

        // Calculate totals from receipts linked to this shift
        // Alternatively, we could rely on the frontend passing totals, but backend calculation is safer.
        // Let's aggregate receipts.

        const receipts = await db.collection("receipts").find({ shiftId: new ObjectId(id) }).toArray();
        const transactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id) }).toArray();

        const totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
        const totalSalesCash = receipts
            .filter(r => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => sum + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.cash || 0) : r.total), 0);
        const totalSalesCard = receipts
            .filter(r => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => sum + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.card || 0) : r.total), 0);

        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalIncasation = transactions.filter(t => t.type === 'incasation').reduce((sum, t) => sum + (t.amount || 0), 0);

        // Fetch current shift to get startBalance
        const shift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        // Expected Cash = Start + Cash Sales + Income - Expenses - Incasation
        const expectedCash = (shift.startBalance || 0) + totalSalesCash + totalIncome - totalExpenses - totalIncasation;
        const actualCash = Number(endBalance);
        const cashDifference = actualCash - expectedCash;

        const updateData = {
            status: "closed",
            endTime: new Date(),
            endBalance: actualCash,
            totalSales,
            totalSalesCash,
            totalSalesCard,
            totalIncome,
            totalExpenses,
            totalIncasation,
            receiptsCount: receipts.length,
            cashDifference: cashDifference,
            updatedAt: new Date()
        };

        // Close all open staff logs for this shift
        await db.collection("staff_logs").updateMany(
            { shiftId: new ObjectId(id), endTime: null },
            { $set: { endTime: new Date() } }
        );

        await db.collection("cash_shifts").updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        return NextResponse.json({ success: true, data: updateData });

    } catch (error) {
        console.error("Close Shift Error", error);
        return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
    }
}
