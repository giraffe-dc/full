import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { PaymentRow } from '@/types/accounting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<PaymentRow>('payments');

    const result = await collection.findOne({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Платіж не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні платежу' },
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
    const collection = db.collection<PaymentRow>('payments');

    const body = await request.json();
    const { method, amount, date, status } = body;

    if (!method || !amount) {
      return NextResponse.json(
        { success: false, error: 'Метод та сума обов\'язкові' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          method,
          amount,
          date: date || new Date().toISOString(),
          status: status || 'completed',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Платіж не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Платіж успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні платежу' },
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
    const collection = db.collection<PaymentRow>('payments');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Платіж не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Платіж успішно видалений',
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні платежу' },
      { status: 500 }
    );
  }
}
