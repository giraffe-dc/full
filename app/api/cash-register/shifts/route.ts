
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 20;
        // console.log(status, limit);
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

        // Aggregate sales for open shifts (or all shifts if performance allows)
        // For MVP, doing it for the fetched shifts is fine
        const shiftIds = shifts.map(s => s._id);
        const receipts = await db.collection("receipts").find({ shiftId: { $in: shiftIds } }).toArray();
        const transactions = await db.collection("cash_transactions").find({ shiftId: { $in: shiftIds } }).toArray();

        const data = shifts.map(shift => {
            const shiftReceipts = receipts.filter(r => r.shiftId.toString() === shift._id.toString());
            const shiftTransactions = transactions.filter(t => t.shiftId.toString() === shift._id.toString());

            const totalSales = shiftReceipts.reduce((sum, r) => sum + (r.total || 0), 0);

            const totalSalesCash = shiftReceipts
                .filter(r => r.paymentMethod === 'cash')
                .reduce((sum, r) => sum + (r.total || 0), 0);

            const totalSalesCard = shiftReceipts
                .filter(r => r.paymentMethod === 'card')
                .reduce((sum, r) => sum + (r.total || 0), 0);

            const totalIncome = shiftTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const totalExpenses = shiftTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const totalIncasation = shiftTransactions
                .filter(t => t.type === 'incasation')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
                ...shift,
                id: shift._id.toString(),
                totalSales: shift.status === 'open' ? totalSales : (shift.totalSales || totalSales),
                totalSalesCash: shift.status === 'open' ? totalSalesCash : (shift.totalSalesCash || totalSalesCash),
                totalSalesCard: shift.status === 'open' ? totalSalesCard : (shift.totalSalesCard || totalSalesCard),
                totalIncome: shift.status === 'open' ? totalIncome : (shift.totalIncome || totalIncome),
                totalExpenses: shift.status === 'open' ? totalExpenses : (shift.totalExpenses || totalExpenses), // Now using real expenses
                totalIncasation: shift.status === 'open' ? totalIncasation : (shift.totalIncasation || totalIncasation),
                receipts: shiftReceipts,
                transactions: shiftTransactions // New field
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
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
        const totalSalesCash = receipts.filter(r => r.paymentMethod === 'cash').reduce((sum, r) => sum + (r.total || 0), 0);
        const totalSalesCard = receipts.filter(r => r.paymentMethod === 'card').reduce((sum, r) => sum + (r.total || 0), 0);

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
