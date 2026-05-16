import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/certificates/templates - List templates
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const templates = await db.collection('certificate_templates')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formattedTemplates = templates.map(t => ({
      ...t,
      id: t._id.toString()
    }));

    return NextResponse.json({ success: true, data: formattedTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/certificates/templates - Create a template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.type) {
      return NextResponse.json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const newTemplate = {
      ...body,
      createdAt: new Date().toISOString(),
    };
    delete newTemplate._id;
    delete newTemplate.id;

    const result = await db.collection('certificate_templates').insertOne(newTemplate);

    return NextResponse.json({
      success: true,
      data: { ...newTemplate, id: result.insertedId.toString() }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 });
  }
}
