import { NextRequest, NextResponse } from 'next/server';
import {
  findAvailableResources,
  checkResourceAvailability,
  findAllResources,
} from '@/lib/models/Resource';

// GET /api/events/resources/availability - Check resource availability
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const resourceId = searchParams.get('resourceId') || undefined;
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const type = searchParams.get('type') || undefined;
    
    // Validate required params for single resource check
    if (resourceId && (!date || !startTime || !endTime)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: date, startTime, endTime' 
        },
        { status: 400 }
      );
    }
    
    // Validate required params for finding available resources by type
    if (!resourceId && (!type || !date || !startTime || !endTime)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters: type, date, startTime, endTime' 
        },
        { status: 400 }
      );
    }
    
    if (resourceId) {
      // Check availability for specific resource
      const { available, conflicts } = await checkResourceAvailability(
        resourceId,
        date!,
        startTime!,
        endTime!
      );
      
      return NextResponse.json({
        success: true,
        available,
        conflicts,
      });
    } else {
      // Find all available resources of the specified type
      const availableResources = await findAvailableResources(
        type!,
        date!,
        startTime!,
        endTime!
      );
      
      return NextResponse.json({
        success: true,
        available: availableResources.length > 0,
        availableResources,
        conflicts: [],
      });
    }
  } catch (error) {
    console.error('Error checking resource availability:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check resource availability' },
      { status: 500 }
    );
  }
}
