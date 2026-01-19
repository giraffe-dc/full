import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUserFromReq(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as Record<string, any>;
        return payload;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 

        const client = await clientPromise;
        const db = client.db("giraffe");

        // 1. Get Global Settings for default accounts
        const settings = await db.collection("settings").findOne({ type: "global" });
        const financeSettings = settings?.finance || {};
        const cashAccountId = financeSettings.cashAccountId;
        const cardAccountId = financeSettings.cardAccountId;
        const safeAccountId = financeSettings.safeAccountId;

        // 2. Get All Accounts
        const accounts = await db.collection("money_accounts")
            .find({})
            .sort({ name: 1 })
            .toArray();

        // 3. Get All Transactions and aggregate by account
        const transactions = await db.collection("transactions").find({}).toArray();
        const stockMovements = await db.collection("stock_movements").find({ type: 'supply', paidAmount: { $gt: 0 } }).toArray();

        // 4. Get Cash Register Transactions
        const cashTransactions = await db.collection("cash_transactions").find({}).toArray();

        // Helper to find account ID for a transaction
        const getTxAccountId = (tx: any) => {
            if (tx.moneyAccountId) return tx.moneyAccountId;

            // Fallback to defaults based on payment method
            if (tx.paymentMethod === 'cash' && cashAccountId) return cashAccountId;
            if (tx.paymentMethod === 'card' && cardAccountId) return cardAccountId;

            return null;
        };

        // Initialize balance map with Initial Balances from DB
        const accountBalances: Record<string, number> = {};
        accounts.forEach(acc => {
            // Use initialBalance if present, otherwise fallback to balance (legacy)
            const startBal = (acc.initialBalance !== undefined) ? Number(acc.initialBalance) : (Number(acc.balance) || 0);
            accountBalances[acc._id.toString()] = startBal;
        });

        // Process Transactions (Income/Expense/Transfer?)
        transactions.forEach(tx => {
            const accId = getTxAccountId(tx);
            if (accId && accountBalances[accId] !== undefined) {
                const amt = Number(tx.amount) || 0;
                if (tx.type === 'income') {
                    accountBalances[accId] += amt;
                } else if (tx.type === 'expense') {
                    accountBalances[accId] -= amt;
                }
            }
        });

        // Process Stock Supplies (Expenses)
        stockMovements.forEach(supply => {
            const accId = getTxAccountId(supply);
            if (accId && accountBalances[accId] !== undefined) {
                const amt = Number(supply.paidAmount) || 0;
                accountBalances[accId] -= amt; // Supplies are expenses
            }
        });

        // Process Cash Register Transactions
        cashTransactions.forEach(ct => {
            const amt = Number(ct.amount) || 0;

            // Standard Cash Account Impact
            if (cashAccountId && accountBalances[cashAccountId] !== undefined) {
                if (ct.type === 'income') {
                    accountBalances[cashAccountId] += amt;
                } else if (ct.type === 'expense' || ct.type === 'incasation') {
                    accountBalances[cashAccountId] -= amt;
                }
            }

            // Incasation: Add to Safe Account
            if (ct.type === 'incasation' && safeAccountId && accountBalances[safeAccountId] !== undefined) {
                accountBalances[safeAccountId] += amt;
            }
        });

        const data = accounts.map(a => ({
            id: a._id.toString(),
            name: a.name,
            type: a.type || 'cash',
            balance: accountBalances[a._id.toString()] || 0, // Calculated Total Balance
            initialBalance: (a.initialBalance !== undefined) ? a.initialBalance : (a.balance || 0), // Explicit Initial Balance
            currency: a.currency || 'UAH',
            description: a.description || '',
            status: a.status || 'active',
        }));

        return NextResponse.json({ data });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromReq(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, type, initialBalance, description, currency } = await req.json();

        if (!name || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        const newAccount = {
            name,
            type, // 'cash', 'card', 'bank'
            initialBalance: Number(initialBalance) || 0, // New standard field
            balance: Number(initialBalance) || 0, // Keep legacy field in sync just in case, or ignore it? Let's populate it for safety but not rely on it.
            currency: currency || 'UAH',
            description: description || '',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("money_accounts").insertOne(newAccount);

        return NextResponse.json({ ok: true, id: result.insertedId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
