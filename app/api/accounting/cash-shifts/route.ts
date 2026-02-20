
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const shiftsCollection = db.collection('cash_shifts');
    const receiptsCollection = db.collection('receipts');
    const transactionsCollection = db.collection('transactions');

    // Fetch shifts sorts by newest first
    const shiftsRaw = await shiftsCollection.find({}).sort({ openedAt: -1 }).toArray();

    const shifts = await Promise.all(shiftsRaw.map(async (shift: any) => {
      const shiftId = shift._id.toString();
      const start = new Date(shift.startTime);
      const end = shift.endTime ? new Date(shift.endTime) : new Date();

      const cashTransactionsCollection = db.collection('cash_transactions');

      // 1. Fetch Receipts linked to this shift
      let shiftReceipts = [];
      try {
        shiftReceipts = await receiptsCollection.find({ shiftId: new ObjectId(shiftId) }).toArray();
      } catch (e) {
        shiftReceipts = await receiptsCollection.find({
          createdAt: { $gte: start, $lte: end }
        }).toArray();
      }

      const cashRevenue = shiftReceipts
        .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed')
        .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.cash || 0) : r.total), 0);

      const cashlessRevenue = shiftReceipts
        .filter((r: any) => r.paymentMethod === 'card' || r.paymentMethod === 'mixed')
        .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.paymentDetails?.card || 0) : r.total), 0);

      // 2. Fetch Manual Cash Transactions (Income/Expense/Incasation)
      // Use shiftId if possible, else date range
      let cashTxs = [];
      try {
        cashTxs = await cashTransactionsCollection.find({ shiftId: new ObjectId(shiftId) }).toArray();
      } catch (e) {
        cashTxs = await cashTransactionsCollection.find({ createdAt: { $gte: start, $lte: end } }).toArray();
      }

      // 3. Fetch General Transactions ( Legacy/Other sources) - optional/legacy check
      // We keep this if there are manual transactions from accounting linked to this time, 
      // but usually cash register ops are in cash_transactions now.
      const txs = await transactionsCollection.find({
        date: { $gte: start, $lte: end },
        source: { $ne: 'cash-register' }
      }).toArray();

      let income = 0;
      let expenses = 0;
      let incasation = 0;

      const detailedTransactions = [];

      // Add Shift Open/Close events
      detailedTransactions.push({
        id: `open-${shiftId}`,
        type: 'Відкриття зміни',
        createdAt: new Date(shift.startTime).toISOString(),
        amount: shift.openingBalance,
        authorName: shift.cashier,
        comment: '',
        editedBy: '—'
      });

      if (shift.endTime) {
        detailedTransactions.push({
          id: `close-cash-${shiftId}`,
          type: 'Закриття готівкової каси',
          createdAt: new Date(shift.endTime).toISOString(),
          amount: cashRevenue,
          authorName: shift.cashier,
          comment: '',
          editedBy: '—'
        });
        detailedTransactions.push({
          id: `close-card-${shiftId}`,
          type: 'Закриття безготівкової каси',
          createdAt: new Date(shift.endTime).toISOString(),
          amount: cashlessRevenue,
          authorName: shift.cashier,
          comment: '',
          editedBy: '—'
        });
      }

      // Process Cash Transactions (The main ones for the shift)
      cashTxs.forEach((ct: any) => {
        const amt = Number(ct.amount) || 0;
        if (ct.type === 'income') income += amt;
        if (ct.type === 'expense') expenses += amt;
        if (ct.type === 'incasation') incasation += amt;

        detailedTransactions.push({
          id: ct._id.toString(),
          type: ct.type === 'incasation' ? 'Інкасація' : (ct.category || (ct.type === 'income' ? 'Прихід' : 'Витрата')), // Map type/category to display name
          createdAt: ct.createdAt, // Ensure date string compatibility
          amount: ct.type === 'expense' || ct.type === 'incasation' ? -amt : amt, // Visual negative for expense
          authorName: ct.authorName || shift.cashier,
          comment: ct.comment,
          editedBy: '—'
        });
      });

      // Process General Transactions (Legacy backup)
      txs.forEach((t: any) => {
        // Only include if not already covered (unlikely to have dups if sources differ)
        if (t.type === 'income') income += (t.amount || 0);
        if (t.type === 'expense') expenses += (t.amount || 0);

        detailedTransactions.push({
          id: t._id.toString(),
          type: t.category || (t.type === 'income' ? 'Прихід' : 'Витрата'),
          createdAt: t.date,
          amount: t.type === 'expense' ? -(t.amount || 0) : (t.amount || 0),
          authorName: t.user || shift.cashier,
          comment: t.description,
          editedBy: '—'
        });
      });

      // 4. Calculate Balances
      // Book Balance = Opening + Cash Revenue + Incomes - Expenses - Incasation
      const bookBalance = (shift.openingBalance || 0) + cashRevenue + income - expenses - incasation;
      const actualBalance = shift.closingBalance !== undefined ? shift.closingBalance : bookBalance;
      const difference = actualBalance - bookBalance;

      console.log(`Shift ${shiftId}: Transactions count=${detailedTransactions.length}, OpenBalance=${shift.openingBalance}, Income=${income}`);

      return {
        id: shiftId,
        shiftNumber: shift.id || shiftId.slice(-4),
        startTime: shift.startTime,
        endTime: shift.endTime,
        openingBalance: shift.openingBalance,
        totalIncasation: incasation,
        totalSalesCash: cashRevenue,

        // Detailed stats
        bookBalance: bookBalance,
        endBalance: actualBalance, // "Фактичний баланс" usually means what was counted. If open, use book or 0? 
        // Logic: If closed, use closingBalance. If open, use bookBalance (since no diff yet).
        cashDifference: difference,

        totalSalesCard: cashlessRevenue,
        totalIncome: income,
        totalExpenses: expenses,

        transactions: detailedTransactions.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()),
        status: shift.status,
        cashier: shift.cashier
      };
    }));

    return NextResponse.json({
      success: true,
      data: shifts,
      count: shifts.length,
    });
  } catch (error) {
    console.error('Error fetching cash shifts:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при отриманні касових змін' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Existing POST logic...
  try {
    const client = await clientPromise;
    const db = client.db('giraffe');
    const collection = db.collection('cashShifts');

    const body = await request.json();
    const { cashier, startTime, endTime, openingBalance, closingBalance, status, register, date, cash, cashless, difference } = body;

    const newShift = {
      cashier,
      startTime: startTime || new Date(),
      endTime: endTime || null,
      openingBalance: Number(openingBalance) || 0,
      closingBalance: Number(closingBalance) || 0, // Should be 0 initially
      status: status || 'opened',
      register: register || 'Main Register',
      date: date || new Date(),
      // Aggregated fields are calc on GET
    };

    const result = await collection.insertOne(newShift);

    return NextResponse.json(
      { success: true, data: { ...newShift, id: result.insertedId }, message: 'Касова зміна успішно створена' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating cash shift:', error);
    return NextResponse.json(
      { success: false, error: 'Помилка при створенні касової зміни' },
      { status: 500 }
    );
  }
}
