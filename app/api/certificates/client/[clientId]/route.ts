import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// GET /api/certificates/client/[clientId] - List active certificates for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing clientId' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const query: any = { clientId };
    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Default to only active certificates for checkout usage
    }

    const certificates = await db.collection('certificates').aggregate([
      { $match: query },
      {
        $addFields: {
          typeObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$typeId", null] }, { $ne: ["$typeId", ""] }] },
              then: { $toObjectId: "$typeId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'certificate_types',
          localField: 'typeObjectId',
          foreignField: '_id',
          as: 'typeInfo'
        }
      },
      {
        $addFields: {
          typeSettings: { $arrayElemAt: ["$typeInfo.settings", 0] },
          id: { $toString: "$_id" }
        }
      },
      { $project: { typeInfo: 0, typeObjectId: 0 } },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    return NextResponse.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching client certificates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}
