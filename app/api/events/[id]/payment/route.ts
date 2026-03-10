import { NextRequest, NextResponse } from 'next/server';
import { findEventById, updateEventPayment } from '@/lib/models/Event';
import { PaymentStatus } from '@/types/events';

// GET /api/events/[id]/payment - Get payment info for event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const event = await findEventById(id);
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    const remaining = event.total - event.paidAmount;
    
    return NextResponse.json({
      success: true,
      data: {
        total: event.total,
        paid: event.paidAmount,
        remaining: remaining,
        status: event.paymentStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment info' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id]/payment - Update payment for event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if event exists
    const existingEvent = await findEventById(id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Validate payment amount
    if (body.paidAmount !== undefined) {
      if (typeof body.paidAmount !== 'number' || body.paidAmount < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid payment amount' },
          { status: 400 }
        );
      }
    }
    
    // Determine payment status based on amounts
    let paymentStatus: PaymentStatus = existingEvent.paymentStatus;
    
    if (body.paidAmount !== undefined || body.paymentStatus !== undefined) {
      const newPaidAmount = body.paidAmount !== undefined ? body.paidAmount : existingEvent.paidAmount;
      const total = existingEvent.total;
      
      if (newPaidAmount >= total) {
        paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'deposit';
      } else {
        paymentStatus = 'unpaid';
      }
      
      // Override if explicitly provided
      if (body.paymentStatus) {
        paymentStatus = body.paymentStatus;
      }
    }
    
    const updateData: any = {
      paidAmount: body.paidAmount !== undefined ? body.paidAmount : existingEvent.paidAmount,
      paymentStatus,
    };
    
    const event = await updateEventPayment(id, updateData);
    
    return NextResponse.json({
      success: true,
      data: {
        total: event?.total || existingEvent.total,
        paid: event?.paidAmount || updateData.paidAmount,
        remaining: (event?.total || existingEvent.total) - (event?.paidAmount || updateData.paidAmount),
        status: event?.paymentStatus || paymentStatus,
      },
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}
