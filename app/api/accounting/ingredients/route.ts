import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuIngredient } from '@/types/accounting';

// GET /api/accounting/ingredients - отримати всі інгредієнти
export async function GET(request: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const collection = db.collection<MenuIngredient>('ingredients');

        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        // За замовчуванням показуємо тільки активні
        const filter: any = { status: status || 'active' };

        if (category) {
            filter.category = category;
        }

        const ingredientsData = await collection.find(filter).toArray();
        const ingredients = ingredientsData.map(p => ({
            ...p,
            id: p.id || p._id.toString()
        }));

        return NextResponse.json({
            success: true,
            data: ingredients,
            count: ingredients.length,
        });
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        return NextResponse.json(
            { success: false, error: 'Помилка при отриманні інгредієнтів' },
            { status: 500 }
        );
    }
}

// POST /api/accounting/ingredients - створити новий інгредієнт
export async function POST(request: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db('giraffe');
        const collection = db.collection<MenuIngredient>('ingredients');

        const body = await request.json();
        const { code, name, category, unit, costPerUnit, status } = body;

        // Валідація
        if (!name || !category) {
            return NextResponse.json(
                { success: false, error: 'Назва та категорія обов\'язкові' },
                { status: 400 }
            );
        }

        // Auto-increment code if not provided
        let generatedCode = '';
        if (!code) {
            try {
                const maxCodeDoc = await collection.aggregate([
                    {
                        $match: {
                            code: { $regex: /^\d+$/ } // Match only numeric codes
                        }
                    },
                    {
                        $project: {
                            codeInt: { $toInt: "$code" }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            max: { $max: "$codeInt" }
                        }
                    }
                ]).next();

                const maxCode = maxCodeDoc ? maxCodeDoc.max : 0;
                generatedCode = (maxCode + 1).toString();
            } catch (e) {
                console.error("Error calculating max code:", e);
            }
        }

        const newIngredient: MenuIngredient = {
            id: `ingredient-${Date.now()}`,
            code: code || generatedCode || '',
            name,
            category,
            unit: unit || 'kg',
            costPerUnit: costPerUnit || 0,
            status: status || 'active',
        };

        await collection.insertOne(newIngredient as any);

        return NextResponse.json(
            { success: true, data: newIngredient, message: 'Інгредієнт успішно створений' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating ingredient:', error);
        return NextResponse.json(
            { success: false, error: 'Помилка при створенні інгредієнта' },
            { status: 500 }
        );
    }
}
