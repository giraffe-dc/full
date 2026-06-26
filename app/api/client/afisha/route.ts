import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// GET /api/client/afisha - Повертає майбутні публічні події та майстер-класи
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Знаходимо майбутні події, що мають тип public або є відкритими майстер-класами
    // У нашому існуючому проекті це можуть бути події з eventType = 'holiday' або спеціальною ознакою
    const today = new Date().toISOString().split('T')[0];
    
    let publicEvents: any[] = await db
      .collection('events')
      .find({
        $or: [
          { eventType: 'holiday' },
          { isPublic: true },
          { category: 'masterclass' }
        ],
        date: { $gte: today },
        status: { $ne: 'cancelled' }
      })
      .sort({ date: 1, startTime: 1 })
      .toArray();

    // Якщо в базі немає публічних івентів, повертаємо якісні демонстраційні дані 
    // для плавної роботи мобільного додатку під час наповнення
    if (publicEvents.length === 0) {
      publicEvents = [
        {
          id: 'evt_demo_1',
          title: 'Майстер-клас зі створення еко-свічок 🕯️',
          description: 'Чудовий майстер-клас для дітей від 6 років. Навчимося працювати з натуральною вощиною, додавати ефірні олії та створювати власні арома-шедеври.',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // через 2 дні
          startTime: '12:00',
          endTime: '13:30',
          ageLimit: '6+',
          price: 250,
          spotsTotal: 15,
          spotsAvailable: 8,
          imageUrl: '/images/candle-making.jpg',
          category: 'masterclass',
          isPublic: true,
        },
        {
          id: 'evt_demo_2',
          title: 'Творчий Декупаж дерев\'яних фігурок 🎨',
          description: 'Розвиваємо дрібну моторику та творчу уяву. Кожна дитина прикрасить дерев\'яного жирафика за допомогою техніки декупаж і забере додому.',
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // через 5 днів
          startTime: '15:00',
          endTime: '16:30',
          ageLimit: '5+',
          price: 200,
          spotsTotal: 12,
          spotsAvailable: 5,
          imageUrl: '/images/decoupage.jpg',
          category: 'masterclass',
          isPublic: true,
        },
        {
          id: 'evt_demo_3',
          title: 'Гранд-Шоу Мильних Бульбашок 🫧',
          description: 'Гігантські мильні бульбашки, трюки з вогнем і димом, а наприкінці — занурення кожної дитини в мега-бульбашку для яскравого фото!',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // через 7 днів
          startTime: '17:00',
          endTime: '18:00',
          ageLimit: '3+',
          price: 300,
          spotsTotal: 30,
          spotsAvailable: 22,
          imageUrl: '/images/bubbles-show.jpg',
          category: 'holiday',
          isPublic: true,
        }
      ];
    }

    return NextResponse.json({
      success: true,
      data: publicEvents.map((e) => ({
        id: e.id || e._id?.toString(),
        title: e.title,
        description: e.description || e.clientNotes || '',
        date: e.date,
        time: e.startTime,
        ageLimit: e.ageLimit || '4+',
        price: e.price || e.total || 0,
        spotsTotal: e.spotsTotal || 15,
        spotsAvailable: e.spotsAvailable || 10,
        imageUrl: e.imageUrl || '',
      })),
    });
  } catch (error) {
    console.error('Помилка завантаження афіші:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/client/afisha/register - Бронювання місця на майстер-клас
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
    const { eventId, childName, spotsCount } = body;

    if (!eventId || !childName) {
      return NextResponse.json(
        { success: false, error: 'Вкажіть ідентифікатор події та ім\'я дитини' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Перевіряємо профіль батька
    const parentProfile = await db.collection('clients').findOne({ _id: new ObjectId(decoded.id) });
    if (!parentProfile) {
      return NextResponse.json(
        { success: false, error: 'Профіль батьків не знайдено' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const registrationId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRegistration = {
      id: registrationId,
      eventId,
      clientId: decoded.id,
      clientName: parentProfile.name,
      clientPhone: parentProfile.phone,
      childName,
      spotsCount: Number(spotsCount) || 1,
      status: 'booked',
      createdAt: now,
    };

    // 1. Записуємо реєстрацію
    await db.collection('event_registrations').insertOne(newRegistration);

    // 2. Зменшуємо кількість доступних місць на івенті, якщо івент існує в базі
    await db.collection('events').updateOne(
      { $or: [{ id: eventId }, { _id: eventId }] },
      { $inc: { spotsAvailable: -(Number(spotsCount) || 1) } }
    );

    return NextResponse.json({
      success: true,
      message: 'Ви успішно зареєструвалися на майстер-клас! Чекаємо на вас.',
      registration: newRegistration,
    });
  } catch (error) {
    console.error('Помилка реєстрації на подію:', error);
    return NextResponse.json(
      { success: false, error: 'Внутрішня помилка сервера' },
      { status: 500 }
    );
  }
}
