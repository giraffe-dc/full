import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUserFromReq(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { date, description, amount, type, category, paymentMethod, source, visits } = await req.json();
    const client = await clientPromise;
    const db = client.db("giraffe");

    const updateData: any = { updatedAt: new Date() };
    if (date !== undefined) updateData.date = date ? new Date(date) : new Date();
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (source !== undefined) updateData.source = source;
    if (visits !== undefined) updateData.visits = Number(visits);

    // 1. Try updating 'transactions' collection
    const result = await db
      .collection("transactions")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount > 0) {
      return NextResponse.json({ ok: true });
    }

    // 2. If not found, try 'stock_movements' (for Supplies)
    // Map fields for stock_movements
    const stockUpdateData: any = { updatedAt: new Date() };
    if (date !== undefined) stockUpdateData.date = date ? new Date(date) : new Date();
    if (description !== undefined) stockUpdateData.description = description; // or supplierName? keep description
    if (amount !== undefined) stockUpdateData.paidAmount = Number(amount); // Map amount to paidAmount
    if (paymentMethod !== undefined) stockUpdateData.paymentMethod = paymentMethod;
    // stock_movements don't usuall use 'category' (it's implicitly 'stock') or 'type' (it's 'supply') in the same way, but we can set them if fields exist

    const resultStock = await db
      .collection("stock_movements")
      .updateOne({ _id: new ObjectId(id) }, { $set: stockUpdateData });

    if (resultStock.matchedCount > 0) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const db = client.db("giraffe");

    // 1. Try deleting from 'transactions'
    const result = await db
      .collection("transactions")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0) {
      return NextResponse.json({ ok: true });
    }

    // 2. Try deleting from 'stock_movements'
    const resultStock = await db
      .collection("stock_movements")
      .deleteOne({ _id: new ObjectId(id) });

    if (resultStock.deletedCount > 0) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

