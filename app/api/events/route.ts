import { NextRequest, NextResponse } from 'next/server';
import {
  createEvent,
  findEventById,
  findEvents,
  updateEvent,
  deleteEvent,
  updateEventPayment,
} from '@/lib/models/Event';
import { EventStatus, EventType, PaymentStatus } from '@/types/events';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') as EventStatus | undefined,
      eventType: searchParams.get('eventType') as EventType | undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    };

    const { data, total } = await findEvents(params);

    return NextResponse.json({
      success: true,
      data,
      total,
      page: params.page,
      limit: params.limit,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event with check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'eventType', 'date', 'startTime', 'endTime', 'clientName', 'clientPhone'];
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

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(body.startTime) || !timeRegex.test(body.endTime)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      );
    }

    // Calculate duration if not provided
    if (!body.duration) {
      const [startH, startM] = body.startTime.split(':').map(Number);
      const [endH, endM] = body.endTime.split(':').map(Number);
      body.duration = (endH * 60 + endM) - (startH * 60 + startM);
    }

    // Calculate totals if not provided
    if (body.basePrice && !body.subtotal) {
      body.subtotal = (body.basePrice || 0) + (body.additionalServicesTotal || 0) + (body.extraGuestsTotal || 0);
    }

    if (body.subtotal !== undefined && body.discount !== undefined && body.total === undefined) {
      body.total = body.subtotal - body.discount;
    }

    // Set defaults
    body.status = body.status || 'draft';
    body.paymentStatus = body.paymentStatus || 'unpaid';
    body.paidAmount = body.paidAmount || 0;
    body.childGuests = body.childGuests || 0;
    body.adultGuests = body.adultGuests || 0;
    body.totalGuests = (body.childGuests || 0) + (body.adultGuests || 0);
    body.customServices = body.customServices || [];
    body.assignedRooms = body.assignedRooms || [];
    body.assignedAnimators = body.assignedAnimators || [];
    body.assignedEquipment = body.assignedEquipment || [];

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Start transaction if we need to create a check
    let checkId: string | undefined;

    // Create check if table and department are provided
    if (body.assignedRooms && body.assignedRooms.length > 0) {
      const { resourceId: departmentId, resourceName: tableId } = body.assignedRooms[0];

      if (departmentId && tableId) {
        // Get open shift
        const shift = await db.collection('shifts').findOne({ status: 'open' });
        const shiftId = shift ? shift._id.toString() : null;

        // Map customServices to check items
        const items = (body.customServices || []).map((svc: any) => ({
          serviceId: `evt_${svc.id}`,
          productId: svc.id,
          serviceName: svc.name,
          category: 'events',
          price: svc.unitPrice,
          quantity: svc.quantity,
          subtotal: svc.total,
        }));

        // Create check
        const newCheck = {
          tableId,
          tableName: `Стіл ${tableId}`,
          departmentId,
          shiftId,
          waiterId: null,
          waiterName: body.clientName,
          items,
          guestsCount: body.totalGuests,
          status: 'open',
          subtotal: body.subtotal,
          tax: 0,
          total: body.total,
          comment: body.clientNotes || '',
          notes: body.internalNotes || '',
          paidAmount: body.paidAmount || 0,
          paymentStatus: body.paymentStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [{
            action: 'created',
            changedBy: body.clientName || 'System',
            date: new Date().toISOString(),
            newValue: items.length > 0 ? 'Check created with items' : 'Check created'
          }]
        };

        const checkResult = await db.collection('checks').insertOne(newCheck);
        checkId = checkResult.insertedId.toString();

        // Mark table as busy
        await db.collection('tables').updateOne(
          { _id: new ObjectId(tableId) },
          { $set: { status: 'busy', seats: body.totalGuests } }
        );
      }
    }

    // Create event with checkId
    const eventData = {
      ...body,
      checkId: checkId || body.checkId,
    };

    const event = await createEvent(eventData);

    return NextResponse.json({
      success: true,
      data: event,
      checkId,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
