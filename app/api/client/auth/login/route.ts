import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { normalizePhone } from '@/lib/utils';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// POST /api/client/auth/login - Авторизація клієнта за телефоном та паролем
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Телефон та пароль є обов\'язковими' },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'Некоректний формат номеру телефону' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Знаходимо користувача за телефоном
    const user = await db.collection('clients').findOne({ phone: normalized });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Невірний номер телефону або пароль' },
        { status: 401 }
      );
    }

    // Перевіряємо, чи встановлений пароль для цього акаунту
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Пароль для цього акаунту ще не встановлено. Будь ласка, зареєструйтеся, щоб налаштувати пароль.',
        },
        { status: 401 }
      );
    }

    // Перевірка відповідності хешованого пароля
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Невірний номер телефону або пароль' },
        { status: 401 }
      );
    }

    // Створення JWT токена
    const token = jwt.sign(
      {
        id: user._id.toString(),
        phone: user.phone,
        role: user.role || 'client',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email || '',
        children: user.children || [],
      },
    });
  } catch (error) {
    console.error('Помилка авторизації клієнта:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
