import { NextRequest, NextResponse } from 'next/server';
import { getEventRevenueByPeriod } from '@/lib/models/Event';

// GET /api/events/statistics/revenue - Get revenue by period
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = (searchParams.get('groupBy') as 'day' | 'week' | 'month' | 'year') || 'month';
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    const revenue = await getEventRevenueByPeriod(startDate, endDate, groupBy);
    
    return NextResponse.json({
      success: true,
      data: revenue,
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
