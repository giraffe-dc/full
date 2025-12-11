import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { StaffRow } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<StaffRow>('staff');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const staff = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: staff,
      count: staff.length,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні персоналу' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<StaffRow>('staff');

    const body = await request.json();
    const { name, position, phone, email, salary, status, receipts, avgCheck, avgTime, workedTime, revenue, profit } = body;

    if (!name || !position) {
      return NextResponse.json(
        { success: false, error: 'Назва та посада обов\'язкові' },
        { status: 400 }
      );
    }

    const newStaff: StaffRow = {
      id: `staff-${Date.now()}`,
      name,
      position,
      phone: phone || '',
      email: email || '',
      salary: salary || 0,
      status: status || 'active',
      receipts: receipts|| 0,
      avgCheck: avgCheck || 0,
      avgTime: avgTime || '',
      workedTime: workedTime || '',
      revenue: revenue || 0,
      profit: profit || 0,
    };

    await collection.insertOne(newStaff as any);

    return NextResponse.json(
      { success: true, data: newStaff, message: 'Працівник успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні працівника' },
      { status: 500 }
    );
  }
}
