import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ClientRow } from '@/types/accounting';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ClientRow>('clients');

    const result = await collection.findOne({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Клієнт не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні клієнта' },
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
    const collection = db.collection<ClientRow>('clients');

    const body = await request.json();
    const { name, phone, email, address, status } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Назва клієнта обов\'язкова' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          name,
          phone: phone || '',
          email: email || '',
          address: address || '',
          status: status || 'active',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Клієнт не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Клієнт успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні клієнта' },
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
    const collection = db.collection<ClientRow>('clients');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Клієнт не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Клієнт успішно видалений',
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні клієнта' },
      { status: 500 }
    );
  }
}
