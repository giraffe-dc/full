
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

      // 1. Fetch Receipts linked to this shift
      // If shiftId is stored in receipt, use it. Ideally we should use it.
      // Fallback to date range if shiftId missing (legacy).
      const receiptQuery = shiftId ? { shiftId: new ObjectId(shiftId) } : {
        createdAt: { $gte: start, $lte: end }
      };

      let shiftReceipts = [];
      try {
        // Try searching by shiftId (ObjectId) first
        shiftReceipts = await receiptsCollection.find({ shiftId: new ObjectId(shiftId) }).toArray();
      } catch (e) {
        // Fallback if shiftId is string or not found
        shiftReceipts = await receiptsCollection.find({
          createdAt: { $gte: start, $lte: end }
        }).toArray();
      }

      const cashRevenue = shiftReceipts
        .filter((r: any) => r.paymentMethod === 'cash' || r.paymentMethod === 'mixed') // Simplified mixed
        .reduce((acc: number, r: any) => acc + (r.paymentMethod === 'mixed' ? (r.cashPart || r.total) : r.total), 0);

      const cashlessRevenue = shiftReceipts
        .filter((r: any) => r.paymentMethod === 'card')
        .reduce((acc: number, r: any) => acc + r.total, 0);

      // 2. Fetch Transactions (Income/Expense/Incasation)
      // Linking transactions to shifts is tricky if they don't have shiftId.
      // We will use Date Range for now.
      const txs = await transactionsCollection.find({
        date: { $gte: start, $lte: end },
        source: { $ne: 'cash-register' } // Exclude automatic sales transactions to avoid double counting if they exist
      }).toArray();

      // Separate transactions
      let income = 0;
      let expenses = 0;
      let incasation = 0;

      const detailedTransactions = [];

      // Add Shift Open/Close events as pseudo-transactions for UI
      detailedTransactions.push({
        id: `open-${shiftId}`,
        category: 'Відкриття зміни',
        time: new Date(shift.startTime).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
        sum: shift.openingBalance,
        employee: shift.cashier,
        comment: '',
        editedBy: '—'
      });

      if (shift.endTime) {
        detailedTransactions.push({
          id: `close-${shiftId}`,
          category: 'Закриття зміни',
          time: new Date(shift.endTime).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
          sum: shift.actualBalance || shift.currentCash || 0, // Using recorded closing balance
          employee: shift.cashier,
          comment: '',
          editedBy: '—'
        });
      }

      txs.forEach((t: any) => {
        if (t.type === 'income') income += (t.amount || 0);
        if (t.type === 'expense') expenses += (t.amount || 0);
        if (t.category === 'incasation' || t.description?.toLowerCase().includes('інкасація')) {
          incasation += (t.amount || 0);
        }

        detailedTransactions.push({
          id: t._id.toString(),
          category: t.category || (t.type === 'income' ? 'Прихід' : 'Витрата'),
          time: new Date(t.date).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
          sum: t.amount,
          employee: t.user || shift.cashier, // Fallback
          comment: t.description,
          editedBy: '—'
        });
      });

      // 3. Calculate Balances
      // Book Balance = Opening + Cash Revenue + Incomes - Expenses - Incasation
      // Note: Cashless revenue goes to bank, doesn't affect Cash Drawer Balance.
      const bookBalance = (shift.openingBalance || 0) + cashRevenue + income - expenses - incasation;
      const actualBalance = shift.closingBalance !== undefined ? shift.closingBalance : bookBalance; // If not closed, assume match or use current
      const difference = actualBalance - bookBalance;

      return {
        id: shiftId,
        shiftNumber: shift.id || shiftId.slice(-4),
        startTime: shift.startTime,
        endTime: shift.endTime,
        openingBalance: shift.openingBalance,
        incasation: incasation,
        currentCash: actualBalance,
        difference: difference,

        bookBalance: bookBalance,
        actualBalance: actualBalance,
        cashRevenue: cashRevenue,
        cashlessRevenue: cashlessRevenue,
        income: income,
        expenses: expenses,

        transactions: detailedTransactions.sort((a, b) => new Date(b.time as string).getTime() - new Date(a.time as string).getTime()), // Sort descending
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
