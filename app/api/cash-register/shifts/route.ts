
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { calculateSalesCash, calculateSalesCard } from "@/lib/deposit-utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;
        const activeStaff = searchParams.get('activeStaff'); // New param to get active staff

        const client = await clientPromise;
        const db = client.db("giraffe");

        // If requesting active staff for current shift
        if (activeStaff === 'true') {
            const openShift = await db.collection("cash_shifts").findOne({ status: "open" });
            
            if (!openShift) {
                return NextResponse.json({ 
                    success: true, 
                    data: [],
                    message: "No open shift"
                });
            }
            
            // Get active staff IDs from shift
            const activeStaffIds = openShift.activeStaffIds || [];
            
            if (activeStaffIds.length === 0) {
                return NextResponse.json({ 
                    success: true, 
                    data: [],
                    message: "No active staff"
                });
            }
            
            // Fetch staff details from staff collection
            const staffMembers = await db.collection("staff").find({
                _id: { $in: activeStaffIds.map((id: string) => new ObjectId(id)) }
            }).toArray();
            
            const staffData = staffMembers.map(s => ({
                id: s._id.toString(),
                name: s.name || s.fullName || "Unknown",
                position: s.position || "Співробітник"
            }));
            
            return NextResponse.json({ 
                success: true, 
                data: staffData,
                shiftId: openShift._id.toString()
            });
        }

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
            const shiftReceipts = await db.collection("receipts").find({
                $or: [
                    { shiftId: shift._id },
                    { createdAt: { $gte: start, $lte: end } }
                ]
            }).toArray();

            // Продажі з чеків: універсальна формула з deposit-utils
            let totalSalesCash = shiftReceipts
                .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
                .reduce((acc: number, r: any) => acc + calculateSalesCash(r), 0);

            let totalSalesCard = shiftReceipts
                .filter((r: any) => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
                .reduce((acc: number, r: any) => acc + calculateSalesCard(r), 0);

            // 2. Fetch Cash Transactions
            let cashTxs = await db.collection("cash_transactions").find({ shiftId: shift._id, isDeleted: { $ne: true } }).toArray();
            if (cashTxs.length === 0) {
                cashTxs = await db.collection("cash_transactions").find({ createdAt: { $gte: start, $lte: end }, isDeleted: { $ne: true } }).toArray();
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
            // ========================================
            // 'deposit' - внесення коштів (передплати, поповнення)
            // 'sales' - пропускаємо, вони вже в receipts
            // ========================================
            let totalDepositsCash = 0;
            let totalDepositsCard = 0;
            let totalRefundsCash = 0;
            let totalRefundsCard = 0;

            cashTxs.forEach((ct: any) => {
                const amt = Number(ct.amount) || 0;

                // Рахуємо депозити (передплати, поповнення касси) розділено за методом
                if (ct.category === 'deposit') {
                    if (ct.paymentMethod === 'card') {
                        totalDepositsCard += amt;
                    } else {
                        totalDepositsCash += amt;
                    }
                }

                // Рахуємо повернення депозитів
                if (ct.category === 'deposit_refund') {
                    if (ct.paymentMethod === 'card') {
                        totalRefundsCard += amt;
                    } else {
                        totalRefundsCash += amt;
                    }
                }

                // Пропускаємо касові продажи - вони вже в receipts
                if (ct.category === 'sales') {
                    return;
                }

                // Пропускаємо касові аудит операції
                if (ct.category === 'deposit_audit') {
                    return;
                }

                if (ct.type === 'income' && ct.category !== 'deposit' && ct.category !== 'deposit_refund') income += amt;
                if (ct.type === 'expense' && ct.category !== 'deposit_refund') expenses += amt;
                if (ct.type === 'incasation') incasation += amt;

                // Deposit → відображаємо як "Продажі" в детальному списку
                let txType = ct.type === 'incasation' ? 'Інкасація' : (ct.category || (ct.type === 'income' ? 'Прихід' : 'Витрата'));
                if (ct.category === 'deposit') txType = ct.paymentMethod === 'card' ? 'Продажі (Картка)' : 'Продажі (Готівка)';
                if (ct.category === 'deposit_refund') txType = ct.paymentMethod === 'card' ? 'Повернення (Картка)' : 'Повернення (Готівка)';

                detailedTransactions.push({
                    id: ct._id.toString(),
                    type: txType,
                    createdAt: new Date(ct.createdAt).toISOString(),
                    amount: ct.type === 'expense' || ct.type === 'incasation' ? -amt : amt,
                    authorName: ct.authorName || shift.cashierName,
                    comment: ct.comment,
                    editedBy: '—'
                });
            });

            // Додати чеки з передоплатою в детальний список (тільки доплата, депозит вже в "Внесення коштів")
            shiftReceipts.filter((r: any) => (Number(r.depositAmount) || 0) > 0).forEach((r: any) => {
                const depositAmt = Number(r.depositAmount) || 0;
                const remainder = Math.max(0, (r.total || 0) - depositAmt);
                if (remainder > 0) {
                    detailedTransactions.push({
                        id: `receipt-deposit-${r._id.toString()}`,
                        type: 'Доплата по чеку',
                        createdAt: new Date(r.createdAt).toISOString(),
                        amount: remainder,
                        authorName: r.waiter || shift.cashier || 'Касир',
                        comment: `Чек #${r.receiptNumber} (повна: ${r.total}₴, передплата: ${depositAmt}₴)`,
                        editedBy: '—'
                    });
                }
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

            // Депозити додаємо до продажів, повернення віднімаємо
            totalSalesCash += totalDepositsCash - totalRefundsCash;
            totalSalesCard += totalDepositsCard - totalRefundsCard;

            // Розрахунок bookBalance: sales (включає deposits) + income - expenses - incasation
            const bookBalance = (shift.startBalance || 0)
                + totalSalesCash
                + income - expenses - incasation;
            const actualBalance = shift.endBalance !== undefined ? shift.endBalance : bookBalance;

            return {
                ...shift,
                id: shiftId,
                shiftNumber: shift.shiftNumber ? String(shift.shiftNumber) : shiftId.slice(-4),
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

        // Перевірка застарілих передплат (>30 днів)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const staleDeposits = await db.collection("checks").find({
            paymentStatus: 'deposit',
            "deposit.createdAt": { $lt: thirtyDaysAgo }
        }).toArray();

        return NextResponse.json({
            success: true,
            data: { ...newShift, id: shiftId.toString() },
            warnings: staleDeposits.length > 0 ? [{
                type: 'stale_deposits',
                message: `Є ${staleDeposits.length} передплат старіших за 30 днів`,
                count: staleDeposits.length,
                checkIds: staleDeposits.map((c: any) => c._id.toString())
            }] : []
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

        // Fetch current shift to get startBalance and startTime
        const shift = await db.collection("cash_shifts").findOne({ _id: new ObjectId(id) });
        if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

        // Handle Active Staff Update (Clock In/Out)
        if (activeStaffIds) {
            // 1. Identify changes
            const currentIds: string[] = shift.activeStaffIds || [];
            const toAdd = activeStaffIds.filter((sid: string) => !currentIds.includes(sid));
            const toRemove = currentIds.filter((sid: string) => !activeStaffIds.includes(sid));

            // 2. Clock In (Add Log)
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

            // 3. Clock Out (Close Log)
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
        const transactions = await db.collection("cash_transactions").find({ shiftId: new ObjectId(id), isDeleted: { $ne: true } }).toArray();

        const totalIncome = transactions.filter(t => t.type === 'income' && t.category !== 'deposit' && t.category !== 'sales').reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'deposit_refund').reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalIncasation = transactions.filter(t => t.type === 'incasation').reduce((sum, t) => sum + (t.amount || 0), 0);

        // Рахуємо депозити окремо
        const depositTransactions = transactions.filter(t => t.category === 'deposit');
        const depositCash = depositTransactions
            .filter(t => t.paymentMethod === 'cash' || !t.paymentMethod)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const depositCard = depositTransactions
            .filter(t => t.paymentMethod === 'card')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const startTime = new Date(shift.startTime);
        const endTime = new Date();

        const receipts = await db.collection("receipts").find({
            $or: [
                { shiftId: new ObjectId(id) },
                { createdAt: { $gte: startTime, $lte: endTime } }
            ]
        }).toArray();

        let totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
        // Продажі з чеків: універсальна формула
        // Віднімаємо депозит ПО МЕТОДУ (cash deposit тільки від cash portion, card deposit тільки від card portion)
        let totalSalesCash = receipts
            .filter(r => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => {
                const depAmt = Number(r.depositAmount) || 0;
                const depM = r.depositMethod || r.depositInfo?.method;
                const cashDep = depM === 'cash' ? depAmt : 0;
                if (r.paymentMethod === 'mixed') {
                    return sum + Math.max(0, (r.paymentDetails?.cash || 0) - cashDep);
                }
                return sum + Math.max(0, (r.total || 0) - cashDep);
            }, 0);
        let totalSalesCard = receipts
            .filter(r => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
            .reduce((sum, r) => {
                const depAmt = Number(r.depositAmount) || 0;
                const depM = r.depositMethod || r.depositInfo?.method;
                const cardDep = depM === 'card' ? depAmt : 0;
                if (r.paymentMethod === 'mixed') {
                    return sum + Math.max(0, (r.paymentDetails?.card || 0) - cardDep);
                }
                return sum + Math.max(0, (r.total || 0) - cardDep);
            }, 0);

        // totalSalesCash/Card = чисті продажі (БЕЗ депозитів) для відображення
        // Додаємо deposits до відповідних категорій продажів
        totalSales = totalSalesCash + depositCash + totalSalesCard + depositCard;

        // Депозити: готівкові → "Продажі (Готівка)", карткові → "Продажі (Карта)"
        // displayIncome = тільки ручні доходи (без депозитів)
        const displayIncome = totalIncome;

        // Expected Cash = Start + Sales Cash (включаючи готівкові deposits) + Income - Expenses - Incasation
        const expectedCash = (shift.startBalance || 0) + totalSalesCash + depositCash + totalIncome - totalExpenses - totalIncasation;
        const actualCash = Number(endBalance);
        const cashDifference = actualCash - expectedCash;

        const updateData = {
            status: "closed",
            endTime: new Date(),
            endBalance: actualCash,
            totalSales,
            totalSalesCash: totalSalesCash + depositCash,  // Готівкові депозити = "Продажі (Готівка)"
            totalSalesCard: totalSalesCard + depositCard,  // Карткові депозити = "Продажі (Карта)"
            totalIncome: displayIncome,
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
