
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const status = searchParams.get('status'); // 'all', 'open', 'paid'

        const client = await clientPromise;
        const db = client.db("giraffe");

        const filter: any = {};
        const dateFilter: any = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            dateFilter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        } else {
            // Default today
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            dateFilter.createdAt = {
                $gte: startDate,
                $lte: endDate
            };
        }

        // Checks store 'createdAt' as ISO String, Receipts as Date object
        const dateFilterString: any = {};
        if (dateFilter.createdAt) {
            dateFilterString.createdAt = {
                $gte: dateFilter.createdAt.$gte.toISOString(),
                $lte: dateFilter.createdAt.$lte.toISOString()
            };
        }

        let combinedResults: any[] = [];

        // Fetch Data based on status
        if ((!status || status === 'all' || status === 'paid')) {
            const receipts = await db.collection("receipts")
                .find(dateFilter)
                .sort({ createdAt: -1 })
                .toArray();
            combinedResults.push(...receipts.map(r => ({ ...r, id: r._id.toString(), status: 'paid', type: 'receipt' })));
        }

        if ((!status || status === 'all' || status === 'open')) {
            const checks = await db.collection("checks")
                .find(dateFilterString)
                .sort({ createdAt: -1 })
                .toArray();

            combinedResults.push(...checks.map(c => ({
                ...c,
                id: c._id.toString(),
                receiptNumber: 0,
                paymentMethod: 'unpaid',
                status: 'open',
                type: 'check',
                customerName: c.tableName
            })));
        }

        // Sort combined results by createdAt desc
        combinedResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        await db.collection("receipts").deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to delete receipt" }, { status: 500 });
    }
}
