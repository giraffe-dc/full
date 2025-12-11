import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuRecipe } from '@/types/accounting';

// GET /api/accounting/recipes - отримати всі тех. картки
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection<MenuRecipe>('recipes');

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

    const recipes = await collection.find(filter).toArray();

    return NextResponse.json({
      success: true,
      data: recipes,
      count: recipes.length,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні тех. карток' },
      { status: 500 }
    );
  }
}

// POST /api/accounting/recipes - створити нову тех. картку
export async function POST(request: NextRequest) {
  try {
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

    const newRecipe: MenuRecipe = {
      id: `recipe-${Date.now()}`,
      code: code || '',
      name,
      category,
      yield: yieldValue || 0,
      yieldUnit: yieldUnit || 'г',
      costPerUnit: costPerUnit || 0,
      sellingPrice: sellingPrice || 0,
      markup: markup || 0,
      ingredients: ingredients || [],
      notes: notes || '',
      lastModified: new Date().toISOString(),
      modifiedBy: 'Current User',
      status: status || 'active',
    };

    await collection.insertOne(newRecipe as any);

    return NextResponse.json(
      { success: true, data: newRecipe, message: 'Тех. картка успішно створена' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні тех. картки' },
      { status: 500 }
    );
  }
}
