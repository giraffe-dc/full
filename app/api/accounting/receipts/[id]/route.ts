import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ReceiptRow } from '@/types/accounting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ReceiptRow>('receipts');

    const result = await collection.findOne({ id});

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Чек не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні чека' },
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
    const collection = db.collection<ReceiptRow>('receipts');

    const body = await request.json();
    const { waiter, openedAt, closedAt, paid, discount, profit, status } = body;

    if (!waiter) {
      return NextResponse.json(
        { success: false, error: 'Офіціант обов\'язковий' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          waiter,
          openedAt: openedAt || new Date().toISOString(),
          closedAt: closedAt || null,
          paid: paid || 0,
          discount: discount || 0,
          profit: profit || 0,
          status: status || 'open',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Чек не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Чек успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні чека' },
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
    const collection = db.collection<ReceiptRow>('receipts');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Чек не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Чек успішно видалений',
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні чека' },
      { status: 500 }
    );
  }
}
