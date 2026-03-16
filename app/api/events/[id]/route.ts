import { NextRequest, NextResponse } from 'next/server';
import {
  findEventById,
  updateEvent,
  deleteEvent,
  updateEventPayment,
} from '@/lib/models/Event';
import { PaymentStatus } from '@/types/events';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/events/[id] - Get single event
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
    
    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update event with check
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

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Update check if checkId exists
    if (body.checkId || existingEvent.checkId) {
      const checkId = body.checkId || existingEvent.checkId;
      
      if (checkId) {
        // Map customServices to check items
        const items = (body.customServices || []).map((svc: any) => ({
          serviceId: `evt_${svc.id}`,
          productId: svc.id,
          serviceName: svc.name,
          category: svc.category || 'events',
          price: svc.unitPrice,
          quantity: svc.quantity,
          subtotal: svc.total,
        }));

        // Update check
        await db.collection('checks').updateOne(
          { _id: new ObjectId(checkId) },
          {
            $set: {
              items: items.length > 0 ? items : undefined,
              subtotal: body.subtotal,
              total: body.total,
              comment: body.clientNotes,
              notes: body.internalNotes,
              guestsCount: body.totalGuests,
              paidAmount: body.paidAmount,
              paymentStatus: body.paymentStatus,
              updatedAt: new Date().toISOString(),
            },
            $push: body.customServices || body.clientNotes || body.internalNotes ? {
              history: {
                action: 'updated_from_event',
                changedBy: body.clientName || 'System',
                date: new Date().toISOString(),
                newValue: 'Updated via event edit'
              }
            } : undefined
          }
        );
      }
    }

    // Validate date format if provided
    if (body.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    // Validate time format if provided
    const timeRegex = /^\d{2}:\d{2}$/;
    if (body.startTime && !timeRegex.test(body.startTime)) {
      return NextResponse.json(
        { success: false, error: 'Invalid start time format. Use HH:MM' },
        { status: 400 }
      );
    }
    if (body.endTime && !timeRegex.test(body.endTime)) {
      return NextResponse.json(
        { success: false, error: 'Invalid end time format. Use HH:MM' },
        { status: 400 }
      );
    }

    // Calculate duration if times changed
    if (body.startTime && body.endTime && !body.duration) {
      const [startH, startM] = body.startTime.split(':').map(Number);
      const [endH, endM] = body.endTime.split(':').map(Number);
      body.duration = (endH * 60 + endM) - (startH * 60 + startM);
    }

    // Recalculate totals if prices changed
    if (body.basePrice !== undefined || body.additionalServicesTotal !== undefined || body.extraGuestsTotal !== undefined) {
      const basePrice = body.basePrice !== undefined ? body.basePrice : existingEvent.basePrice;
      const additionalServicesTotal = body.additionalServicesTotal !== undefined ? body.additionalServicesTotal : existingEvent.additionalServicesTotal;
      const extraGuestsTotal = body.extraGuestsTotal !== undefined ? body.extraGuestsTotal : existingEvent.extraGuestsTotal;

      body.subtotal = basePrice + additionalServicesTotal + extraGuestsTotal;

      if (body.discount !== undefined || existingEvent.discount) {
        const discount = body.discount !== undefined ? body.discount : existingEvent.discount;
        body.total = body.subtotal - discount;
      } else {
        body.total = body.subtotal;
      }
    }

    // Update total guests if guest counts changed
    if (body.childGuests !== undefined || body.adultGuests !== undefined) {
      const childGuests = body.childGuests !== undefined ? body.childGuests : existingEvent.childGuests;
      const adultGuests = body.adultGuests !== undefined ? body.adultGuests : existingEvent.adultGuests;
      body.totalGuests = childGuests + adultGuests;
    }

    const event = await updateEvent(id, body);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if event exists
    const existingEvent = await findEventById(id);
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Soft delete - set status to cancelled
    await updateEvent(id, { status: 'cancelled' });
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
