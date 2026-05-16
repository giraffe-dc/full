import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// GET /api/certificates/settings - Get global settings
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const settings = await db.collection('settings').findOne({ type: 'certificates' });

    return NextResponse.json({ success: true, data: settings || { allowedCategories: [] } });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/certificates/settings - Update global settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const updateData = {
      type: 'certificates',
      allowedCategories: body.allowedCategories || [],
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('settings').updateOne(
      { type: 'certificates' },
      { $set: updateData },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data: updateData });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
