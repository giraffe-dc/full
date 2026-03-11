const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fix() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("No MONGODB_URI found in .env.local");
        process.exit(1);
    }
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db("giraffe");

    console.log("Starting receipt fix script...");

    // Fix string shiftIds
    const receipts = await db.collection("receipts").find({ 
        shiftId: { $type: "string" } 
    }).toArray();
    
    let stringFixCount = 0;
    for (const r of receipts) {
        if (ObjectId.isValid(r.shiftId)) {
            await db.collection("receipts").updateOne({ _id: r._id }, { $set: { shiftId: new ObjectId(r.shiftId) } });
            stringFixCount++;
        }
    }
    console.log(`Fixed ${stringFixCount} receipts with string shiftId.`);

    // Fix null shiftIds (if they fall within an open or closed shift)
    const nullReceipts = await db.collection("receipts").find({ 
        $or: [ {shiftId: null}, {shiftId: { $exists: false }} ]
    }).toArray();

    let nullFixCount = 0;
    for (const r of nullReceipts) {
        // Find a shift that covers this receipt's date
        const receiptDate = new Date(r.createdAt);
        const shift = await db.collection("cash_shifts").findOne({
            startTime: { $lt: receiptDate },
            $or: [
                { endTime: { $gt: receiptDate } },
                { endTime: null },
                { status: 'open' }
            ]
        });
        if (shift) {
            await db.collection("receipts").updateOne({ _id: r._id }, { $set: { shiftId: shift._id } });
            nullFixCount++;
        }
    }
    console.log(`Fixed ${nullFixCount} receipts with null shiftId.`);
    
    console.log("Done");
    process.exit(0);
}

fix().catch(console.error);
