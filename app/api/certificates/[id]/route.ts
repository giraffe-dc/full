import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// PUT /api/certificates/[id] - Update a certificate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid certificate ID' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = { ...body };
    delete updateData._id;
    delete updateData.id;

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const result = await db.collection('certificates').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}

// DELETE /api/certificates/[id] - Delete a certificate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid certificate ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const result = await db.collection('certificates').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
}
