import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SalaryRow } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<SalaryRow>('salary');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const salaries = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: salaries,
      count: salaries.length,
    });
  } catch (error) {
    console.error('Error fetching salary:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні зарплати' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<SalaryRow>('salary');

    const body = await request.json();
    const { employee, position, salary, bonus, fine, toPay, status } = body;

    if (!employee || !position) {
      return NextResponse.json(
        { success: false, error: 'Працівник та посада обов\'язкові' },
        { status: 400 }
      );
    }

    const newSalary: SalaryRow = {
      id: `salary-${Date.now()}`,
      employee,
      position,
      salary: salary || 0,
      bonus: bonus || 0,
      fine: fine || 0,
      toPay: toPay || salary || 0,
      status: status || 'pending',
    };

    await collection.insertOne(newSalary as any);

    return NextResponse.json(
      { success: true, data: newSalary, message: 'Запис зарплати успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating salary:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні запису зарплати' },
      { status: 500 }
    );
  }
}
