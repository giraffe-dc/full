import { NextRequest, NextResponse } from 'next/server';
import {
  createResource,
  findAllResources,
  findAvailableResources,
  checkResourceAvailability,
} from '@/lib/models/Resource';

// GET /api/events/resources - List all resources
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    
    const resources = await findAllResources(type);
    
    return NextResponse.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST /api/events/resources - Create new resource
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'type'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Validate type
    const validTypes = ['room', 'animator', 'equipment', 'other'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid resource type' },
        { status: 400 }
      );
    }
    
    // Set defaults
    body.status = body.status || 'available';
    
    const resource = await createResource(body);
    
    return NextResponse.json({
      success: true,
      data: resource,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
