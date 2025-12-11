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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const paymentMethod = searchParams.get("paymentMethod");
    const source = searchParams.get("source");

    const client = await clientPromise;
    const db = client.db();
    let query: any = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (source) {
      query.source = source;
    }

    const tx = await db.collection("transactions").find(query).sort({ date: -1, createdAt: -1 }).limit(200).toArray();

    // Calculate totals
    const totals = tx.reduce<{ income: number; expense: number; balance: number }>(
      (acc, t) => {
        if (t.type === "income") {
          acc.income += Number(t.amount) || 0;
        } else {
          acc.expense += Number(t.amount) || 0;
        }
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 }
    );

    return NextResponse.json({ data: tx, totals });
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
    const db = client.db();
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
