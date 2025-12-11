import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { CashShift } from '@/types/accounting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<CashShift>('cashShifts');

    const result = await collection.findOne({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Касова зміна не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching cash shift:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні касової зміни' },
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
    const collection = db.collection<CashShift>('cashShifts');

    const body = await request.json();
    const { cashier, openedAt, closedAt, openingBalance, closingBalance, status } = body;

    if (!cashier) {
      return NextResponse.json(
        { success: false, error: 'Касир обов\'язковий' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          cashier,
          openedAt: openedAt || new Date().toISOString(),
          closedAt: closedAt || null,
          openingBalance: openingBalance || 0,
          closingBalance: closingBalance || 0,
          status: status || 'open',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Касова зміна не знайдена' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Касова зміна успішно оновлена',
    });
  } catch (error) {
    console.error('Error updating cash shift:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні касової зміни' },
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
    const collection = db.collection<CashShift>('cashShifts');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Касова зміна не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Касова зміна успішно видалена',
    });
  } catch (error) {
    console.error('Error deleting cash shift:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні касової зміни' },
      { status: 500 }
    );
  }
}
