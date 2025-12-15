import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuProduct } from '@/types/accounting';
import { ObjectId } from 'mongodb';

// GET /api/accounting/products/[id] - отримати товар за ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuProduct>('products');

    let query: any = { id: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    const product = await collection.findOne(query);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Товар не знайдений' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні товару' },
      { status: 500 }
    );
  }
}

// PUT /api/accounting/products/[id] - оновити товар
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuProduct>('products');

    const body = await request.json();
    const { code, name, category, costPerUnit, sellingPrice, markup, status } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Назва та категорія обов\'язкові' },
        { status: 400 }
      );
    }

    let query: any = { id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    const result = await collection.updateOne(
      query,
      {
        $set: {
          code,
          name,
          category,
          costPerUnit: costPerUnit ?? 0,
          sellingPrice: sellingPrice ?? 0,
          markup: markup ?? 0,
          status: status ?? 'active',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Товар не знайдений' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Товар успішно оновлений',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні товару' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounting/products/[id] - видалити товар
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuProduct>('products');

    let query: any = { id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }

    // Soft delete instead of remove
    const result = await collection.updateOne(
      query,
      { $set: { status: 'inactive' } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Товар не знайдений' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Товар успішно переміщено в кошик',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні товару' },
      { status: 500 }
    );
  }
}
