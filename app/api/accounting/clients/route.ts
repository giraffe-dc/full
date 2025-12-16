
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("giraffe");

    // 1. Fetch all clients
    const clientsRaw = await db.collection("clients").find({ status: { $ne: "inactive" } }).toArray();

    // 2. Fetch all receipts to aggregate stats
    // Optimization: In a real large app, we would use an aggregation pipeline or update client stats incrementally.
    // For now, fetching receipts is okay or we can use $lookup key if possible.
    // Let's use aggregation pipeline for efficiency.

    const pipeline = [
      { $match: { status: { $ne: "inactive" } } },
      {
        $lookup: {
          from: "receipts",
          let: { clientId: { $toString: "$_id" } }, // Assuming receipts store customerId as string
          pipeline: [
            { $match: { $expr: { $eq: ["$customerId", "$$clientId"] } } }
          ],
          as: "clientReceipts"
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          email: 1,
          address: 1,
          noDiscount: { $ifNull: ["$discountRaw", 0] }, // Placeholder for logic
          // Calculate stats from receipts
          receiptsCount: { $size: "$clientReceipts" },
          totalSpent: { $sum: "$clientReceipts.total" },
          cashSpent: {
            $sum: {
              $map: {
                input: { $filter: { input: "$clientReceipts", as: "r", cond: { $eq: ["$$r.paymentMethod", "cash"] } } },
                as: "cr",
                in: "$$cr.total"
              }
            }
          },
          cardSpent: {
            $sum: {
              $map: {
                input: { $filter: { input: "$clientReceipts", as: "r", cond: { $ne: ["$$r.paymentMethod", "cash"] } } }, // Simplifying mixed
                as: "cr",
                in: "$$cr.total"
              }
            }
          },
        }
      }
    ];

    // Note: The above pipeline assumes customerId in receipts matches client._id.toString()
    // If receipts don't have customerId, stats will be 0.

    // If we can't rely on aggregation due to ID types, we might fetch separate.
    // Let's try aggregation first, assuming standard ID usage.

    // Actually, MongoDB $lookup with ObjectId vs String is tricky.
    // Safe bet: Fetch clients, Fetch ALL receipts (filtered by having customerId), Map in JS.

    const receipts = await db.collection("receipts").find({ customerId: { $exists: true, $ne: null } }).toArray();

    const clients = clientsRaw.map(c => {
      const cId = c._id.toString();
      const cReceipts = receipts.filter(r => r.customerId && r.customerId.toString() === cId);

      const cash = cReceipts.filter(r => r.paymentMethod === 'cash').reduce((sum, r) => sum + (r.total || 0), 0);
      const card = cReceipts.filter(r => r.paymentMethod !== 'cash').reduce((sum, r) => sum + (r.total || 0), 0);
      const total = cash + card;

      // Calculate parsed discount or derive it
      // If discount is not explicitly saved, try: (subtotal + tax) - total
      // But for now, let's sum 'discount' if it exists, otherwise 0.
      const discountSum = cReceipts.reduce((sum, r) => sum + (r.discount || 0), 0);

      const profit = total; // Revenue

      return {
        id: cId,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        noDiscount: discountSum,
        cash,
        card,
        profit,
        receipts: cReceipts.length,
        avgCheck: cReceipts.length > 0 ? total / cReceipts.length : 0,
        status: c.status || 'active'
      };
    });

    // Calculate Grand Totals
    const totals = clients.reduce((acc, c) => ({
      noDiscount: acc.noDiscount + c.noDiscount,
      cash: acc.cash + c.cash,
      card: acc.card + c.card,
      profit: acc.profit + c.profit,
      receipts: acc.receipts + c.receipts
    }), { noDiscount: 0, cash: 0, card: 0, profit: 0, receipts: 0 });

    return NextResponse.json({ data: clients, totals });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, address } = body;

    const client = await clientPromise;
    const db = client.db("giraffe");

    const result = await db.collection("clients").insertOne({
      name,
      phone,
      email,
      address,
      status: 'active',
      createdAt: new Date()
    });

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (err) {
    return NextResponse.json({ error: "Creation failed" }, { status: 500 });
  }
}
