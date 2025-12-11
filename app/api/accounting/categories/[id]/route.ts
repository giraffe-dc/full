import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ProductCategory } from '@/types/accounting';

// GET /api/accounting/categories/[id] - отримати категорію за ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ProductCategory>('categories');

    const category = await collection.findOne({ id });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Категорія не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні категорії' },
      { status: 500 }
    );
  }
}

// PUT /api/accounting/categories/[id] - оновити категорію
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          name,
          parentCategory: parentCategory ?? undefined,
          description: description ?? '',
          status: status ?? 'active',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Категорія не знайдена' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Категорія успішно оновлена',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні категорії' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounting/categories/[id] - видалити категорію
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<ProductCategory>('categories');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Категорія не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Категорія успішно видалена',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні категорії' },
      { status: 500 }
    );
  }
}
