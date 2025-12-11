import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { CashShift } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<CashShift>('cashShifts');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const shifts = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: shifts,
      count: shifts.length,
    });
  } catch (error) {
    console.error('Error fetching cash shifts:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні касових змін' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<CashShift>('cashShifts');

    const body = await request.json();
    const { cashier, openedAt, closedAt, openingBalance, closingBalance, status, register, date, cash, cashless, difference } = body;

    if (!cashier) {
      return NextResponse.json(
        { success: false, error: 'Касир обов\'язковий' },
        { status: 400 }
      );
    }

    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      cashier,
      openedAt: openedAt || new Date().toISOString(),
      closedAt: closedAt || null,
      openingBalance: openingBalance || 0,
      closingBalance: closingBalance || 0,
      status: status || 'open',
      register: register || 'register-1',
      date: date || new Date().toISOString(),
      cash: cash || 0,
      cashless: cashless || 0,
      difference: difference || 0,
    };

    await collection.insertOne(newShift as any);

    return NextResponse.json(
      { success: true, data: newShift, message: 'Касова зміна успішно створена' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating cash shift:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні касової зміни' },
      { status: 500 }
    );
  }
}
