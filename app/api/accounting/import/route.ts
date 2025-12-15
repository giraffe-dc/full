import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import * as XLSX from "xlsx";
import { ObjectId } from "mongodb";

async function getFileFromRequest(req: NextRequest): Promise<Buffer | null> {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return null;
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
    try {
        const buffer = await getFileFromRequest(req);
        if (!buffer) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get("type");

        if (!type || !["products", "recipes", "ingredients"].includes(type)) {
            return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
        }

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (!jsonData || jsonData.length === 0) {
            return NextResponse.json({ error: "Empty or invalid Excel file" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db('giraffe');

        console.log("Importing items:", jsonData.length);

        // 1. Handle Categories
        // Extract unique categories from input data
        const cats = new Set<string>();
        jsonData.forEach((row: any) => {
            // Supports 'category' column
            if (row.category) cats.add(String(row.category).trim());
        });

        // Ensure these categories exist in 'product_categories'
        if (cats.size > 0) {
            const catCollection = db.collection("product_categories");
            const existingCats = await catCollection.find({ name: { $in: Array.from(cats) } }).toArray();
            const existingCatNames = new Set(existingCats.map(c => c.name));

            const newCats = Array.from(cats).filter(c => !existingCatNames.has(c)).map(name => ({
                name,
                status: 'active',
                createdAt: new Date()
            }));

            if (newCats.length > 0) {
                await catCollection.insertMany(newCats);
            }
        }

        // 1.1. Handle Ingredients Creation (for Recipe Import)
        if (type === 'recipes') {
            const ingredientsCollection = db.collection('ingredients');
            const uniqueIngredients = new Map<string, any>(); // Name -> Ingredient Data

            // Helpers for parsing (duplicated here for scope access, ideally refactor out)
            const parseNum = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                    const match = val.replace(',', '.').match(/[\d\.]+/);
                    return match ? parseFloat(match[0]) : 0;
                }
                return 0;
            };

            const parseUnit = (val: any) => {
                if (typeof val === 'string') {
                    const unit = val.replace(/[0-9\.\,\s]/g, '');
                    return unit || 'кг';
                }
                return 'кг';
            };

            const getVal = (row: any, keys: string[]) => {
                for (const key of keys) {
                    if (row[key] !== undefined) return row[key];
                }
                return undefined;
            };

            jsonData.forEach((row: any) => {
                const ingName = getVal(row, ['ingredient', 'ingredients', 'Складники']);
                if (ingName) {
                    const trimmedName = String(ingName).trim();
                    if (!uniqueIngredients.has(trimmedName)) {
                        const grossRaw = getVal(row, ['gross', 'Брутто']);

                        // Try to infer price if provided (e.g. from total cost / gross?) 
                        // Usually cost is provided per unit or total cost. 
                        // If we have 'Собівартість складових' (totalCost) and Gross, we can calc costPerUnit.
                        // But usually imports just give names/quantities.

                        uniqueIngredients.set(trimmedName, {
                            name: trimmedName,
                            unit: parseUnit(grossRaw),
                            category: 'Generals' // Default category
                        });
                    }
                }
            });

            if (uniqueIngredients.size > 0) {
                const ingNames = Array.from(uniqueIngredients.keys());
                const existingIngs = await ingredientsCollection.find({ name: { $in: ingNames } }).toArray();
                const existingIngNames = new Set(existingIngs.map(i => i.name));

                const newIngredients = Array.from(uniqueIngredients.values())
                    .filter(i => !existingIngNames.has(i.name))
                    .map(i => ({
                        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: i.name,
                        code: Math.floor(1000 + Math.random() * 9000).toString(), // Random 4 digit code
                        category: i.category,
                        unit: i.unit,
                        costPerUnit: 0, // Default to 0, user must update
                        status: 'active',
                        createdAt: new Date()
                    }));

                if (newIngredients.length > 0) {
                    await ingredientsCollection.insertMany(newIngredients);
                    console.log(`Auto-created ${newIngredients.length} new ingredients.`);
                }
            }
        }

        // 2. Prepare Operations
        const collection = db.collection(type);

        let operations: any[] = [];

        if (type === 'recipes') {
            // Group rows by Recipe Name
            const recipeGroups = new Map<string, any[]>();
            jsonData.forEach((row: any) => {
                // Support both English and Ukrainian keys for Name
                const name = row.name || row['Назва'];
                if (name) {
                    const trimmedName = String(name).trim();
                    if (!recipeGroups.has(trimmedName)) {
                        recipeGroups.set(trimmedName, []);
                    }
                    recipeGroups.get(trimmedName)?.push(row);
                }
            });

            console.log(`Found ${recipeGroups.size} unique recipes`);

            operations = Array.from(recipeGroups.entries()).map(([recipeName, rows]) => {
                // Use the first row for basic recipe info
                const mainRow = rows[0];

                // Helper to get value from multiple possible keys
                const getVal = (obj: any, keys: string[]) => {
                    for (const key of keys) {
                        if (obj[key] !== undefined) return obj[key];
                    }
                    return undefined;
                };

                // Parse helpers
                const parseNum = (val: any) => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string') {
                        // Extract number from string like "1.00 шт." or "30,50"
                        const match = val.replace(',', '.').match(/[\d\.]+/);
                        return match ? parseFloat(match[0]) : 0;
                    }
                    return 0;
                };

                const parseUnit = (val: any) => {
                    if (typeof val === 'string') {
                        // Extract unit from string like "1.00 шт." => "шт."
                        const match = val.replace(/[\d\.\,\s]+/g, ''); // Remove numbers/dots/commas/spaces
                        // Alternative: trim numbers
                        const unit = val.replace(/[0-9\.\,\s]/g, '');
                        return unit || 'шт';
                    }
                    return 'шт';
                };

                const recipeDoc: any = {
                    name: recipeName,
                    category: getVal(mainRow, ['category', 'Категорія']) || 'Кухня',
                    code: String(getVal(mainRow, ['code', 'Код']) || Math.random().toString(36).substring(2, 8).toUpperCase()).trim(),
                    yield: parseNum(getVal(mainRow, ['yield', 'Вихід'])),
                    costPerUnit: parseNum(getVal(mainRow, ['costPerUnit', 'Собівартість'])),
                    sellingPrice: parseNum(getVal(mainRow, ['sellingPrice', 'Ціна'])),
                    markup: parseNum(getVal(mainRow, ['markup', 'Націнка'])),
                    updatedAt: new Date(),
                    ingredients: []
                };

                // Calculate Markup if missing
                if ((!recipeDoc.markup || recipeDoc.markup === 0) && recipeDoc.costPerUnit > 0 && recipeDoc.sellingPrice > 0) {
                    const calculatedMarkup = ((recipeDoc.sellingPrice - recipeDoc.costPerUnit) / recipeDoc.costPerUnit) * 100;
                    recipeDoc.markup = parseFloat(calculatedMarkup.toFixed(2));
                }

                // Map ingredients
                recipeDoc.ingredients = rows.map((row: any) => {
                    const ingName = getVal(row, ['ingredient', 'ingredients', 'Складники']);
                    if (!ingName) return null;

                    const grossRaw = getVal(row, ['gross', 'Брутто']);
                    const netRaw = getVal(row, ['net', 'Нетто']);

                    return {
                        id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: ingName,
                        gross: parseNum(grossRaw),
                        net: parseNum(netRaw),
                        quantity: parseNum(grossRaw), // Fallback
                        unit: parseUnit(grossRaw) || 'г', // Try to get unit from Gross column
                        costPerUnit: 0, // Would require DB lookup
                        method: '', // Not in excel usually
                        totalCost: 0
                    };
                }).filter(i => i !== null);

                return {
                    updateOne: {
                        filter: { name: recipeName }, // Identify by name
                        update: {
                            $set: recipeDoc,
                            $setOnInsert: {
                                id: `recipe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                createdAt: new Date(),
                                status: 'active',
                                cookingStation: 'Kitchen' // Default
                            }
                        },
                        upsert: true
                    }
                };
            });

        } else {
            // Standard 1-to-1 mapping for products and ingredients imports
            operations = jsonData.map((row: any) => {
                const doc: any = {
                    ...row,
                    updatedAt: new Date(),
                };

                // Normalize numbers
                if (doc.costPerUnit) doc.costPerUnit = Number(doc.costPerUnit) || 0;
                if (doc.sellingPrice) doc.sellingPrice = Number(doc.sellingPrice) || 0;
                if (doc.markup) doc.markup = Number(doc.markup) || 0;
                if (doc.yield) doc.yield = Number(doc.yield) || 0;

                // Auto-calculate markup if missing but cost and price exist
                if ((!doc.markup || doc.markup === 0) && doc.costPerUnit > 0 && doc.sellingPrice > 0) {
                    const calculatedMarkup = ((doc.sellingPrice - doc.costPerUnit) / doc.costPerUnit) * 100;
                    doc.markup = parseFloat(calculatedMarkup.toFixed(2));
                }

                // Generate/Ensure code if missing for products
                if (!doc.code && type === 'products') {
                    // Simple fallback, ideally should be autoincrement
                    doc.code = Math.random().toString(36).substring(2, 8).toUpperCase();
                }

                if (doc.code) doc.code = String(doc.code).trim();

                const filter = doc.code ? { code: doc.code } : { name: row.name };

                const newId = type === 'products'
                    ? `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                    : `item-${Date.now()}`;

                return {
                    updateOne: {
                        filter: filter,
                        update: {
                            $set: doc,
                            $setOnInsert: {
                                id: newId,
                                createdAt: new Date(),
                                status: 'active'
                            }
                        },
                        upsert: true
                    }
                };
            });
        }

        console.log("Executing bulkWrite for", type, "count:", operations.length);
        const result = await collection.bulkWrite(operations);
        // console.log("BulkWrite result:", result);

        const upsertedIndexes = new Set(Object.keys(result.upsertedIds).map(k => parseInt(k)));
        const createdItems: string[] = [];
        const updatedItems: string[] = [];

        jsonData.forEach((row: any, index: number) => {
            const name = row.name || 'Unknown';
            if (upsertedIndexes.has(index)) {
                createdItems.push(name);
            } else {
                updatedItems.push(name);
            }
        });

        return NextResponse.json({
            success: true,
            count: operations.length,
            createdCount: result.upsertedCount,
            updatedCount: result.matchedCount,
            updatedItems: updatedItems,
            message: `Processed ${operations.length} items`
        });
    }
    catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
