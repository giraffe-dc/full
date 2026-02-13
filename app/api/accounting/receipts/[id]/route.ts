import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ReceiptRow } from '@/types/accounting';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ReceiptRow>('receipts');

    const result = await collection.findOne({ id });

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
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const collection = db.collection<ReceiptRow>('receipts');

        // 1. Find the receipt to get its ID (if needed, but we have it from params as 'id')
        // Actually, some routes use _id (ObjectId) and some use 'id' (string). 
        // Let's find by both to be safe.
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
        const receipt = await collection.findOne(query, { session });

        if (!receipt) {
          throw new Error('Чек не знайдений');
        }

        const receiptOid = receipt._id;

        // 2. Find and Revert Stock Movements
        const { revertBalances } = await import('@/lib/stock-utils');
        const movements = await db.collection("stock_movements").find({
          referenceId: receiptOid,
          isDeleted: { $ne: true }
        }, { session }).toArray();

        for (const move of movements) {
          await revertBalances(db, move, session);
          await db.collection("stock_movements").updateOne(
            { _id: move._id },
            { $set: { isDeleted: true, updatedAt: new Date() } },
            { session }
          );
        }

        // 3. Delete Receipt
        const result = await collection.deleteOne(query, { session });
        if (result.deletedCount === 0) {
          throw new Error('Помилка при видаленні чека');
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Чек успішно видалений, товар повернуто на склад',
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні чека' },
      { status: 500 }
    );
  }
}
