import { NextRequest, NextResponse } from 'next/server';
import { updateResourceStatus } from '@/lib/models/Resource';

// PUT /api/events/resources/[id]/status - Update resource status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['available', 'booked', 'maintenance', 'inactive'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    const resource = await updateResourceStatus(id, body.status);
    
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
    console.error('Error updating resource status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update resource status' },
      { status: 500 }
    );
  }
}
