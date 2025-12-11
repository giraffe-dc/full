import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ProductCategory } from '@/types/accounting';

// GET /api/accounting/categories - отримати всі категорії
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ProductCategory>('categories');

    const searchParams = request.nextUrl.searchParams;
    const parentCategory = searchParams.get('parentCategory');
    const status = searchParams.get('status');

    const filter: any = {};
    if (parentCategory !== null) {
      filter.parentCategory = parentCategory || undefined;
    }
    if (status) {
      filter.status = status;
    }

    const categories = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні категорій' },
      { status: 500 }
    );
  }
}

// POST /api/accounting/categories - створити нову категорію
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ProductCategory>('categories');

    const body = await request.json();
    const { name, parentCategory, description, status } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Назва категорії обов\'язкова' },
        { status: 400 }
      );
    }

    const newCategory: ProductCategory = {
      id: `category-${Date.now()}`,
      name,
      parentCategory: parentCategory || undefined,
      description: description || '',
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    await collection.insertOne(newCategory as any);

    return NextResponse.json(
      { success: true, data: newCategory, message: 'Категорія успішно створена' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні категорії' },
      { status: 500 }
    );
  }
}
