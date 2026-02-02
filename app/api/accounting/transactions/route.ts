import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

async function getUserFromReq(req: NextRequest) {
  const token = req.cookies?.get?.("token")?.value ?? null;
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
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // skipping auth for now as per other routes

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeReceipts = searchParams.get("includeReceipts") === "true";
    const includeCashTx = searchParams.get("includeCashTx") === "true"; // New flag
    const moneyAccountId = searchParams.get("moneyAccountId");

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

    // 1. Fetch Manual Transactions
    const txPromise = db.collection("transactions")
      .find({
        ...matchDate("date"),
        source: { $ne: "cash-register" }
      })
      .toArray();

    // 2. Fetch Stock Supplies (Expenses)
    const suppliesPromise = db.collection("stock_movements")
      .find({
        type: 'supply',
        ...matchDate("date"),
        paidAmount: { $gt: 0 }
      })
      .toArray();

    // 3. Fetch Receipts (Income)
    const receiptsPromise = includeReceipts || moneyAccountId
      ? db.collection("receipts").find({ ...matchDate("createdAt") }).toArray()
      : Promise.resolve([]);

    // 4. Fetch Cash Transactions (Income/Expense/Incasation)
    const cashTxPromise = includeCashTx || moneyAccountId
      ? db.collection("cash_transactions").find({ ...matchDate("createdAt") }).toArray()
      : Promise.resolve([]);

    // 5. Fetch Settings for Account Resolution
    const settingsPromise = db.collection("settings").findOne({ type: "global" });

    // 6. Fetch Account if moneyAccountId is provided to calculate opening/closing balance
    const accountPromise = moneyAccountId
      ? db.collection("money_accounts").findOne({ _id: new ObjectId(moneyAccountId) })
      : Promise.resolve(null);

    const [txRaw, suppliesRaw, receiptsRaw, cashTxRaw, settings, accountDoc] = await Promise.all([
      txPromise,
      suppliesPromise,
      receiptsPromise,
      cashTxPromise,
      settingsPromise,
      accountPromise
    ]);

    // Resolve Cash Account ID from Settings
    const financeSettings = settings?.finance || {};
    const cashAccountId = financeSettings.cashAccountId;
    const cardAccountId = financeSettings.cardAccountId;
    const safeAccountId = financeSettings.safeAccountId;

    const transactions = [
      // Manual
      ...txRaw.map((t: any) => ({
        ...t,
        _id: t._id.toString(),
        date: t.date,
        category: t.category || "other",
        source: "manual",
        paymentMethod: t.paymentMethod || "cash",
        type: t.type || "income",
        amount: t.amount || 0,
        moneyAccountId: t.moneyAccountId || (t.paymentMethod === 'cash' ? cashAccountId : t.paymentMethod === 'card' ? cardAccountId : null)
      })),
      // Receipts -> Income
      ...receiptsRaw.flatMap((r: any) => {
        const items = [];
        if (r.paymentMethod === 'mixed') {
          if (r.paymentDetails?.cash) {
            items.push({
              _id: r._id.toString() + '_cash',
              date: r.createdAt,
              description: `Чек #${r.receiptNumber} (Готівка)`,
              amount: r.paymentDetails.cash,
              type: 'income',
              category: 'sales',
              paymentMethod: 'cash',
              source: 'pos',
              visits: 1,
              createdAt: r.createdAt,
              moneyAccountId: cashAccountId
            });
          }
          if (r.paymentDetails?.card) {
            items.push({
              _id: r._id.toString() + '_card',
              date: r.createdAt,
              description: `Чек #${r.receiptNumber} (Картка)`,
              amount: r.paymentDetails.card,
              type: 'income',
              category: 'sales',
              paymentMethod: 'card',
              source: 'pos',
              visits: 0, // avoid double counting visits
              createdAt: r.createdAt,
              moneyAccountId: cardAccountId
            });
          }
        } else {
          items.push({
            _id: r._id.toString(),
            date: r.createdAt,
            description: `Чек #${r.receiptNumber}`,
            amount: r.total,
            type: 'income',
            category: 'sales',
            paymentMethod: r.paymentMethod,
            source: 'pos',
            visits: 1,
            createdAt: r.createdAt,
            moneyAccountId: r.paymentMethod === 'cash' ? cashAccountId : r.paymentMethod === 'card' ? cardAccountId : null
          });
        }
        return items;
      }),
      // Cash Register Transactions (Income/Expense/Incasation)
      ...cashTxRaw.flatMap((ct: any) => {
        const items = [];
        const amt = Number(ct.amount) || 0;

        // Impact on Cash Account
        if (cashAccountId) {
          items.push({
            _id: ct._id.toString(),
            date: ct.createdAt,
            description: ct.comment || (ct.type === 'incasation' ? 'Інкасація (вилучення)' : (ct.type === 'income' ? 'Внесення' : 'Витрата')),
            amount: amt,
            type: ct.type,
            category: ct.category || (ct.type === 'incasation' ? 'incasation' : 'other'),
            paymentMethod: 'cash',
            source: 'cash-register',
            createdAt: ct.createdAt,
            moneyAccountId: cashAccountId
          });
        }

        // Impact on Safe Account for Incasation
        if (ct.type === 'incasation' && safeAccountId) {
          items.push({
            _id: ct._id.toString() + '_safe',
            date: ct.createdAt,
            description: `Інкасація (надходження в сейф) ${ct.comment || ''}`,
            amount: amt,
            type: 'incasation',
            category: 'incasation',
            paymentMethod: 'transfer',
            source: 'cash-register',
            createdAt: ct.createdAt,
            moneyAccountId: safeAccountId
          });
        }
        return items;
      }),
      // Supplies -> Expense
      ...suppliesRaw.map((s: any) => ({
        _id: s._id.toString(),
        date: s.date,
        description: `Постачання: ${s.supplierName || 'Unknown'}`,
        amount: s.paidAmount || 0,
        type: 'expense',
        category: 'stock',
        paymentMethod: s.paymentMethod || 'cash',
        source: 'stock',
        createdAt: s.createdAt || s.date,
        moneyAccountId: s.moneyAccountId || (s.paymentMethod === 'cash' ? cashAccountId : s.paymentMethod === 'card' ? cardAccountId : null)
      }))
    ];

    // Filter by Type/Category/Source if searchParams present
    let filtered = transactions;
    const pType = searchParams.get("type");
    const pCat = searchParams.get("category");
    const pMethod = searchParams.get("paymentMethod");
    const pSource = searchParams.get("source");

    if (pType) filtered = filtered.filter(t => t.type === pType);
    if (pCat) filtered = filtered.filter(t => t.category === pCat);
    if (pMethod) filtered = filtered.filter(t => t.paymentMethod === pMethod);
    if (pSource) filtered = filtered.filter(t => t.source === pSource);
    if (moneyAccountId) filtered = filtered.filter(t => t.moneyAccountId === moneyAccountId);

    // Sort Descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate totals
    const totals = filtered.reduce<{ income: number; expense: number; balance: number; incasation: number; safeBalance: number }>(
      (acc, t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === "income") {
          acc.income += amt;
        } else if (t.type === "incasation") {
          acc.incasation += amt;
        } else {
          acc.expense += amt;
        }
        acc.balance = acc.income - acc.expense - acc.incasation;
        acc.safeBalance = acc.incasation - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0, incasation: 0, safeBalance: 0 }
    );

    // Calculate Opening and Closing Balances if account is specified
    let openingBalance = 0;
    let closingBalance = 0;

    if (moneyAccountId && accountDoc) {
      // 1. Start with account initial balance
      const initialBal = (accountDoc.initialBalance !== undefined) ? Number(accountDoc.initialBalance) : (Number(accountDoc.balance) || 0);

      // 2. We need to calculate balance BEFORE startDate
      // This is complex because we filtered everything already.
      // Let's perform a separate aggregation for the balance at startDate

      const startD = startDate ? new Date(startDate) : null;

      // For simplicity and performance, we'll fetch all impact before startDate
      // Note: In a production app, we might store daily snapshots or use a more efficient ledger

      const [preTx, preSupplies, preReceipts, preCashTx] = await Promise.all([
        db.collection("transactions").find({ moneyAccountId, date: { $lt: startD } }).toArray(),
        db.collection("stock_movements").find({ moneyAccountId, type: 'supply', date: { $lt: startD } }).toArray(),
        // Receipts and CashTx are trickier because they use defaults if no accountId
        // But for "History" we usually care about the account they WERE assigned to.
        // If moneyAccountId is the default cash/card account, we include them.
        (financeSettings.cashAccountId === moneyAccountId || financeSettings.cardAccountId === moneyAccountId)
          ? db.collection("receipts").find({
            createdAt: { $lt: startD },
            paymentMethod: financeSettings.cashAccountId === moneyAccountId ? 'cash' : 'card'
          }).toArray()
          : Promise.resolve([]),
        financeSettings.cashAccountId === moneyAccountId || financeSettings.safeAccountId === moneyAccountId
          ? db.collection("cash_transactions").find({ createdAt: { $lt: startD } }).toArray()
          : Promise.resolve([])
      ]);

      let preBalance = initialBal;
      preTx.forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        preBalance += (t.type === 'income' ? amt : -amt);
      });
      preSupplies.forEach((s: any) => {
        preBalance -= (Number(s.paidAmount) || 0);
      });
      preReceipts.forEach((r: any) => {
        // Handle Mixed Payments
        if (r.paymentMethod === 'mixed') {
          if (moneyAccountId === financeSettings.cashAccountId && r.paymentDetails?.cash) {
            preBalance += (Number(r.paymentDetails.cash) || 0);
          }
          if (moneyAccountId === financeSettings.cardAccountId && r.paymentDetails?.card) {
            preBalance += (Number(r.paymentDetails.card) || 0);
          }
        } else {
          // Standard Payments
          if (r.paymentMethod === 'cash' && moneyAccountId === financeSettings.cashAccountId) {
            preBalance += (Number(r.total) || 0);
          } else if (r.paymentMethod === 'card' && moneyAccountId === financeSettings.cardAccountId) {
            preBalance += (Number(r.total) || 0);
          }
        }
      });
      preCashTx.forEach((ct: any) => {
        const amt = Number(ct.amount) || 0;
        if (moneyAccountId === financeSettings.cashAccountId) {
          preBalance += (ct.type === 'income' ? amt : -amt);
        } else if (ct.type === 'incasation' && moneyAccountId === financeSettings.safeAccountId) {
          preBalance += amt;
        }
      });

      openingBalance = preBalance;
      closingBalance = openingBalance + totals.balance;
    }

    // Slice for pagination if needed
    const resultData = filtered.slice(0, 500);

    return NextResponse.json({
      data: resultData,
      totals,
      openingBalance,
      closingBalance
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromReq(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      date,
      description,
      amount,
      type = "income",
      category = "other",
      paymentMethod = "cash",
      source = "manual",
      visits,
      moneyAccountId, // Optional: Explicitly selected account
    } = await req.json();

    if (!description || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");

    let targetAccountId: ObjectId | null = null;

    // 1. Resolve Account
    if (moneyAccountId) {
      try { targetAccountId = new ObjectId(moneyAccountId); } catch (e) { }
    }

    // 2. If no explicit account, try defaults from Settings
    if (!targetAccountId) {
      const settings = await db.collection("settings").findOne({ type: "global" });
      if (settings && settings.finance) {
        if (paymentMethod === 'cash' && settings.finance.cashAccountId) {
          try { targetAccountId = new ObjectId(settings.finance.cashAccountId); } catch (e) { }
        } else if (paymentMethod === 'card' && settings.finance.cardAccountId) {
          try { targetAccountId = new ObjectId(settings.finance.cardAccountId); } catch (e) { }
        }
      }
    }

    const session = client.startSession();
    let insertId;

    try {
      await session.withTransaction(async () => {
        const numericAmount = Number(amount);

        // 3. Create Transaction
        const result = await db.collection("transactions").insertOne({
          date: date ? new Date(date) : new Date(),
          description,
          amount: numericAmount,
          type,
          category,
          paymentMethod,
          source,
          visits: visits !== undefined ? Number(visits) || 0 : undefined,
          createdBy: user.sub,
          createdAt: new Date(),
          updatedAt: new Date(),
          moneyAccountId: targetAccountId ? targetAccountId.toString() : null
        }, { session });

        insertId = result.insertedId;

        // 4. Update Account Balance if linked
        // REMOVED: Balance is now calculated dynamically. 
        // We do NOT update money_accounts.balance here anymore.
        /*
        if (targetAccountId) {
          const balanceChange = type === 'income' ? numericAmount : -numericAmount;
          await db.collection("money_accounts").updateOne(
            { _id: targetAccountId },
            {
              $inc: { balance: balanceChange },
              $set: { updatedAt: new Date() }
            },
            { session }
          );
        }
        */
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ ok: true, id: insertId }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
