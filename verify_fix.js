
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
    const uri = 'mongodb+srv://pustovitfor:pustovitfor123@cluster0.jh2k0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const client = await MongoClient.connect(uri);
    const db = client.db('giraffe');

    const searchTerm = "картопля фрі соломка";

    // 1. Mock "Ingredients" warehouse
    const allWarehouses = await db.collection('warehouses').find({ status: { $ne: 'inactive' } }).toArray();
    const ingredientsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('інгредієнти')) || allWarehouses[0];
    const productsWarehouse = allWarehouses.find(w => w.name.toLowerCase().includes('товари')) || allWarehouses[0];

    console.log("Warehouses found:");
    allWarehouses.forEach(w => console.log(`- ${w.name} (${w._id})`));

    // 2. Resolve ingredient REAL _id
    const realIng = await db.collection("ingredients").findOne({ name: searchTerm });
    if (!realIng) {
        console.log("Ingredient NOT found!");
        return;
    }
    const ingId = realIng._id.toString();
    console.log(`\nResolved Ingredient: ${realIng.name}, _id (string): ${ingId}`);

    // 3. Find best warehouse
    let targetWH = ingredientsWarehouse;
    const existingBalance = await db.collection("stock_balances").findOne({
        itemId: ingId,
        quantity: { $gt: 0 }
    });

    if (existingBalance) {
        console.log(`Found existing balance row in WH ID: ${existingBalance.warehouseId}`);
        targetWH = allWarehouses.find(w => w._id.toString() === existingBalance.warehouseId) || ingredientsWarehouse;
    } else {
        console.log("No existing balance > 0 found, using default Ingredients WH");
    }

    console.log(`Final target warehouse for deduction: ${targetWH.name} (${targetWH._id})`);

    // Verify if it matches the 'Ingredients' warehouse from the user's screenshot
    if (targetWH.name === 'Інгредієнти') {
        console.log("\nSUCCESS: Logic correctly picks 'Інгредієнти' warehouse for this item.");
    } else {
        console.log("\nWARNING: Logic picked a different warehouse:", targetWH.name);
    }

    await client.close();
}

main().catch(console.error);
