import { NextRequest, NextResponse } from 'next/server';
import {
  findPackageById,
  updatePackage,
  deletePackage,
} from '@/lib/models/EventPackage';

// GET /api/events/packages/[id] - Get single package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const pkg = await findPackageById(id);
    
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

// PUT /api/events/packages/[id] - Update package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if package exists
    const existingPkg = await findPackageById(id);
    if (!existingPkg) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }
    
    // Validate price if provided
    if (body.basePrice !== undefined && body.basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Base price must be non-negative' },
        { status: 400 }
      );
    }
    
    // Validate duration if provided
    if (body.duration !== undefined && body.duration <= 0) {
      return NextResponse.json(
        { success: false, error: 'Duration must be positive' },
        { status: 400 }
      );
    }
    
    const pkg = await updatePackage(id, body);
    
    return NextResponse.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update package' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/packages/[id] - Delete package (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if package exists
    const existingPkg = await findPackageById(id);
    if (!existingPkg) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }
    
    // Soft delete - set status to inactive
    await deletePackage(id);
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}
