
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
    const client = await MongoClient.connect('mongodb://localhost:27017');
    const db = client.db('giraffe');

    console.log("--- Collection Stats ---");
    const stats = await db.collection("stock_movements").stats();
    console.log("Total documents:", stats.count);

    console.log("\n--- Inventory Movements ---");
    const inventories = await db.collection("stock_movements").find({ type: 'inventory' }).sort({ date: -1 }).limit(10).toArray();
    inventories.forEach(inv => {
        console.log(`ID: ${inv._id}, Date: ${inv.date}, Description: ${inv.description}, Items: ${inv.items.length}`);
    });

    if (inventories.length > 0) {
        console.log("\n--- First Inventory Item Example ---");
        console.log(JSON.stringify(inventories[0].items[0], null, 2));
    }

    console.log("\n--- Earliest & Latest Movements ---");
    const earliest = await db.collection("stock_movements").find().sort({ date: 1 }).limit(1).toArray();
    const latest = await db.collection("stock_movements").find().sort({ date: -1 }).limit(1).toArray();
    console.log("Earliest:", earliest[0]?.date);
    console.log("Latest:", latest[0]?.date);

    await client.close();
}

main().catch(console.error);
