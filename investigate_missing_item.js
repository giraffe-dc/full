
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
    // Current connection string from your previous run
    const uri = 'mongodb+srv://pustovitfor:pustovitfor123@cluster0.jh2k0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const client = await MongoClient.connect(uri);
    const db = client.db('giraffe');

    console.log("--- Finding Product/Ingredient by name 'Пюре' ---");
    const products = await db.collection("products").find({ name: { $regex: /Пюре/i } }).toArray();
    const ingredients = await db.collection("ingredients").find({ name: { $regex: /Пюре/i } }).toArray();

    console.log("Found Products:", products.map(p => ({ id: p._id, name: p.name, productId: p.id })));
    console.log("Found Ingredients:", ingredients.map(i => ({ id: i._id, name: i.name, ingredientId: i.id })));

    // 1. Search for ANY stock movements with "Пюре" in the name
    console.log("\n--- Searching Stock Movements for ANY 'Пюре' ---");
    const moves = await db.collection("stock_movements").find({
        "items.itemName": { $regex: /Пюре/i }
    }).sort({ date: 1 }).toArray();

    if (moves.length > 0) {
        moves.forEach(m => {
            const item = m.items.find(i => i.itemName.includes("Пюре"));
            console.log(`Date: ${m.date}, Type: ${m.type}, Qty: ${item.qty}, ItemID: ${item.itemId}, Name: ${item.itemName}`);
        });
    } else {
        console.log("No stock movements found containing 'Пюре' in item names.");
    }

    // 2. Search for the specific receipt
    console.log("\n--- Checking Receipt details ---");
    const receiptNum = 1768933096435;
    const receipt = await db.collection("receipts").findOne({
        $or: [
            { receiptNumber: receiptNum },
            { receiptNumber: receiptNum.toString() },
            { _id: "1768933096435" }
        ]
    });

    if (receipt) {
        console.log("Receipt found! Date:", receipt.createdAt);
        console.log("Items in receipt:");
        receipt.items.forEach(it => {
            console.log(`- ${it.serviceName}: price=${it.price}, qty=${it.quantity}, id=${it.productId || it.serviceId}`);
        });
    } else {
        console.log("Receipt 1768933096435 NOT found.");
        console.log("Searching for ANY receipt with 'Пюре' items...");
        const receiptsWithPuree = await db.collection("receipts").find({
            "items.serviceName": { $regex: /Пюре/i }
        }).limit(3).toArray();

        receiptsWithPuree.forEach(r => {
            console.log(`Found Receipt #${r.receiptNumber} at ${r.createdAt}`);
            r.items.filter(it => it.serviceName.includes("Пюре")).forEach(it => {
                console.log(`  -> Item: ${it.serviceName}, ID: ${it.productId || it.serviceId}`);
            });
        });
    }

    await client.close();
}

main().catch(console.error);
