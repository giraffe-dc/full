import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUserFromReq(req: NextRequest) {
  const token = req.cookies?.get?.("token")?.value ?? null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // skipping auth for now as per other routes

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includePos = searchParams.get("includePos") === "true"; // Check for flag

    const client = await clientPromise;
    const db = client.db("giraffe");

    // Date Filter Construction
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchDate = (field: string) => (Object.keys(dateFilter).length ? { [field]: dateFilter } : {});

    // 1. Fetch Manual Transactions (excluding POS auto-generated ones if we have separate source)
    const txPromise = db.collection("transactions")
      .find({
        ...matchDate("date"),
        source: { $ne: "cash-register" }
      })
      .toArray();

    // 2. Fetch Stock Supplies (Expenses)
    const suppliesPromise = db.collection("stock_movements")
      .find({
        type: 'supply',
        ...matchDate("date"),
        paidAmount: { $gt: 0 }
      })
      .toArray();

    // 3. Fetch Receipts (Income) - ONLY IF includePos is true
    const receiptsPromise = includePos
      ? db.collection("receipts").find({ ...matchDate("createdAt") }).toArray()
      : Promise.resolve([]);

    const [txRaw, suppliesRaw, receiptsRaw] = await Promise.all([txPromise, suppliesPromise, receiptsPromise]);

    const transactions = [
      // Manual
      ...txRaw.map(t => ({
        ...t,
        _id: t._id.toString(),
        date: t.date,
        category: t.category || "other",
        source: "manual",
        paymentMethod: t.paymentMethod || "cash",
        type: t.type || "income",
        amount: t.amount || 0,
      })),
      // Receipts -> Income
      ...receiptsRaw.map(r => ({
        _id: r._id.toString(),
        date: r.createdAt,
        description: `Чек #${r.receiptNumber}`,
        amount: r.total,
        type: 'income',
        category: 'sales', // General category for POS
        paymentMethod: r.paymentMethod,
        source: 'pos',
        visits: 1, // Count as 1 visit/order
        createdAt: r.createdAt
      })),
      // Supplies -> Expense
      ...suppliesRaw.map(s => ({
        _id: s._id.toString(),
        date: s.date,
        description: `Постачання: ${s.supplierName || 'Unknown'}`,
        amount: s.paidAmount || 0,
        type: 'expense',
        category: 'stock',
        paymentMethod: s.paymentMethod || 'cash',
        source: 'stock',
        createdAt: s.createdAt || s.date
      }))
    ];

    // Filter by Type/Category/Source if searchParams present
    let filtered = transactions;
    const pType = searchParams.get("type");
    const pCat = searchParams.get("category");
    const pMethod = searchParams.get("paymentMethod");
    const pSource = searchParams.get("source");

    if (pType) filtered = filtered.filter(t => t.type === pType);
    if (pCat) filtered = filtered.filter(t => t.category === pCat);
    if (pMethod) filtered = filtered.filter(t => t.paymentMethod === pMethod);
    if (pSource) filtered = filtered.filter(t => t.source === pSource);

    // Sort Descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate totals
    const totals = filtered.reduce<{ income: number; expense: number; balance: number }>(
      (acc, t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === "income") {
          acc.income += amt;
        } else {
          acc.expense += amt;
        }
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );

    // Slice for pagination if needed, but current UI assumes all load (limit 200 in original)
    // Let's keep it robust but maybe limit if too large. 
    // The original had limit(200). With merged data, it might be bigger.
    // Let's return first 500 for performance.
    const resultData = filtered.slice(0, 500);

    return NextResponse.json({ data: resultData, totals });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      date,
      description,
      amount,
      type = "income",
      category = "other",
      paymentMethod = "cash",
      source = "onsite",
      visits,
    } = body;

    if (!description || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");
    const result = await db.collection("transactions").insertOne({
      date: date ? new Date(date) : new Date(),
      description,
      amount: Number(amount),
      type,
      category,
      paymentMethod,
      source,
      visits: visits !== undefined ? Number(visits) || 0 : undefined,
      createdBy: user.sub,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: result.insertedId }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
