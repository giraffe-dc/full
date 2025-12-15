
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');

    // 1. Fetch receipts
    const receiptsRaw = await db.collection('receipts').find({}).sort({ createdAt: -1 }).toArray();

    // 2. Fetch products for cost calculation
    const productsRaw = await db.collection('products').find({}).toArray();
    const productMap = new Map(productsRaw.map(p => [p._id.toString(), p]));
    const productMapById = new Map(productsRaw.map(p => [p.id, p]));

    const receipts = receiptsRaw.map(r => {
      let totalCost = 0;

      // Calculate cost for each item
      if (r.items && Array.isArray(r.items)) {
        r.items.forEach((item: any) => {
          const id = item.productId || item.id;
          let unitCost = Number(item.cost || 0);

          if (!unitCost) {
            // Fallback to product catalog cost
            const product = productMap.get(id) || productMapById.get(id);
            // Or try finding by name if no ID match (legacy data)
            const productByName = !product ? productsRaw.find(p => p.name === item.name) : null;

            unitCost = product ? Number(product.costPerUnit || 0) : (productByName ? Number(productByName.costPerUnit || 0) : 0);
          }

          const qty = Number(item.count || item.qty || item.quantity || 0);
          totalCost += (unitCost * qty);
        });
      }

      const total = Number(r.total || 0);
      const profit = total - totalCost;

      return {
        id: r._id.toString(),
        receiptNumber: r.receiptNumber || r._id.toString().slice(-6),
        openedAt: r.createdAt || r.openedAt, // Use createdAt as main date
        closedAt: r.closedAt,
        waiter: r.waiter || "Каса",
        status: r.status || "closed",
        total: total,
        discount: Number(r.discount || 0),
        profit: profit,
        paymentMethod: r.paymentMethod || "cash",
        itemsCount: r.items ? r.items.length : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: receipts,
      count: receipts.length,
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні чеків' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // .. Existing POST logic if needed, or keep generic ..
  // Since POST is mainy for creating dummy data or testing, we can leave it simple or copy previous.
  // The checkout API handles real receipt creation.
  // I will minimalize POST here or keep it if it was used for seeding.
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const body = await request.json();
    const result = await db.collection('receipts').insertOne({
      ...body,
      createdAt: new Date()
    });
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (e) {
    return NextResponse.json({ error: "Creation failed" }, { status: 500 });
  }
}
