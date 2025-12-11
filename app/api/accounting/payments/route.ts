import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { PaymentRow } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<PaymentRow>('payments');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const payments = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні платежів' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<PaymentRow>('payments');

    const body = await request.json();
    const { method, amount, date, status, receiptsCount, cash, card, total } = body;

    if (!method || !amount) {
      return NextResponse.json(
        { success: false, error: 'Метод та сума обов\'язкові' },
        { status: 400 }
      );
    }

    const newPayment: PaymentRow = {
      id: `payment-${Date.now()}`,
      method,
      amount,
      date: date || new Date().toISOString(),
      status: status || 'completed',
      receiptsCount: receiptsCount || 0,
      cash: cash || 0,
      card: card || 0,
      total: total || 0,
    };

    await collection.insertOne(newPayment as any);

    return NextResponse.json(
      { success: true, data: newPayment, message: 'Платіж успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні платежу' },
      { status: 500 }
    );
  }
}
