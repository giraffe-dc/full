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

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Date Filter Construction
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            dateFilter.$lte = endD;
        }
        const matchDate = (field: string) => (Object.keys(dateFilter).length ? { [field]: dateFilter } : {});

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
        const periodTransactions = Object.keys(dateFilter).length
            ? await db.collection("transactions").find({ ...matchDate("date") }).toArray()
            : transactions;

        const stockMovements = await db.collection("stock_movements").find({ type: 'supply', paidAmount: { $gt: 0 } }).toArray();
        const periodStockMovements = Object.keys(dateFilter).length
            ? await db.collection("stock_movements").find({ type: 'supply', paidAmount: { $gt: 0 }, ...matchDate("date") }).toArray()
            : stockMovements;

        // 4. Get Cash Register Transactions
        const cashTransactions = await db.collection("cash_transactions").find({}).toArray();
        const periodCashTransactions = Object.keys(dateFilter).length
            ? await db.collection("cash_transactions").find({ ...matchDate("createdAt") }).toArray()
            : cashTransactions;

        // 5. Get Receipts (Income)
        const receipts = await db.collection("receipts").find({}).toArray();
        const periodReceipts = Object.keys(dateFilter).length
            ? await db.collection("receipts").find({ ...matchDate("createdAt") }).toArray()
            : receipts;

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

        // Process Transactions (Income/Expense/Transfer)
        transactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;

            if (tx.type === 'transfer') {
                const fromId = tx.moneyAccountId;
                const toId = tx.toMoneyAccountId;

                if (fromId && accountBalances[fromId] !== undefined) {
                    accountBalances[fromId] -= amt;
                }
                if (toId && accountBalances[toId] !== undefined) {
                    accountBalances[toId] += amt;
                }
            } else {
                const accId = getTxAccountId(tx);
                if (accId && accountBalances[accId] !== undefined) {
                    if (tx.type === 'income') {
                        accountBalances[accId] += amt;
                    } else if (tx.type === 'expense') {
                        accountBalances[accId] -= amt;
                    }
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

        // Process Receipts (Income) - DISABLED to avoid double counting
        // Receipts now generate 'transactions' with source='pos', so we count them in the transactions loop.
        /*
        receipts.forEach(r => {
            if (r.paymentMethod === 'mixed') {
                if (cashAccountId && accountBalances[cashAccountId] !== undefined && r.paymentDetails?.cash) {
                    accountBalances[cashAccountId] += (Number(r.paymentDetails.cash) || 0);
                }
                if (cardAccountId && accountBalances[cardAccountId] !== undefined && r.paymentDetails?.card) {
                    accountBalances[cardAccountId] += (Number(r.paymentDetails.card) || 0);
                }
            } else {
                const accId = getTxAccountId(r);
                if (accId && accountBalances[accId] !== undefined) {
                    accountBalances[accId] += (Number(r.total) || 0);
                }
            }
        });
        */

        // Calculate Period Turnovers
        const periodIncome: Record<string, number> = {};
        const periodExpense: Record<string, number> = {};
        accounts.forEach(acc => {
            periodIncome[acc._id.toString()] = 0;
            periodExpense[acc._id.toString()] = 0;
        });

        periodTransactions.forEach(tx => {
            const amt = Number(tx.amount) || 0;

            if (tx.type === 'transfer') {
                const fromId = tx.moneyAccountId;
                const toId = tx.toMoneyAccountId;

                if (fromId && periodExpense[fromId] !== undefined) {
                    periodExpense[fromId] += amt;
                }
                if (toId && periodIncome[toId] !== undefined) {
                    periodIncome[toId] += amt;
                }
            } else {
                const accId = getTxAccountId(tx);
                if (accId && periodIncome[accId] !== undefined) {
                    if (tx.type === 'income') {
                        periodIncome[accId] += amt;
                    } else if (tx.type === 'expense') {
                        periodExpense[accId] += amt;
                    }
                }
            }
        });

        periodStockMovements.forEach(s => {
            const accId = getTxAccountId(s);
            if (accId && periodExpense[accId] !== undefined) {
                periodExpense[accId] += (Number(s.paidAmount) || 0);
            }
        });

        periodCashTransactions.forEach(ct => {
            const amt = Number(ct.amount) || 0;
            if (cashAccountId && periodIncome[cashAccountId] !== undefined) {
                if (ct.type === 'income') periodIncome[cashAccountId] += amt;
                else if (ct.type === 'expense' || ct.type === 'incasation') periodExpense[cashAccountId] += amt;
            }
            if (ct.type === 'incasation' && safeAccountId && periodIncome[safeAccountId] !== undefined) {
                periodIncome[safeAccountId] += amt;
            }
        });

        /*
        periodReceipts.forEach(r => {
            if (r.paymentMethod === 'mixed') {
                if (cashAccountId && periodIncome[cashAccountId] !== undefined && r.paymentDetails?.cash) {
                    periodIncome[cashAccountId] += (Number(r.paymentDetails.cash) || 0);
                }
                if (cardAccountId && periodIncome[cardAccountId] !== undefined && r.paymentDetails?.card) {
                    periodIncome[cardAccountId] += (Number(r.paymentDetails.card) || 0);
                }
            } else {
                const accId = getTxAccountId(r);
                if (accId && periodIncome[accId] !== undefined) {
                    periodIncome[accId] += (Number(r.total) || 0);
                }
            }
        });
        */

        const data = accounts.map(a => ({
            id: a._id.toString(),
            name: a.name,
            type: a.type || 'cash',
            balance: accountBalances[a._id.toString()] || 0,
            periodIncome: periodIncome[a._id.toString()] || 0,
            periodExpense: periodExpense[a._id.toString()] || 0,
            initialBalance: (a.initialBalance !== undefined) ? a.initialBalance : (a.balance || 0),
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
