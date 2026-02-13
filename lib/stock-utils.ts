
// Logic to APPLY stock changes
export async function applyBalances(db: any, data: any, session?: any) {
    if (!data.items || !Array.isArray(data.items)) return;

    for (const item of data.items) {
        const qty = parseFloat(item.qty);
        const cost = parseFloat(item.cost || 0);

        if (data.type === 'supply') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        lastCost: cost, // Update last cost only on supply
                        updatedAt: new Date()
                    }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'move') {
            // Revert Move: Increase Source, Decrease Target
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { upsert: true, ...(session ? { session } : {}) }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: { itemName: item.itemName, unit: item.unit, updatedAt: new Date() }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        } else if (data.type === 'inventory') {
            // For inventory, qty is the DELTA (Actual - Theoretical)
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                {
                    $inc: { quantity: qty },
                    $set: {
                        itemName: item.itemName,
                        unit: item.unit,
                        updatedAt: new Date(),
                        lastInventoryDate: new Date(data.date),
                        lastInventoryQty: item.actualQty
                    }
                },
                { upsert: true, ...(session ? { session } : {}) }
            );
        }
    }
}

// Logic to REVERT stock changes (Exactly inverse of apply)
export async function revertBalances(db: any, data: any, session?: any) {
    if (!data.items || !Array.isArray(data.items)) return;

    for (const item of data.items) {
        const qty = parseFloat(item.qty);

        if (data.type === 'supply') {
            // Revert Supply: Decrease Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'writeoff' || data.type === 'sale') {
            // Revert Writeoff/Sale: Increase Balance
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'move') {
            // Revert Move: Increase Source, Decrease Target
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.toWarehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
                { ...(session ? { session } : {}) }
            );
        } else if (data.type === 'inventory') {
            await db.collection("stock_balances").updateOne(
                { warehouseId: data.warehouseId.toString(), itemId: item.itemId.toString() },
                { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } }, // Revert delta
                { ...(session ? { session } : {}) }
            );
        }
    }
}
