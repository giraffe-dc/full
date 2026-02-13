import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const status = searchParams.get('status'); // 'all', 'open', 'paid'

        const client = await clientPromise;
        const db = client.db("giraffe");

        const dateFilter: any = {};
        let sDate: Date;
        let eDate: Date;

        if (startDateParam && endDateParam) {
            sDate = new Date(startDateParam);
            sDate.setHours(0, 0, 0, 0);
            eDate = new Date(endDateParam);
            eDate.setHours(23, 59, 59, 999);
        } else if (date) {
            sDate = new Date(date);
            sDate.setHours(0, 0, 0, 0);
            eDate = new Date(date);
            eDate.setHours(23, 59, 59, 999);
        } else {
            // Default today
            sDate = new Date();
            sDate.setHours(0, 0, 0, 0);
            eDate = new Date();
            eDate.setHours(23, 59, 59, 999);
        }

        // Checks (Open) use createdAt (Opening Time)
        const checksDateFilter = {
            createdAt: {
                $gte: sDate.toISOString(),
                $lte: eDate.toISOString()
            }
        };

        // Receipts (Paid) - FIX: Use unified date range logic
        const receiptsDateFilter = {
            updatedAt: {
                $gte: sDate,
                $lte: eDate
            }
        };

        const receiptsDateFilterISO = {
            updatedAt: {
                $gte: sDate.toISOString(),
                $lte: eDate.toISOString()
            }
        };

        let combinedResults: any[] = [];

        // Fetch Data based on status
        if ((!status || status === 'all' || status === 'paid')) {
            const receipts = await db.collection("receipts")
                .find({
                    $or: [
                        receiptsDateFilter,
                        receiptsDateFilterISO
                    ]
                })
                .sort({ updatedAt: -1 })
                .toArray();
            combinedResults.push(...receipts.map(r => ({ ...r, id: r._id.toString(), status: 'paid', type: 'receipt', date: r.updatedAt })));
        }

        if ((!status || status === 'all' || status === 'open')) {
            const checks = await db.collection("checks")
                .find(checksDateFilter)
                .sort({ createdAt: -1 })
                .toArray();

            combinedResults.push(...checks.map(c => ({
                ...c,
                id: c._id.toString(),
                receiptNumber: 0,
                paymentMethod: 'unpaid',
                status: 'open',
                type: 'check',
                customerName: c.tableName,
                date: c.createdAt // Normalize date field for sorting
            })));
        }

        // Sort combined results by date desc
        combinedResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            success: true,
            data: combinedResults
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, paymentMethod, paymentDetails, user } = body; // user is who made the change

        if (!id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const receipt = await db.collection("receipts").findOne({ _id: new ObjectId(id) });
        if (!receipt) {
            return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
        }

        let updateData: any = { updatedAt: new Date() };
        let historyEntry: any = {
            action: 'update_payment',
            changedBy: user || 'Unknown',
            date: new Date().toISOString()
        };

        if (paymentDetails) {
            updateData.paymentDetails = paymentDetails;
            historyEntry.previousDetails = receipt.paymentDetails;
            historyEntry.newDetails = paymentDetails;

            // Auto-detect payment method
            const cash = paymentDetails.cash || 0;
            const card = paymentDetails.card || 0;
            const cert = paymentDetails.certificate || 0;

            let newMethod = 'mixed';
            if (cash > 0 && card === 0 && cert === 0) newMethod = 'cash';
            else if (card > 0 && cash === 0 && cert === 0) newMethod = 'card';
            else if (cert > 0 && cash === 0 && card === 0) newMethod = 'other'; // or keep existing if only cert? Let's use 'mixed' or specific if needed.
            // Keeping 'mixed' for combinations or certificate usage implies non-standard.

            updateData.paymentMethod = newMethod;
            historyEntry.previousValue = receipt.paymentMethod;
            historyEntry.newValue = newMethod;
        } else if (paymentMethod) {
            updateData.paymentMethod = paymentMethod;
            historyEntry.previousValue = receipt.paymentMethod;
            historyEntry.newValue = paymentMethod;
        }

        await db.collection("receipts").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: updateData,
                $push: { history: historyEntry } as any
            }
        );

        return NextResponse.json({ success: true });

    } catch (e) {
        return NextResponse.json({ error: "Failed to update receipt" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        try {
            await session.withTransaction(async () => {
                const oid = new ObjectId(id);
                const receipt = await db.collection("receipts").findOne({ _id: oid }, { session });
                if (!receipt) throw new Error("Receipt not found");

                // Revert Stock Movements
                const { revertBalances } = await import('@/lib/stock-utils');
                const movements = await db.collection("stock_movements").find({
                    referenceId: oid,
                    isDeleted: { $ne: true }
                }, { session }).toArray();

                for (const move of movements) {
                    await revertBalances(db, move, session);
                    await db.collection("stock_movements").updateOne(
                        { _id: move._id },
                        { $set: { isDeleted: true, updatedAt: new Date() } },
                        { session }
                    );
                }

                await db.collection("receipts").deleteOne({ _id: oid }, { session });
            });

            return NextResponse.json({ success: true, message: "Receipt deleted and stock returned" });
        } catch (error: any) {
            return NextResponse.json({ error: error.message || "Failed to delete receipt" }, { status: 500 });
        } finally {
            await session.endSession();
        }
    } catch (e) {
        console.error("Delete receipt error:", e);
        return NextResponse.json({ error: "Failed to delete receipt" }, { status: 500 });
    }
}
