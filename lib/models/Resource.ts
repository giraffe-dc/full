import clientPromise from '../mongodb';
import { Resource, ResourceBooking, ResourceConflict } from '../../types/events';

const DATABASE_NAME = process.env.DATABASE_NAME || 'giraffe';
const COLLECTION_NAME = 'event_resources';

let collection: any = null;

async function getCollection() {
  if (!collection) {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    collection = db.collection(COLLECTION_NAME);
  }
  return collection;
}

export async function createResource(resource: Omit<Resource, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource> {
  const col = await getCollection();
  const now = new Date().toISOString();
  
  const newResource = {
    ...resource,
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await col.insertOne(newResource);
  return { ...newResource, _id: result.insertedId };
}

export async function findResourceById(id: string): Promise<Resource | null> {
  const col = await getCollection();
  const resource = await col.findOne({ $or: [{ id }, { _id: id }] });
  return resource ? { ...resource, _id: resource._id.toString() } : null;
}

export async function findAllResources(type?: string): Promise<Resource[]> {
  const col = await getCollection();
  
  const query = type ? { type } : {};
  const resources = await col.find(query)
    .sort({ name: 1 })
    .toArray();
  
  return resources.map((r: any) => ({ ...r, _id: r._id.toString() }));
}

export async function updateResource(id: string, updates: Partial<Resource>): Promise<Resource | null> {
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

export async function deleteResource(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ $or: [{ id }, { _id: id }] });
  return result.deletedCount > 0;
}

export async function findAvailableResources(
  type: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Resource[]> {
  const col = await getCollection();
  
  // Get all resources of the specified type that are not inactive
  const allResources = await col.find({
    type,
    status: { $nin: ['inactive', 'maintenance'] },
  }).toArray();
  
  // Get all bookings for the specified date
  const eventsCollection = clientPromise.then(client => 
    client.db(DATABASE_NAME).collection('events')
  );
  
  const eventsCol = await eventsCollection;
  const eventsOnDate = await eventsCol.find({
    date,
    status: { $nin: ['cancelled', 'draft'] },
  }).toArray();
  
  // Filter out resources that are already booked
  const bookedResourceIds = new Set<string>();
  
  eventsOnDate.forEach((event: any) => {
    const eventStart = event.startTime;
    const eventEnd = event.endTime;
    
    // Check if time ranges overlap
    if (startTime < eventEnd && endTime > eventStart) {
      // Check rooms
      if (event.assignedRooms) {
        event.assignedRooms.forEach((room: ResourceBooking) => {
          bookedResourceIds.add(room.resourceId);
        });
      }
      // Check animators
      if (event.assignedAnimators) {
        event.assignedAnimators.forEach((animator: ResourceBooking) => {
          bookedResourceIds.add(animator.resourceId);
        });
      }
      // Check equipment
      if (event.assignedEquipment) {
        event.assignedEquipment.forEach((equipment: ResourceBooking) => {
          bookedResourceIds.add(equipment.resourceId);
        });
      }
    }
  });
  
  return allResources
    .filter((r: any) => !bookedResourceIds.has(r.id))
    .map((r: any) => ({ ...r, _id: r._id.toString() }));
}

export async function checkResourceAvailability(
  resourceId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; conflicts: ResourceConflict[] }> {
  const eventsCollection = clientPromise.then(client => 
    client.db(DATABASE_NAME).collection('events')
  );
  
  const eventsCol = await eventsCollection;
  const eventsOnDate = await eventsCol.find({
    date,
    status: { $nin: ['cancelled', 'draft'] },
    $or: [
      { 'assignedRooms.resourceId': resourceId },
      { 'assignedAnimators.resourceId': resourceId },
      { 'assignedEquipment.resourceId': resourceId },
    ],
  }).toArray();
  
  const conflicts: ResourceConflict[] = [];
  
  eventsOnDate.forEach((event: any) => {
    const eventStart = event.startTime;
    const eventEnd = event.endTime;
    
    // Check if time ranges overlap
    if (startTime < eventEnd && endTime > eventStart) {
      // Find which resource is booked
      const allBookings = [
        ...(event.assignedRooms || []),
        ...(event.assignedAnimators || []),
        ...(event.assignedEquipment || []),
      ];
      
      const booking = allBookings.find((b: ResourceBooking) => b.resourceId === resourceId);
      
      if (booking) {
        conflicts.push({
          resourceId,
          resourceName: booking.resourceName,
          eventId: event.id,
          eventTitle: event.title,
          startTime: eventStart,
          endTime: eventEnd,
        });
      }
    }
  });
  
  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

export async function updateResourceStatus(
  id: string,
  status: Resource['status']
): Promise<Resource | null> {
  return updateResource(id, { status });
}

export async function findResourcesByType(type: string): Promise<Resource[]> {
  return findAllResources(type);
}
