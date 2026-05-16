import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const types = await db.collection('certificate_types')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = types.map(t => ({ ...t, id: t._id.toString() }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching certificate types:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.baseLogic) {
      return NextResponse.json({ success: false, error: 'Name and baseLogic are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const newType = {
      ...body,
      createdAt: new Date().toISOString(),
      status: body.status || 'active'
    };
    delete newType._id;
    delete newType.id;

    const result = await db.collection('certificate_types').insertOne(newType);

    return NextResponse.json({
      success: true,
      data: { ...newType, id: result.insertedId.toString() }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating certificate type:', error);
    return NextResponse.json({ success: false, error: 'Failed to create type' }, { status: 500 });
  }
}
