import { NextRequest, NextResponse } from 'next/server';
import { findEvents } from '@/lib/models/Event';

// GET /api/events/statistics/popular - Get popular packages and services
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const { data: events } = await findEvents({
      startDate,
      endDate,
      statuses: ['completed'],
      limit: 1000,
    });
    
    // Count packages
    const packageCount: Record<string, { name: string; count: number }> = {};
    events.forEach((event: any) => {
      if (event.packageId) {
        if (!packageCount[event.packageId]) {
          packageCount[event.packageId] = { name: event.packageName || 'Unknown', count: 0 };
        }
        packageCount[event.packageId].count++;
      }
    });
    
    const popularPackages = Object.entries(packageCount)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Count services
    const serviceCount: Record<string, { name: string; count: number }> = {};
    events.forEach((event: any) => {
      if (event.customServices && Array.isArray(event.customServices)) {
        event.customServices.forEach((service: any) => {
          if (!serviceCount[service.id]) {
            serviceCount[service.id] = { name: service.name, count: 0 };
          }
          serviceCount[service.id].count += service.quantity || 1;
        });
      }
    });
    
    const popularServices = Object.entries(serviceCount)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      data: {
        packages: popularPackages,
        services: popularServices,
      },
    });
  } catch (error) {
    console.error('Error fetching popular items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch popular items' },
      { status: 500 }
    );
  }
}
