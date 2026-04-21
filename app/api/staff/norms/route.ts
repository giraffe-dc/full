import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
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
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const client = await clientPromise;
    const db = client.db("giraffe");

    const norm = await db.collection("hour_norms").findOne({ year });

    return NextResponse.json({ success: true, data: norm });
  } catch (error) {
    console.error("Error fetching hour norms:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { year, months } = await req.json();

    if (!year || !months) {
      return NextResponse.json({ error: "Missing year or months data" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");

    const result = await db.collection("hour_norms").updateOne(
      { year: parseInt(year) },
      { 
        $set: { 
          months, 
          updatedAt: new Date(),
          updatedBy: user.sub
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error saving hour norms:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
