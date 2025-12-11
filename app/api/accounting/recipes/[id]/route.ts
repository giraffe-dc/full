import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuRecipe } from '@/types/accounting';

// GET /api/accounting/recipes/[id] - отримати тех. картку за ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuRecipe>('recipes');

    const recipe = await collection.findOne({ id });

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Тех. картка не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні тех. картки' },
      { status: 500 }
    );
  }
}

// PUT /api/accounting/recipes/[id] - оновити тех. картку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuRecipe>('recipes');

    const body = await request.json();
    const {
      code,
      name,
      category,
      yield: yieldValue,
      yieldUnit,
      costPerUnit,
      sellingPrice,
      markup,
      ingredients,
      notes,
      status,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Назва та категорія обов\'язкові' },
        { status: 400 }
      );
    }

    const result = await collection.updateOne(
      { id },
      {
        $set: {
          code,
          name,
          category,
          yield: yieldValue ?? 0,
          yieldUnit: yieldUnit ?? 'г',
          costPerUnit: costPerUnit ?? 0,
          sellingPrice: sellingPrice ?? 0,
          markup: markup ?? 0,
          ingredients: ingredients ?? [],
          notes: notes ?? '',
          lastModified: new Date().toISOString(),
          modifiedBy: 'Current User',
          status: status ?? 'active',
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Тех. картка не знайдена' },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Тех. картка успішно оновлена',
    });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при оновленні тех. картки' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounting/recipes/[id] - видалити тех. картку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuRecipe>('recipes');

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Тех. картка не знайдена' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Тех. картка успішно видалена',
    });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при видаленні тех. картки' },
      { status: 500 }
    );
  }
}
