import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// POST /api/client/escort - Створити новий запит на супровід дитини
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const decoded = verifyToken(token || '');

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Неавторизований доступ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { childId, childName, pickupAddress, date, time, notes } = body;

    if (!childName || !pickupAddress || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Вкажіть ім\'я дитини, адресу забору, дату та час' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const now = new Date().toISOString();
    const escortRequestId = `esc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRequest = {
      id: escortRequestId,
      clientId: decoded.id,
      childId: childId || `child_${Date.now()}`,
      childName,
      pickupAddress,
      destination: 'Центр Жирафик',
      date,
      time,
      notes: notes || '',
      status: 'pending',
      escortName: '', // Буде призначено адміністратором
      escortPhone: '', // Буде призначено адміністратором
      statusHistory: [
        { status: 'pending', updatedAt: now, note: 'Заявку створено батьками' }
      ],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('escort_requests').insertOne(newRequest);

    return NextResponse.json(
      { success: true, escortRequest: newRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('Помилка створення супроводу дитини:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}

// GET /api/client/escort - Повертає всі активні супроводи батька
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const decoded = verifyToken(token || '');

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Неавторизований доступ' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Отримуємо супроводи клієнта, відсортовані від найновіших
    const requests = await db
      .collection('escort_requests')
      .find({ clientId: decoded.id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: requests.map((r) => ({ ...r, _id: r._id.toString() })),
    });
  } catch (error) {
    console.error('Помилка отримання списку супроводів:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
