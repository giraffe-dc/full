import { NextRequest, NextResponse } from 'next/server';
import {
  createEventPackage,
  findAllPackages,
  findActivePackages,
} from '@/lib/models/EventPackage';

// GET /api/events/packages - List all packages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'inactive' | undefined;
    
    let packages;
    if (status) {
      packages = status === 'active' ? await findActivePackages() : await findAllPackages(status);
    } else {
      packages = await findAllPackages();
    }
    
    return NextResponse.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST /api/events/packages - Create new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'basePrice', 'duration'];
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
    
    // Validate price
    if (body.basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Base price must be non-negative' },
        { status: 400 }
      );
    }
    
    // Validate duration
    if (body.duration <= 0) {
      return NextResponse.json(
        { success: false, error: 'Duration must be positive' },
        { status: 400 }
      );
    }
    
    // Set defaults
    body.status = body.status || 'active';
    body.maxGuests = body.maxGuests || 0;
    body.includedServices = body.includedServices || [];
    
    const pkg = await createEventPackage(body);
    
    return NextResponse.json({
      success: true,
      data: pkg,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create package' },
      { status: 500 }
    );
  }
}
