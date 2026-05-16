import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/certificates - List certificates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const query: any = {};
    if (clientId) {
      query.clientId = clientId;
    }
    if (status) {
      query.status = status;
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    const certificates = await db.collection('certificates')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Map _id to id for consistency
    const formattedCertificates = certificates.map(cert => ({
      ...cert,
      id: cert._id.toString()
    }));

    return NextResponse.json({ success: true, data: formattedCertificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

// POST /api/certificates - Create a new certificate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME || 'giraffe');

    // Generate a unique code (e.g. CERT-XXXX-XXXX)
    const code = `CERT-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const newCertificate = {
      clientId: body.clientId || 'anonymous',
      clientName: body.clientName || '',
      type: body.type, // 'service' | 'visits' | 'amount'
      typeId: body.typeId, // Link to dynamic type definition
      templateId: body.templateId, // Link to template
      serviceId: body.serviceId,
      serviceName: body.serviceName,
      visitsTotal: body.visitsTotal,
      visitsUsed: 0,
      amount: body.amount,
      balance: body.type === 'amount' ? body.amount : undefined,
      status: body.status || 'active',
      code: body.code || code,
      createdAt: new Date().toISOString(),
      expiresAt: body.expiresAt,
      pricePaid: body.pricePaid || 0,
      receiptId: body.receiptId, // Can be passed if created from a paid receipt
      applicableCategories: body.applicableCategories,
      maxCoveragePerVisit: body.maxCoveragePerVisit
    };

    const result = await db.collection('certificates').insertOne(newCertificate);

    return NextResponse.json({
      success: true,
      data: { ...newCertificate, id: result.insertedId.toString(), _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
}
