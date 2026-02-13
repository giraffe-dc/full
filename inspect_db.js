
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
    const uri = 'mongodb+srv://pustovitfor:pustovitfor123@cluster0.jh2k0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const client = await MongoClient.connect(uri);
    const db = client.db('giraffe');

    console.log("--- Warehouses ---");
    const warehouses = await db.collection('warehouses').find({ status: { $ne: 'inactive' } }).toArray();
    console.log(JSON.stringify(warehouses.map(w => ({ id: w._id, name: w.name })), null, 2));

    const searchTerm = "картопля фрі соломка";

    console.log(`\n--- Searching for '${searchTerm}' in collections ---`);
    const p = await db.collection("products").find({ name: searchTerm }).toArray();
    const r = await db.collection("recipes").find({ name: searchTerm }).toArray();
    const i = await db.collection("ingredients").find({ name: searchTerm }).toArray();

    console.log("Products:", p.map(x => ({ _id: x._id, name: x.name, id: x.id })));
    console.log("Recipes:", r.map(x => ({ _id: x._id, name: x.name, ingredients: x.ingredients?.length })));
    console.log("Ingredients:", i.map(x => ({ _id: x._id, name: x.name, id: x.id })));

    console.log(`\n--- Stock Balances for '${searchTerm}' ---`);
    // Search by name if possible, or try to match by IDs found above
    const allIds = [
        ...p.map(x => x._id.toString()),
        ...p.map(x => x.id).filter(Boolean),
        ...r.map(x => x._id.toString()),
        ...i.map(x => x._id.toString()),
        ...i.map(x => x.id).filter(Boolean)
    ];

    const balances = await db.collection('stock_balances').find({
        itemId: { $in: allIds }
    }).toArray();

    // Also try searching by itemName if it exists in stock_balances
    const balancesByName = await db.collection('stock_balances').find({
        itemName: searchTerm
    }).toArray();

    console.log("Balances by ID:", JSON.stringify(balances, null, 2));
    console.log("Balances by Name:", JSON.stringify(balancesByName, null, 2));

    if (r.length > 0) {
        console.log("\n--- Ingredients for the Recipe ---");
        console.log(JSON.stringify(r[0].ingredients, null, 2));
    }

    await client.close();
}

main().catch(console.error);
