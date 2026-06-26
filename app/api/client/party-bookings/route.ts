import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Тарифи на бекенді для захисту від маніпуляцій на клієнті
const PRICING = {
  formats: {
    birthday: { name: 'День народження', basePrice: 2500, maxGuests: 10 },
    kindergarten_graduation: { name: 'Випускний садочку', basePrice: 4000, maxGuests: 20 },
    school_graduation: { name: 'Випускний 4 класу', basePrice: 4500, maxGuests: 25 },
    themed_party: { name: 'Тематична вечірка', basePrice: 3000, maxGuests: 12 },
  },
  themes: {
    'Marvel': { price: 0 },
    'Stitch': { price: 0 },
    'Stranger Things': { price: 500 },
    'Pajama Party': { price: 700 },
    'Minecraft': { price: 0 },
  },
  addons: {
    cryo_show: { name: 'Кріо-Шоу з морозивом', price: 1500 },
    neon_show: { name: 'Неонове стрічкове шоу', price: 2000 },
    bubble_show: { name: 'Шоу мильних бульбашок', price: 1200 },
    paper_show: { name: 'Паперове божевілля', price: 1800 },
  },
  extraChildFee: 200,
};

function calculatePriceOnBackend(data: any) {
  const formatConfig = PRICING.formats[data.format as keyof typeof PRICING.formats] || PRICING.formats.birthday;
  let total = formatConfig.basePrice;

  // 1. Додаткові гості
  const childrenCount = data.guestsCount?.children || 0;
  if (childrenCount > formatConfig.maxGuests) {
    total += (childrenCount - formatConfig.maxGuests) * PRICING.extraChildFee;
  }

  // 2. Преміум теми
  const themeConfig = PRICING.themes[data.theme as keyof typeof PRICING.themes];
  if (themeConfig) {
    total += themeConfig.price;
  }

  // 3. Шоу-програми
  const addons = data.addons || [];
  addons.forEach((addon: string) => {
    const addonConfig = PRICING.addons[addon as keyof typeof PRICING.addons];
    if (addonConfig) {
      total += addonConfig.price;
    }
  });

  return total;
}

// POST /api/client/party-bookings - Створює бронювання
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
    const { format, childName, childAge, date, time, guestsCount, theme, addons, notes } = body;
    const childrenCount = Number(guestsCount?.children) || 0;

    // Валідація обов'язкових полів
    if (!format || !childName || !date || !time || !theme) {
      return NextResponse.json(
        { success: false, error: 'Заповніть всі обов\'язкові поля' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Отримуємо актуальні дані клієнта
    const parentProfile = await db.collection('clients').findOne({ _id: new ObjectId(decoded.id) });
    if (!parentProfile) {
      return NextResponse.json(
        { success: false, error: 'Профіль клієнта не знайдено' },
        { status: 404 }
      );
    }

    // Розрахунок підсумкової вартості
    const calculatedPrice = calculatePriceOnBackend({
      format,
      guestsCount,
      theme,
      addons,
    });

    const bookingId = `pb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newBooking = {
      id: bookingId,
      clientId: parentProfile._id.toString(),
      clientName: parentProfile.name,
      clientPhone: parentProfile.phone,
      format,
      childName,
      childAge: Number(childAge) || 6,
      date,
      time,
      guestsCount: {
        children: Number(guestsCount?.children) || 5,
        adults: Number(guestsCount?.adults) || 2,
      },
      theme,
      addons: addons || [],
      notes: notes || '',
      totalPrice: calculatedPrice,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Зберігаємо в колекцію party_bookings
    await db.collection('party_bookings').insertOne(newBooking);

    // 2. ІНТЕГРАЦІЯ З ЄДИНОЮ БАЗОЮ (Створення івенту для адмін-панелі)
    // Додаємо запис у спільну колекцію events, щоб адміністратор відразу бачив свято у своєму календарі!
    const formatName = PRICING.formats[format as keyof typeof PRICING.formats]?.name || 'Свято';
    const newEvent = {
      id: `evt_${Date.now()}`,
      title: `${formatName}: ${childName} (${childAge} р.)`,
      eventType: format === 'birthday' ? 'birthday' : 'graduation',
      status: 'draft', // Статус чернетки для перевірки адміністратором
      clientId: parentProfile._id.toString(),
      clientName: parentProfile.name,
      clientPhone: parentProfile.phone,
      date,
      startTime: time,
      endTime: time, // Адміністратор призначить точний час завершення
      duration: 120, // Стандартно 2 години
      childGuests: Number(guestsCount?.children) || 5,
      adultGuests: Number(guestsCount?.adults) || 2,
      totalGuests: (Number(guestsCount?.children) || 5) + (Number(guestsCount?.adults) || 2),
      packageName: `${formatName} - Тема: ${theme}`,
      customServices: (addons || []).map((addonKey: string) => {
        const ad = PRICING.addons[addonKey as keyof typeof PRICING.addons];
        return {
          id: addonKey,
          name: ad?.name || addonKey,
          category: 'animation',
          quantity: 1,
          unitPrice: ad?.price || 0,
          total: ad?.price || 0,
        };
      }),
      basePrice: PRICING.formats[format as keyof typeof PRICING.formats]?.basePrice || 0,
      additionalServicesTotal: (addons || []).reduce((acc: number, addonKey: string) => acc + (PRICING.addons[addonKey as keyof typeof PRICING.addons]?.price || 0), 0),
      extraGuestsTotal: childrenCount > (PRICING.formats[format as keyof typeof PRICING.formats]?.maxGuests || 10) 
        ? (childrenCount - (PRICING.formats[format as keyof typeof PRICING.formats]?.maxGuests || 10)) * PRICING.extraChildFee
        : 0,
      subtotal: calculatedPrice,
      discount: 0,
      total: calculatedPrice,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      clientNotes: notes || '',
      internalNotes: `Мобільне бронювання конструктора свят. ID: ${bookingId}`,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('events').insertOne(newEvent);

    return NextResponse.json(
      { success: true, booking: newBooking },
      { status: 201 }
    );
  } catch (error) {
    console.error('Помилка створення бронювання свят:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}

// GET /api/client/party-bookings - Повертає список бронювань авторизованого клієнта
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

    const bookings = await db
      .collection('party_bookings')
      .find({ clientId: decoded.id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: bookings.map((b) => ({ ...b, _id: b._id.toString() })),
    });
  } catch (error) {
    console.error('Помилка отримання списку бронювань:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
