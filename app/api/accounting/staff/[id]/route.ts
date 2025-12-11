import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { StaffRow } from '@/types/accounting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<StaffRow>('staff');

    const result = await collection.findOne({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Працівник не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні працівника' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<StaffRow>('staff');

    const body = await request.json();
    const { name, position, phone, email, salary, status } = body;

    if (!name || !position) {
      return NextResponse.json(
        { success: false, error: 'Назва та посада обов\'язкові' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          name,
          position,
          phone: phone || '',
          email: email || '',
          salary: salary || 0,
          status: status || 'active',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Працівник не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Працівник успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні працівника' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<StaffRow>('staff');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Працівник не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Працівник успішно видалений',
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні працівника' },
      { status: 500 }
    );
  }
}
