import { NextResponse, NextRequest } from "next/server";
import clientPromise from "../../../lib/mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUser(req: NextRequest) {
  const token = req.cookies?.get?.("token")?.value ?? null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const position = searchParams.get("position");
    const status = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db("giraffe");
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (position) {
      query.position = position;
    }

    if (status) {
      query.status = status;
    }

    const staff = await db.collection("staff").find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ data: staff });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, email, phone, position, status = "active", hireDate, salary } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");
    const result = await db.collection("staff").insertOne({
      name,
      email,
      phone,
      position,
      status,
      hireDate: hireDate ? new Date(hireDate) : new Date(),
      salary: salary ? Number(salary) : null,
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

