import { NextRequest, NextResponse } from 'next/server';
import {
  findResourceById,
  updateResource,
  deleteResource,
  updateResourceStatus,
} from '@/lib/models/Resource';

// GET /api/events/resources/[id] - Get single resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const resource = await findResourceById(id);
    
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

// PUT /api/events/resources/[id] - Update resource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if resource exists
    const existingResource = await findResourceById(id);
    if (!existingResource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    
    // Validate type if provided
    const validTypes = ['room', 'animator', 'equipment', 'other'];
    if (body.type && !validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid resource type' },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    const validStatuses = ['available', 'booked', 'maintenance', 'inactive'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid resource status' },
        { status: 400 }
      );
    }
    
    const resource = await updateResource(id, body);
    
    return NextResponse.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/resources/[id] - Delete resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if resource exists
    const existingResource = await findResourceById(id);
    if (!existingResource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }
    
    await deleteResource(id);
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}
