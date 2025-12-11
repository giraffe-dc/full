import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ClientRow } from '@/types/accounting';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ClientRow>('clients');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const clients = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length,
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні клієнтів' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ClientRow>('clients');

    const body = await request.json();
    const { name, phone, email, address, status, noDiscount, cash, card, profit, receipts, avgCheck } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Назва клієнта обов\'язкова' },
        { status: 400 }
      );
    }

    const newClient: ClientRow = {
      id: `client-${Date.now()}`,
      name,
      email,
      phone,
      address,
      noDiscount,
      cash,
      card,
      profit,
      receipts,
      avgCheck,
      status,
    };

    const result = await collection.insertOne(newClient as any);

    return NextResponse.json(
      { success: true, data: newClient, message: 'Клієнт успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні клієнта' },
      { status: 500 }
    );
  }
}
