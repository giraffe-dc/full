import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuProduct } from '@/types/accounting';

// GET /api/accounting/products - отримати всі товари
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuProduct>('products');

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    }

    const products = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні товарів' },
      { status: 500 }
    );
  }
}

// POST /api/accounting/products - створити новий товар
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuProduct>('products');

    const body = await request.json();
    const { code, name, category, costPerUnit, sellingPrice, markup, status } = body;

    // Валідація
    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Назва та категорія обов\'язкові' },
        { status: 400 }
      );
    }

    const newProduct: MenuProduct = {
      id: `product-${Date.now()}`,
      code: code || '',
      name,
      category,
      costPerUnit: costPerUnit || 0,
      sellingPrice: sellingPrice || 0,
      markup: markup || 0,
      status: status || 'active',
    };

    await collection.insertOne(newProduct as any);

    return NextResponse.json(
      { success: true, data: newProduct, message: 'Товар успішно створений' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні товару' },
      { status: 500 }
    );
  }
}

// Оновлення та видалення товарів реалізовані в маршруті /api/accounting/products/[id]