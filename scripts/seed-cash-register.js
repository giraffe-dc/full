const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('giraffe');

        // 1. Departments
        const departments = [
            { name: 'Основний зал', icon: 'main_hall', status: 'active' },
            { name: 'Тераса', icon: 'terrace', status: 'active' },
            { name: 'VIP кімната', icon: 'vip', status: 'active' },
        ];

        console.log('Seeding departments...');
        await db.collection('departments').deleteMany({});
        const deptResult = await db.collection('departments').insertMany(departments);
        console.log('Inserted departments:', deptResult.insertedIds);

        const deptIds = Object.values(deptResult.insertedIds);

        // 2. Tables
        // Main Hall (Dept 0)
        const mainHallTables = Array.from({ length: 10 }, (_, i) => ({
            name: `Стіл ${i + 1}`,
            departmentId: deptIds[0],
            seats: 0,
            status: 'free',
            x: (i % 5) * 100, // Mock layout coordinates
            y: Math.floor(i / 5) * 100,
        }));

        // Terrace (Dept 1)
        const terraceTables = Array.from({ length: 6 }, (_, i) => ({
            name: `T-${i + 1}`,
            departmentId: deptIds[1],
            seats: 2,
            status: 'free',
            x: (i % 3) * 100,
            y: Math.floor(i / 3) * 100,
        }));

        // VIP (Dept 2)
        const vipTables = Array.from({ length: 2 }, (_, i) => ({
            name: `VIP-${i + 1}`,
            departmentId: deptIds[2],
            seats: 8,
            status: 'free',
            x: i * 200,
            y: 0,
        }));

        console.log('Seeding tables...');
        await db.collection('tables').deleteMany({});
        const tables = [...mainHallTables, ...terraceTables, ...vipTables];
        await db.collection('tables').insertMany(tables);
        console.log(`Inserted ${tables.length} tables`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();
