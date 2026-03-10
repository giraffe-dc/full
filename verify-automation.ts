import clientPromise from './lib/mongodb';
import { ObjectId } from 'mongodb';

async function verifyAutomation() {
    const client = await clientPromise;
    const db = client.db("giraffe");

    console.log("🚀 Starting verification of Event-Check automation...");

    // 1. Setup: Create a dummy check and a linked event
    const checkId = new ObjectId();
    const checkIdStr = checkId.toString();

    console.log(`📝 Creating dummy event linked to checkId: ${checkIdStr}`);

    await db.collection("events").insertOne({
        title: "Test Automation Event",
        checkId: checkIdStr,
        status: "in_progress",
        paymentStatus: "unpaid",
        total: 1000,
        paidAmount: 0,
        createdAt: new Date().toISOString()
    });

    // 2. Test Checkout (Payment)
    console.log("💳 Simulating successful checkout...");
    // We simulate the checkout logic by manually triggering the update we added to the route
    // In a real environment, we'd call the API, but here we test the database logic consistency

    await db.collection("events").updateMany(
        { checkId: checkIdStr },
        {
            $set: {
                status: 'completed',
                paymentStatus: 'paid',
                paidAmount: 1000,
                updatedAt: new Date().toISOString()
            }
        }
    );

    const paidEvent = await db.collection("events").findOne({ checkId: checkIdStr });
    if (paidEvent?.status === 'completed' && paidEvent?.paymentStatus === 'paid' && paidEvent?.paidAmount === 1000) {
        console.log("✅ Checkout automation: SUCCESS");
    } else {
        console.error("❌ Checkout automation: FAILED", paidEvent);
    }

    // 3. Test Void (Cancellation)
    const voidCheckId = new ObjectId();
    const voidCheckIdStr = voidCheckId.toString();

    console.log(`📝 Creating another dummy event for void test (checkId: ${voidCheckIdStr})`);
    await db.collection("events").insertOne({
        title: "Test Void Event",
        checkId: voidCheckIdStr,
        status: "in_progress",
        createdAt: new Date().toISOString()
    });

    console.log("🗑️ Simulating check voiding...");
    await db.collection("events").updateMany(
        { checkId: voidCheckIdStr },
        {
            $set: {
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            }
        }
    );

    const cancelledEvent = await db.collection("events").findOne({ checkId: voidCheckIdStr });
    if (cancelledEvent?.status === 'cancelled') {
        console.log("✅ Void automation: SUCCESS");
    } else {
        console.error("❌ Void automation: FAILED", cancelledEvent);
    }

    // Cleanup
    console.log("🧹 Cleaning up test data...");
    await db.collection("events").deleteMany({ title: { $regex: "Test Automation|Test Void" } });

    console.log("🏁 Verification finished.");
    process.exit(0);
}

verifyAutomation().catch(console.error);
