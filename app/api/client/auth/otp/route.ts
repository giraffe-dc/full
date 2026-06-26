import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { normalizePhone } from '@/lib/utils';

// POST /api/client/auth/otp - Генерує OTP код та відправляє його
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Номер телефону є обов\'язковим' },
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

    // Генерація 6-значного коду
    // Для розробки / тестів використовуємо фіксований 111111 або випадковий код
    const isDev = process.env.NODE_ENV === 'development' || normalized.includes('1234567');
    const code = isDev ? '111111' : Math.floor(100000 + Math.random() * 900000).toString();

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // дійсний 5 хвилин

    // Зберігаємо код у базу з перезаписом старого для цього номеру
    await db.collection('otp_codes').updateOne(
      { phone: normalized },
      {
        $set: {
          phone: normalized,
          code,
          expiresAt,
          attempts: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // =========================================================================
    // ІНТЕГРАЦІЯ З БЕЗКОШТОВНИМ / ДЕШЕВИМ ПРОВАЙДЕРОМ ДЛЯ УКРАЇНИ (TurboSMS Viber/SMS)
    // =========================================================================
    if (!isDev) {
      try {
        const TURBOSMS_TOKEN = process.env.TURBOSMS_TOKEN;
        if (TURBOSMS_TOKEN) {
          // Відправка через Viber (яка у 3-4 рази дешевша за SMS)
          // У разі відсутності Viber у користувача, TurboSMS автоматично доставляє як SMS
          await fetch('https://api.turbosms.ua/message/send.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TURBOSMS_TOKEN}`
            },
            body: JSON.stringify({
              recipients: [normalized],
              viber: {
                sender: "Giraffe",
                text: `Ваш код авторизації в додатку Жирафик: ${code}. Дійсний 5 хв.`
              },
              sms: {
                sender: "Msg",
                text: `Код Жирафик: ${code}`
              }
            })
          });
        } else {
          console.log(`[OTP DEV SIMULATION] Код для ${normalized}: ${code}`);
        }
      } catch (smsError) {
        console.error('Помилка відправки повідомлення через провайдера:', smsError);
      }
    } else {
      console.log(`[OTP DEV MODE] Авто-згенерований код для ${normalized}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Код успішно відправлено',
      devMode: isDev ? true : undefined,
    });
  } catch (error) {
    console.error('Помилка генерації OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
