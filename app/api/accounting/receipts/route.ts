import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ReceiptRow } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ReceiptRow>('receipts');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const receipts = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: receipts,
      count: receipts.length,
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні чеків' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const newReceipt: ReceiptRow = {
      id: `receipt-${Date.now()}`,
      waiter,
      openedAt: openedAt || new Date().toISOString(),
      closedAt: closedAt || null,
      paid: paid || 0,
      discount: discount || 0,
      profit: profit || 0,
      status: status || 'open',
      risk: '',
    };

    await collection.insertOne(newReceipt as any);

    return NextResponse.json(
      { success: true, data: newReceipt, message: 'Чек успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні чека' },
      { status: 500 }
    );
  }
}
