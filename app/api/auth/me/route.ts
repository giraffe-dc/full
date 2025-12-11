import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies?.get?.("token")?.value ?? null;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 200 });

    try {
      const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
      return NextResponse.json({ authenticated: true, user: { id: payload.sub, email: payload.email, role: payload.role } });
    } catch (e) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
