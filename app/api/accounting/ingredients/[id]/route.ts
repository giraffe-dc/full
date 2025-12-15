import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { MenuIngredient } from '@/types/accounting';
import { ObjectId } from 'mongodb';

// GET /api/accounting/ingredients/[id] - отримати інгредієнт за ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await clientPromise;
        const db = client.db('giraffe');
        const collection = db.collection<MenuIngredient>('ingredients');

        let query: any = { id: id };
        if (ObjectId.isValid(id)) {
            query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
        }

        const ingredient = await collection.findOne(query);

        if (!ingredient) {
            return NextResponse.json(
                { success: false, error: 'Інгредієнт не знайдений' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: ingredient });
    } catch (error) {
        console.error('Error fetching ingredient:', error);
        return NextResponse.json(
            { success: false, error: 'Помилка при отриманні інгредієнта' },
            { status: 500 }
        );
    }
}

// PUT /api/accounting/ingredients/[id] - оновити інгредієнт
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await clientPromise;
        const db = client.db('giraffe');
        const collection = db.collection<MenuIngredient>('ingredients');

        const body = await request.json();
        const { code, name, category, unit, costPerUnit, status } = body;

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
                    unit,
                    costPerUnit: costPerUnit ?? 0,
                    status: status ?? 'active',
                },
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Інгредієнт не знайдений' },
                { status: 404 }
            );
        }

        const updated = await collection.findOne({ id });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Інгредієнт успішно оновлений',
        });
    } catch (error) {
        console.error('Error updating ingredient:', error);
        return NextResponse.json(
            { success: false, error: 'Помилка при оновленні інгредієнта' },
            { status: 500 }
        );
    }
}

// DELETE /api/accounting/ingredients/[id] - видалити інгредієнт
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await clientPromise;
        const db = client.db('giraffe');
        const collection = db.collection<MenuIngredient>('ingredients');

        let query: any = { id };
        if (ObjectId.isValid(id)) {
            query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
        }

        // Soft delete
        const result = await collection.updateOne(
            query,
            { $set: { status: 'inactive' } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Інгредієнт не знайдений' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Інгредієнт успішно переміщено в кошик',
        });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return NextResponse.json(
            { success: false, error: 'Помилка при видаленні інгредієнта' },
            { status: 500 }
        );
    }
}
