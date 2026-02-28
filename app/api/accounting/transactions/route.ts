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
    const receiptsPromise = includeReceipts || moneyAccountId || includeCashTx
      ? db.collection("receipts").find({ ...matchDate("createdAt") }).toArray()
      : Promise.resolve([]);

    // 3.5 Fetch Closed Shifts for summaries
    const shiftsPromise = includeReceipts || moneyAccountId || includeCashTx
      ? db.collection("cash_shifts").find({
        status: 'closed',
        ...matchDate("endTime")
      }).toArray()
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

    const [txRaw, suppliesRaw, receiptsRaw, cashTxRaw, settings, accountDoc, shiftsRaw] = await Promise.all([
      txPromise,
      suppliesPromise,
      receiptsPromise,
      cashTxPromise,
      settingsPromise,
      accountPromise,
      shiftsPromise
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
        source: t.source || "manual",
        paymentMethod: t.paymentMethod || "cash",
        type: t.type || "income",
        amount: t.amount || 0,
        moneyAccountId: t.moneyAccountId,
        toMoneyAccountId: t.toMoneyAccountId
      })),

      // Shift Summaries (Income)
      ...shiftsRaw.flatMap((s: any) => {
        const items = [];
        const shiftNum = s.shiftNumber || s._id.toString().slice(-4);

        // Calculate totals if missing (for legacy or on-the-fly sync)
        let totalSalesCash = s.totalSalesCash;
        let totalSalesCard = s.totalSalesCard;
        let totalGuests = s.totalGuests || 0;

        if (totalSalesCash === undefined || totalSalesCard === undefined || totalGuests === 0) {
          const shiftReceipts = receiptsRaw.filter((r: any) =>
            r.shiftId?.toString() === s._id.toString() ||
            (new Date(r.createdAt) >= new Date(s.startTime) && new Date(r.createdAt) <= new Date(s.endTime))
          );

          totalSalesCash = shiftReceipts
            .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
            .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.cash || 0) : r.total), 0);

          totalSalesCard = shiftReceipts
            .filter((r: any) => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
            .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.card || 0) : r.total), 0);

          totalGuests = shiftReceipts.reduce((acc: number, r: any) => acc + (Number(r.guestsCount) || 1), 0);
        }

        // Cash Sales
        if (totalSalesCash > 0) {
          items.push({
            _id: s._id.toString() + '_cash',
            date: s.endTime,
            description: `Закриття готівкової каси (Зміна #${shiftNum})`,
            amount: totalSalesCash,
            type: 'income',
            category: 'sales',
            paymentMethod: 'cash',
            source: 'pos',
            visits: totalGuests, // Use total guests from shift as visits
            createdAt: s.endTime,
            moneyAccountId: cashAccountId
          });
        }

        // Card Sales
        if (totalSalesCard > 0) {
          items.push({
            _id: s._id.toString() + '_card',
            date: s.endTime,
            description: `Закриття безготівкової каси (Зміна #${shiftNum})`,
            amount: totalSalesCard,
            type: 'income',
            category: 'sales',
            paymentMethod: 'card',
            source: 'pos',
            visits: 0, // Avoid double counting visits as they are already in cash row
            createdAt: s.endTime,
            moneyAccountId: cardAccountId
          });
        }
        return items;
      }),

      // Receipts -> Income (Fallback for open shifts or standalone checks)
      ...receiptsRaw.filter((r: any) => !r.shiftId).flatMap((r: any) => {
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
              visits: Number(r.guestsCount) || 1,
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
            visits: Number(r.guestsCount) || 1,
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
            type: ct.type === 'incasation' ? 'expense' : ct.type, // Treatment for balance
            category: ct.category || (ct.type === 'incasation' ? 'incasation' : 'other'),
            paymentMethod: 'cash',
            source: 'cash-register',
            createdAt: ct.createdAt,
            moneyAccountId: cashAccountId,
            toMoneyAccountId: ct.type === 'incasation' ? safeAccountId : undefined
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

    // If we are looking for a specific account, check both from/to
    if (moneyAccountId) {
      filtered = filtered.filter(t => t.moneyAccountId === moneyAccountId || t.toMoneyAccountId === moneyAccountId);
    }

    // Sort Descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate totals
    const totals = filtered.reduce<{ income: number; expense: number; balance: number; incasation: number; safeBalance: number }>(
      (acc, t) => {
        const amt = Number(t.amount) || 0;

        // If specific account mode
        if (moneyAccountId) {
          if (t.type === 'transfer') {
            if (t.moneyAccountId === moneyAccountId) acc.expense += amt;
            if (t.toMoneyAccountId === moneyAccountId) acc.income += amt;
          } else {
            if (t.type === "income") acc.income += amt;
            else acc.expense += amt;
          }
        } else {
          // Global mode
          if (t.type === "income") acc.income += amt;
          else if (t.type === "expense") acc.expense += amt;
          // transfers cancel out globally
        }

        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0, incasation: 0, safeBalance: 0 }
    );

    let openingBalance = 0;
    let closingBalance = 0;

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
      moneyAccountId,
      toMoneyAccountId, // Target account for transfers
    } = await req.json();

    if (!description || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("giraffe");

    const session = client.startSession();
    let insertId;

    try {
      await session.withTransaction(async () => {
        const numericAmount = Number(amount);
        const activeShift = await db.collection("cash_shifts").findOne({ status: "open" });

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
          moneyAccountId: moneyAccountId || null,
          toMoneyAccountId: toMoneyAccountId || null,
          shiftId: activeShift ? activeShift._id : null
        }, { session });

        insertId = result.insertedId;
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
