import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { normalizePhone } from '@/lib/utils';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// POST /api/client/auth/verify - Верифікує OTP та створює/повертає профіль
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: 'Телефон та код є обов\'язковими' },
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

    // 1. Знаходимо OTP запис
    const otpRecord = await db.collection('otp_codes').findOne({ phone: normalized });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'Код не знайдено. Будь ласка, надішліть код знову' },
        { status: 400 }
      );
    }

    // 2. Перевірка ліміту спроб
    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { success: false, error: 'Перевищено кількість спроб. Отримайте новий код' },
        { status: 400 }
      );
    }

    // 3. Перевірка терміну дії коду
    const now = new Date();
    if (now > new Date(otpRecord.expiresAt)) {
      return NextResponse.json(
        { success: false, error: 'Термін дії коду закінчився. Отримайте новий код' },
        { status: 400 }
      );
    }

    // 4. Перевірка самого коду
    if (otpRecord.code !== code) {
      // Збільшуємо кількість спроб
      await db.collection('otp_codes').updateOne(
        { phone: normalized },
        { $inc: { attempts: 1 } }
      );

      return NextResponse.json(
        { success: false, error: 'Невірний код авторизації' },
        { status: 400 }
      );
    }

    // 5. Код успішний - видаляємо OTP запис, щоб не використати повторно
    await db.collection('otp_codes').deleteOne({ phone: normalized });

    // 6. Отримуємо або створюємо профайл клієнта (батька)
    let user = await db.collection('clients').findOne({ phone: normalized });

    if (!user) {
      const nowString = new Date().toISOString();
      const newUser = {
        name: 'Новий користувач',
        phone: normalized,
        email: '',
        role: 'client',
        children: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('clients').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // 7. Створення JWT токена
    const token = jwt.sign(
      {
        id: user._id.toString(),
        phone: user.phone,
        role: user.role || 'client',
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' } // клієнт залишається залогіненим 30 днів
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
    console.error('Помилка верифікації OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
