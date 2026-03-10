import clientPromise from '../mongodb';
import { Event, EventStatus, PaymentStatus, EventType } from '../../types/events';

const DATABASE_NAME = process.env.DATABASE_NAME || 'giraffe';
const COLLECTION_NAME = 'events';

let collection: any = null;

async function getCollection() {
  if (!collection) {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    collection = db.collection(COLLECTION_NAME);
  }
  return collection;
}

export async function createEvent(event: Omit<Event, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  const col = await getCollection();
  const now = new Date().toISOString();
  
  const newEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await col.insertOne(newEvent);
  return { ...newEvent, _id: result.insertedId };
}

export async function findEventById(id: string): Promise<Event | null> {
  const col = await getCollection();
  const event = await col.findOne({ $or: [{ id }, { _id: id }] });
  return event ? { ...event, _id: event._id.toString() } : null;
}

export async function findEvents(params: {
  startDate?: string;
  endDate?: string;
  status?: EventStatus;
  eventType?: EventType;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Event[]; total: number }> {
  const col = await getCollection();
  
  const query: any = {};
  
  if (params.startDate && params.endDate) {
    query.date = {
      $gte: params.startDate,
      $lte: params.endDate,
    };
  } else if (params.startDate) {
    query.date = { $gte: params.startDate };
  } else if (params.endDate) {
    query.date = { $lte: params.endDate };
  }
  
  if (params.status) {
    query.status = params.status;
  }
  
  if (params.eventType) {
    query.eventType = params.eventType;
  }
  
  if (params.search) {
    query.$or = [
      { clientName: { $regex: params.search, $options: 'i' } },
      { title: { $regex: params.search, $options: 'i' } },
      { clientEmail: { $regex: params.search, $options: 'i' } },
    ];
  }
  
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;
  
  const total = await col.countDocuments(query);
  const data = await col.find(query)
    .sort({ date: 1, startTime: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  return {
    data: data.map((e: any) => ({ ...e, _id: e._id.toString() })),
    total,
  };
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
  const col = await getCollection();
  
  const updateData: any = {
    $set: {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  };
  
  const result = await col.findOneAndUpdate(
    { $or: [{ id }, { _id: id }] },
    updateData,
    { returnDocument: 'after' }
  );
  
  return result ? { ...result.value, _id: result.value._id.toString() } : null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ $or: [{ id }, { _id: id }] });
  return result.deletedCount > 0;
}

export async function findEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
  const col = await getCollection();
  const events = await col.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .sort({ date: 1, startTime: 1 })
    .toArray();
  
  return events.map((e: any) => ({ ...e, _id: e._id.toString() }));
}

export async function findEventsByStatus(status: EventStatus): Promise<Event[]> {
  const col = await getCollection();
  const events = await col.find({ status }).toArray();
  return events.map((e: any) => ({ ...e, _id: e._id.toString() }));
}

export async function getEventStatistics(startDate?: string, endDate?: string): Promise<{
  totalEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalRevenue: number;
  averageCheck: number;
  conversionRate: number;
  popularPackages: { packageId: string; name: string; count: number }[];
  eventsByType: Record<EventType, number>;
  eventsByStatus: Record<EventStatus, number>;
}> {
  const col = await getCollection();
  
  const query: any = {};
  if (startDate && endDate) {
    query.date = {
      $gte: startDate,
      $lte: endDate,
    };
  }
  
  const allEvents = await col.find(query).toArray();
  
  const totalEvents = allEvents.length;
  const completedEvents = allEvents.filter((e: any) => e.status === 'completed').length;
  const cancelledEvents = allEvents.filter((e: any) => e.status === 'cancelled').length;
  const totalRevenue = allEvents.reduce((sum: number, e: any) => sum + (e.total || 0), 0);
  const averageCheck = totalEvents > 0 ? totalRevenue / totalEvents : 0;
  
  const confirmedCount = allEvents.filter((e: any) => e.status === 'confirmed').length;
  const draftCount = allEvents.filter((e: any) => e.status === 'draft').length;
  const conversionRate = (confirmedCount + completedEvents) / (totalEvents - cancelledEvents) * 100 || 0;
  
  // Popular packages
  const packageCount: Record<string, { name: string; count: number }> = {};
  allEvents.forEach((e: any) => {
    if (e.packageId) {
      if (!packageCount[e.packageId]) {
        packageCount[e.packageId] = { name: e.packageName || 'Unknown', count: 0 };
      }
      packageCount[e.packageId].count++;
    }
  });
  
  const popularPackages = Object.entries(packageCount)
    .map(([packageId, data]) => ({ packageId, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Events by type
  const eventsByType: Record<EventType, number> = {
    birthday: 0,
    corporate: 0,
    graduation: 0,
    holiday: 0,
    other: 0,
  };
  
  allEvents.forEach((e: any) => {
    if (e.eventType && eventsByType.hasOwnProperty(e.eventType)) {
      eventsByType[e.eventType as EventType]++;
    } else {
      eventsByType.other++;
    }
  });
  
  // Events by status
  const eventsByStatus: Record<EventStatus, number> = {
    draft: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  
  allEvents.forEach((e: any) => {
    if (e.status && eventsByStatus.hasOwnProperty(e.status)) {
      eventsByStatus[e.status as EventStatus]++;
    }
  });
  
  return {
    totalEvents,
    completedEvents,
    cancelledEvents,
    totalRevenue,
    averageCheck,
    conversionRate: Math.round(conversionRate * 100) / 100,
    popularPackages,
    eventsByType,
    eventsByStatus,
  };
}

export async function getEventRevenueByPeriod(
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<{ period: string; revenue: number; events: number; profit: number }[]> {
  const col = await getCollection();
  
  const events = await col.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
    status: { $nin: ['cancelled'] },
  }).toArray();
  
  const grouped: Record<string, { revenue: number; events: number; profit: number }> = {};
  
  events.forEach((e: any) => {
    let periodKey: string;
    const eventDate = new Date(e.date);
    
    switch (groupBy) {
      case 'day':
        periodKey = e.date;
        break;
      case 'week':
        const weekNum = Math.ceil(eventDate.getDate() / 7);
        periodKey = `${eventDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
        break;
      case 'year':
        periodKey = eventDate.getFullYear().toString();
        break;
      default: // month
        periodKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped[periodKey]) {
      grouped[periodKey] = { revenue: 0, events: 0, profit: 0 };
    }
    
    grouped[periodKey].revenue += e.total || 0;
    grouped[periodKey].events += 1;
    // Profit calculation (simplified: assume 70% margin)
    grouped[periodKey].profit += (e.total || 0) * 0.7;
  });
  
  return Object.entries(grouped)
    .map(([period, data]) => ({
      period,
      revenue: Math.round(data.revenue * 100) / 100,
      events: data.events,
      profit: Math.round(data.profit * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export async function updateEventPayment(
  id: string,
  paymentData: {
    paidAmount: number;
    paymentStatus: PaymentStatus;
  }
): Promise<Event | null> {
  return updateEvent(id, paymentData);
}
