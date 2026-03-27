import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        const client = await clientPromise;
        const db = client.db("giraffe");

        let query: any = {};

        if (startDateParam && endDateParam) {
            const sDate = new Date(startDateParam);
            sDate.setHours(0, 0, 0, 0);
            const eDate = new Date(endDateParam);
            eDate.setHours(23, 59, 59, 999);

            query.date = {
                $gte: sDate.toISOString().split('T')[0],
                $lte: eDate.toISOString().split('T')[0]
            };
        }

        const visits = await db.collection("visits")
            .find(query)
            .sort({ date: -1, startTime: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: visits.map(v => ({ ...v, id: v._id.toString() }))
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            phone, 
            parentName, 
            childName, 
            amount, 
            tableId, 
            hallId, 
            productId, 
            staffId,
            serviceName,
            ...visitData 
        } = body;

        const client = await clientPromise;
        const db = client.db("giraffe");
        const session = client.startSession();

        let visitId;
        let checkId;

        try {
            await session.withTransaction(async () => {
                // 1. Client Management
                let customerId = null;
                let customerName = parentName || childName;

                if (phone) {
                    const searchPhone = phone.trim().startsWith('0') ? '+38' + phone.trim() : phone.trim();
                    const existingClient = await db.collection("clients").findOne({ phone: searchPhone }, { session });
                    
                    if (existingClient) {
                        customerId = existingClient._id;
                        customerName = existingClient.name;
                    } else {
                        const newClient = await db.collection("clients").insertOne({
                            name: parentName || childName || "Гість",
                            phone: searchPhone,
                            status: 'active',
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }, { session });
                        customerId = newClient.insertedId;
                    }
                }

                // 2. Fetch Details (Handling both ObjectId and custom string IDs)
                const getDoc = async (collection: string, id: string) => {
                    if (!id) return null;
                    try {
                        if (ObjectId.isValid(id) && id.length === 24) {
                            const doc = await db.collection(collection).findOne({ _id: new ObjectId(id) }, { session });
                            if (doc) return doc;
                        }
                        return await db.collection(collection).findOne({ id: id }, { session });
                    } catch (e) {
                        return await db.collection(collection).findOne({ id: id }, { session });
                    }
                };

                const staff = await getDoc("staff", staffId);
                const product = await getDoc("products", productId);
                const table = await getDoc("tables", tableId);

                // 3. Create Check
                const openShift = await db.collection("cash_shifts").findOne({ status: "open" }, { session });
                
                // Matches CartItem interface
                const checkItems = [{
                    serviceId: `visit-${Date.now()}`,
                    productId: productId || "visit_service",
                    serviceName: serviceName || product?.name || "Послуга відвідування",
                    price: Number(amount) || product?.price || 0,
                    quantity: 1,
                    subtotal: Number(amount) || product?.price || 0,
                    category: product?.category || "Розважальні послуги"
                }];

                const toObjectId = (id: any) => (id && ObjectId.isValid(id) && id.length === 24) ? new ObjectId(id) : id;

                const checkDoc = {
                    tableId: toObjectId(tableId),
                    tableName: table?.name || "Стіл",
                    departmentId: toObjectId(hallId),
                    shiftId: openShift?._id || null,
                    waiterId: staffId ? toObjectId(staffId) : null,
                    waiterName: staff?.name || "Адміністратор",
                    customerId: customerId,
                    customerName: customerName,
                    items: checkItems,
                    guestsCount: 1,
                    status: 'open',
                    subtotal: Number(amount) || 0,
                    tax: 0,
                    total: Number(amount) || 0,
                    paidAmount: 0,
                    paymentStatus: 'unpaid',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    history: [{
                        action: 'created',
                        changedBy: staff?.name || "System",
                        date: new Date().toISOString(),
                        newValue: 'Check created from Visits'
                    }]
                };

                const checkResult = await db.collection("checks").insertOne(checkDoc, { session });
                checkId = checkResult.insertedId;

                // 4. Update Table Status
                if (tableId && ObjectId.isValid(tableId) && tableId.length === 24) {
                    await db.collection("tables").updateOne(
                        { _id: new ObjectId(tableId) },
                        { $set: { status: 'busy' } },
                        { session }
                    );
                } else if (tableId) {
                    await db.collection("tables").updateOne(
                        { id: tableId },
                        { $set: { status: 'busy' } },
                        { session }
                    );
                }

                // 5. Create Visit
                const newVisit = {
                    ...visitData,
                    phone,
                    parentName,
                    childName,
                    amount: Number(amount),
                    serviceName: serviceName || product?.name || "Послуга відвідування",
                    productId: productId,
                    hallId: hallId,
                    tableId: tableId,
                    staffId: staffId,
                    checkId: checkId.toString(),
                    customerId: customerId ? customerId.toString() : null,
                    paymentStatus: 'unpaid',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const visitResult = await db.collection("visits").insertOne(newVisit, { session });
                visitId = visitResult.insertedId;
            });

            return NextResponse.json({
                success: true,
                data: { id: visitId, checkId: checkId }
            });

        } catch (e) {
            console.error("Transaction aborted:", e);
            throw e;
        } finally {
            await session.endSession();
        }

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create visit: " + (e as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const result = await db.collection("visits").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...updateData,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update visit" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const result = await db.collection("visits").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete visit" }, { status: 500 });
    }
}
