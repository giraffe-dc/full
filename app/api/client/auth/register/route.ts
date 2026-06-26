import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { normalizePhone } from '@/lib/utils';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// POST /api/client/auth/register - Реєстрація нового клієнта за телефоном та паролем
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, password, email } = body;

    // Валідація вхідних даних
    if (!name || !phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Ім\'я, телефон та пароль є обов\'язковими' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Пароль має містити не менше 6 символів' },
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

    // Перевіряємо, чи існує клієнт з таким телефоном
    const existingUser = await db.collection('clients').findOne({ phone: normalized });

    let userId: string;
    let userChildren: any[] = [];
    const now = new Date();
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Якщо клієнт вже існує і має пароль, то він вже зареєстрований
      if (existingUser.password) {
        return NextResponse.json(
          { success: false, error: 'Користувач з таким номером телефону вже зареєстрований' },
          { status: 400 }
        );
      }

      // Якщо клієнт існує (наприклад, створений адміном офлайн), але не має пароля,
      // ми дозволяємо йому зареєструватися ("заявити права" на цей акаунт)
      userId = existingUser._id.toString();
      userChildren = existingUser.children || [];

      await db.collection('clients').updateOne(
        { _id: existingUser._id },
        {
          $set: {
            name: name,
            password: hashedPassword,
            email: email || existingUser.email || '',
            role: 'client',
            updatedAt: now,
          },
        }
      );
    } else {
      // Створюємо абсолютно нового клієнта
      const newUser = {
        name,
        phone: normalized,
        password: hashedPassword,
        email: email || '',
        role: 'client',
        children: [],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection('clients').insertOne(newUser);
      userId = result.insertedId.toString();
    }

    // Створюємо JWT токен
    const token = jwt.sign(
      {
        id: userId,
        phone: normalized,
        role: 'client',
        name: name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        phone: normalized,
        email: email || '',
        children: userChildren,
      },
    });
  } catch (error) {
    console.error('Помилка реєстрації клієнта:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
