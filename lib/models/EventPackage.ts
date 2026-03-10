import clientPromise from '../mongodb';
import { EventPackage } from '../../types/events';

const DATABASE_NAME = process.env.DATABASE_NAME || 'giraffe';
const COLLECTION_NAME = 'event_packages';

let collection: any = null;

async function getCollection() {
  if (!collection) {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    collection = db.collection(COLLECTION_NAME);
  }
  return collection;
}

export async function createEventPackage(pkg: Omit<EventPackage, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<EventPackage> {
  const col = await getCollection();
  const now = new Date().toISOString();
  
  const newPackage = {
    ...pkg,
    id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await col.insertOne(newPackage);
  return { ...newPackage, _id: result.insertedId };
}

export async function findPackageById(id: string): Promise<EventPackage | null> {
  const col = await getCollection();
  const pkg = await col.findOne({ $or: [{ id }, { _id: id }] });
  return pkg ? { ...pkg, _id: pkg._id.toString() } : null;
}

export async function findAllPackages(status?: 'active' | 'inactive'): Promise<EventPackage[]> {
  const col = await getCollection();
  
  const query = status ? { status } : {};
  const packages = await col.find(query)
    .sort({ name: 1 })
    .toArray();
  
  return packages.map((p: any) => ({ ...p, _id: p._id.toString() }));
}

export async function updatePackage(id: string, updates: Partial<EventPackage>): Promise<EventPackage | null> {
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

export async function deletePackage(id: string): Promise<boolean> {
  const col = await getCollection();
  // Soft delete - set status to inactive
  const result = await col.updateOne(
    { $or: [{ id }, { _id: id }] },
    { $set: { status: 'inactive', updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function findActivePackages(): Promise<EventPackage[]> {
  return findAllPackages('active');
}
