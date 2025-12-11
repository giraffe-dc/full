import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SalaryRow } from '@/types/accounting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<SalaryRow>('salary');

    const result = await collection.findOne({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Запис зарплати не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching salary:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні запису зарплати' },
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
    const collection = db.collection<SalaryRow>('salary');

    const body = await request.json();
    const { employee, position, salary, bonus, fine, toPay, status } = body;

    if (!employee || !position) {
      return NextResponse.json(
        { success: false, error: 'Працівник та посада обов\'язкові' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          employee,
          position,
          salary: salary || 0,
          bonus: bonus || 0,
          fine: fine || 0,
          toPay: toPay || salary || 0,
          status: status || 'pending',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Запис зарплати не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Запис зарплати успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating salary:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні запису зарплати' },
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
    const collection = db.collection<SalaryRow>('salary');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Запис зарплати не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Запис зарплати успішно видалений',
    });
  } catch (error) {
    console.error('Error deleting salary:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні запису зарплати' },
      { status: 500 }
    );
  }
}
