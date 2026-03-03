import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import type {
    PnLData,
    PnLComparison,
    PnLVariance,
    PnLVariancePercent,
    FinancialRatios,
    CategoryItem,
    DailyPoint,
    ComparisonPeriod,
} from "../../../../types/accounting";

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate date range for comparison period
 */
function getComparisonDateRange(
    startDate: Date,
    endDate: Date,
    comparisonType: ComparisonPeriod
): { startDate: Date; endDate: Date } {
    let start = new Date(startDate);
    let end = new Date(endDate);

    if (comparisonType === "previous") {
        // Previous period: shift back by the duration of current period
        const durationMs = end.getTime() - start.getTime();
        end = new Date(start.getTime() - 1); // One ms before current start
        start = new Date(end.getTime() - durationMs);
    } else if (comparisonType === "same_last_year") {
        // Same period last year: shift back by 1 year
        start.setFullYear(start.getFullYear() - 1);
        end.setFullYear(end.getFullYear() - 1);
    }

    return { startDate: start, endDate: end };
}

/**
 * Build date filter for MongoDB query
 */
function buildDateFilter(
    startDate?: string,
    endDate?: string,
    field: string = "date"
): Record<string, any> {
    const filter: Record<string, any> = {};
    if (startDate) filter.$gte = new Date(startDate);
    if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        filter.$lte = endD;
    }
    return Object.keys(filter).length ? { [field]: filter } : {};
}

/**
 * Calculate financial ratios
 */
function calculateFinancialRatios(data: PnLData): FinancialRatios {
    const { revenue, grossProfit, operatingProfit, netProfit, ebitda } = data;

    return {
        grossMarginPercent: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
        operatingMarginPercent: revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0,
        netMarginPercent: revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0,
        ebitdaMarginPercent:
            ebitda !== undefined && revenue.total > 0
                ? (ebitda / revenue.total) * 100
                : undefined,
    };
}

/**
 * Calculate variance between two periods
 */
function calculateVariance(
    current: PnLData,
    previous: PnLData
): { variance: PnLVariance; variancePercent: PnLVariancePercent } {
    const variance: PnLVariance = {
        revenue: current.revenue.total - previous.revenue.total,
        cogs: current.cogs.total - previous.cogs.total,
        grossProfit: current.grossProfit - previous.grossProfit,
        opex: current.opex.total - previous.opex.total,
        operatingProfit: current.operatingProfit - previous.operatingProfit,
        netProfit: current.netProfit - previous.netProfit,
    };

    const variancePercent: PnLVariancePercent = {
        revenue:
            previous.revenue.total !== 0
                ? (variance.revenue / Math.abs(previous.revenue.total)) * 100
                : 0,
        cogs:
            previous.cogs.total !== 0
                ? (variance.cogs / Math.abs(previous.cogs.total)) * 100
                : 0,
        grossProfit:
            previous.grossProfit !== 0
                ? (variance.grossProfit / Math.abs(previous.grossProfit)) * 100
                : 0,
        opex:
            previous.opex.total !== 0
                ? (variance.opex / Math.abs(previous.opex.total)) * 100
                : 0,
        operatingProfit:
            previous.operatingProfit !== 0
                ? (variance.operatingProfit / Math.abs(previous.operatingProfit)) * 100
                : 0,
        netProfit:
            previous.netProfit !== 0
                ? (variance.netProfit / Math.abs(previous.netProfit)) * 100
                : 0,
    };

    return { variance, variancePercent };
}

/**
 * Aggregate revenue from all sources
 * Revenue sources:
 * 1. Cash register sales (shifts)
 * 2. Standalone receipts
 * 3. Manual income transactions (excluding transfers/incasation)
 * 4. Cash register income transactions
 */
async function aggregateRevenue(
    db: any,
    dateFilter: Record<string, any>,
    receiptsRaw: any[],
    shiftsRaw: any[],
    cashTxRaw: any[]
): Promise<{ total: number; categories: CategoryItem[] }> {
    const revenueByCategory: Record<string, number> = {};

    // ============================================
    // 1. CASH REGISTER SALES (from closed shifts)
    // ============================================
    for (const s of shiftsRaw) {
        let totalSalesCash = s.totalSalesCash;
        let totalSalesCard = s.totalSalesCard;

        if (totalSalesCash === undefined || totalSalesCard === undefined) {
            const shiftReceipts = receiptsRaw.filter(
                (r: any) =>
                    r.shiftId?.toString() === s._id.toString() ||
                    (new Date(r.createdAt) >= new Date(s.startTime) &&
                        new Date(r.createdAt) <= new Date(s.endTime))
            );
            totalSalesCash = shiftReceipts
                .filter((r: any) => r.paymentMethod === "cash" || r.paymentMethod === "mixed")
                .reduce(
                    (acc: number, r: any) =>
                        acc +
                        (r.paymentMethod === "mixed"
                            ? r.paymentDetails?.cash || 0
                            : r.total),
                    0
                );
            totalSalesCard = shiftReceipts
                .filter((r: any) => r.paymentMethod === "card" || r.paymentMethod === "mixed")
                .reduce(
                    (acc: number, r: any) =>
                        acc +
                        (r.paymentMethod === "mixed"
                            ? r.paymentDetails?.card || 0
                            : r.total),
                    0
                );
        }

        const salesTotal = (totalSalesCash || 0) + (totalSalesCard || 0);
        if (salesTotal > 0) {
            revenueByCategory["Продажі (каса)"] =
                (revenueByCategory["Продажі (каса)"] || 0) + salesTotal;
        }
    }

    // ============================================
    // 2. STANDALONE RECEIPTS (without shift)
    // ============================================
    for (const r of receiptsRaw.filter((r: any) => !r.shiftId)) {
        const amt = r.total || 0;
        if (amt > 0) {
            revenueByCategory["Продажі (чеки)"] =
                (revenueByCategory["Продажі (чеки)"] || 0) + amt;
        }
    }

    // ============================================
    // 3. MANUAL INCOME TRANSACTIONS
    // ============================================
    const txCollection = db.collection("transactions");
    const txRaw = await txCollection
        .find({ ...dateFilter, source: { $ne: "cash-register" } })
        .toArray();

    for (const t of txRaw) {
        if (t.type === "income") {
            // EXCLUDE: transfers and incasation (not real revenue)
            if (t.category === "transfer" || t.category === "incasation") {
                continue;
            }
            
            const cat = t.category || "other";
            const label =
                cat === "sales"
                    ? "Продажі (ручні)"
                    : cat === "other"
                      ? "Інший дохід"
                      : cat;
            revenueByCategory[label] = (revenueByCategory[label] || 0) + (t.amount || 0);
        }
    }

    // ============================================
    // 4. CASH REGISTER INCOME (deposits, not sales)
    // ============================================
    for (const ct of cashTxRaw) {
        if (ct.type === "income" && ct.category !== "incasation") {
            revenueByCategory["Внесення (каса)"] =
                (revenueByCategory["Внесення (каса)"] || 0) + (Number(ct.amount) || 0);
        }
    }

    const totalRevenue = Object.values(revenueByCategory).reduce((s, v) => s + v, 0);

    return {
        total: totalRevenue,
        categories: Object.entries(revenueByCategory)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount),
    };
}

/**
 * Aggregate COGS from stock supplies AND inventory changes
 * COGS = Opening Stock + Purchases - Closing Stock
 * 
 * For restaurant/entertainment: COGS should be calculated from recipes
 * COGS = Σ(Sold Items Quantity × Recipe Cost)
 */
async function aggregateCOGS(
    db: any,
    startDate?: string,
    endDate?: string
): Promise<{ total: number; categories: CategoryItem[]; details: { openingStock: number; purchases: number; closingStock: number; recipeCOGS: number } }> {
    const cogsByCategory: Record<string, number> = {};
    const dateFilter = buildDateFilter(startDate, endDate);

    // ============================================
    // METHOD 1: COGS FROM RECIPES (Most Accurate)
    // ============================================
    // Calculate COGS from sold products based on their recipes
    let recipeCOGS = 0;
    const recipesCollection = db.collection("recipes");
    const receiptsCollection = db.collection("receipts");
    
    try {
        // Get all receipts (sales) for the period
        const receiptsRaw = await receiptsCollection
            .find({ ...buildDateFilter(startDate, endDate, "createdAt") })
            .toArray();

        // For each receipt, calculate recipe cost
        for (const receipt of receiptsRaw) {
            if (!receipt.items || !Array.isArray(receipt.items)) continue;

            for (const item of receipt.items) {
                const productName = item.name || item.productName;
                const quantity = item.quantity || 1;

                // Find recipe for this product
                const recipe = await recipesCollection.findOne({
                    productName: { $regex: new RegExp(`^${productName}$`, "i") },
                    status: "active"
                });

                if (recipe && recipe.ingredients && Array.isArray(recipe.ingredients)) {
                    // Calculate recipe cost from ingredients
                    const recipeCost = recipe.ingredients.reduce((sum: number, ing: any) => {
                        return sum + (ing.costPerUnit || 0) * (ing.quantity || 0);
                    }, 0);
                    
                    recipeCOGS += recipeCost * quantity;
                    
                    // Categorize by product category
                    const category = recipe.category || productName || "Інше";
                    cogsByCategory[category] = (cogsByCategory[category] || 0) + (recipeCost * quantity);
                }
            }
        }
    } catch (e) {
        console.error("Error calculating recipe COGS:", e);
    }

    // ============================================
    // METHOD 2: COGS FROM STOCK MOVEMENTS (Fallback)
    // ============================================
    // If no recipe data, use stock movements
    const suppliesCollection = db.collection("stock_movements");
    const suppliesRaw = await suppliesCollection
        .find({
            type: "supply",
            ...dateFilter,
            paidAmount: { $gt: 0 },
        })
        .toArray();

    let totalPurchases = 0;
    for (const s of suppliesRaw) {
        const supplier = s.supplierName || "Інше";
        const amount = s.paidAmount || 0;
        // Only add if not already counted via recipes
        if (recipeCOGS === 0) {
            cogsByCategory[supplier] = (cogsByCategory[supplier] || 0) + amount;
        }
        totalPurchases += amount;
    }

    // ============================================
    // CALCULATE INVENTORY CHANGES
    // ============================================
    
    // Opening Stock (balance before period)
    let openingStock = 0;
    if (startDate) {
        const start = new Date(startDate);
        const balancesBefore = await db
            .collection("stock_balances")
            .find({})
            .toArray();

        // Sum up all inventory value before period
        for (const balance of balancesBefore) {
            openingStock += (balance.quantity || 0) * (balance.lastCost || 0);
        }
    }

    // Closing Stock (balance at end of period)
    let closingStock = 0;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const balancesAtEnd = await db
            .collection("stock_balances")
            .find({})
            .toArray();

        // Sum up all inventory value at period end
        for (const balance of balancesAtEnd) {
            closingStock += (balance.quantity || 0) * (balance.lastCost || 0);
        }
    }

    // ============================================
    // FINAL COGS CALCULATION
    // ============================================
    // Priority: Recipe COGS > Stock-based COGS
    let totalCOGS = 0;
    
    if (recipeCOGS > 0) {
        // Use recipe-based COGS (most accurate)
        totalCOGS = recipeCOGS;
    } else {
        // Fallback to traditional formula
        // COGS = Opening Stock + Purchases - Closing Stock
        totalCOGS = openingStock + totalPurchases - closingStock;
        
        // If negative (shouldn't happen), use purchases only
        if (totalCOGS < 0) {
            console.warn("Negative COGS detected, using purchases only");
            totalCOGS = totalPurchases;
        }
    }

    // If still no categories, add purchases by supplier
    if (Object.keys(cogsByCategory).length === 0 && totalPurchases > 0) {
        for (const s of suppliesRaw) {
            const supplier = s.supplierName || "Інше";
            cogsByCategory[supplier] = (cogsByCategory[supplier] || 0) + (s.paidAmount || 0);
        }
    }

    return {
        total: totalCOGS,
        categories: Object.entries(cogsByCategory)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount),
        details: {
            openingStock,
            purchases: totalPurchases,
            closingStock,
            recipeCOGS,
        },
    };
}

/**
 * Aggregate OPEX from all expense sources
 * OPEX includes:
 * - Operating expenses (rent, utilities, marketing, etc.)
 * - Salary payments
 * - Cash register expenses
 * - Manual expense transactions (excluding stock/COGS)
 */
async function aggregateOPEX(
    db: any,
    dateFilter: Record<string, any>,
    cashTxRaw: any[]
): Promise<{ total: number; categories: CategoryItem[] }> {
    const opexByCategory: Record<string, number> = {};

    // ============================================
    // 1. MANUAL EXPENSE TRANSACTIONS
    // ============================================
    const txCollection = db.collection("transactions");
    const txRaw = await txCollection
        .find({ ...dateFilter, source: { $ne: "cash-register" } })
        .toArray();

    for (const t of txRaw) {
        if (t.type === "expense") {
            // EXCLUDE: stock purchases (already in COGS), transfers, incasation
            if (t.category === "stock" || t.category === "transfer" || t.category === "incasation") {
                continue;
            }
            
            const cat = t.category || "other";
            const label = cat === "other" ? "Інші витрати" : cat;
            opexByCategory[label] = (opexByCategory[label] || 0) + (t.amount || 0);
        }
    }

    // ============================================
    // 2. CASH REGISTER EXPENSES
    // ============================================
    for (const ct of cashTxRaw) {
        if (ct.type === "expense" && ct.category !== "incasation") {
            const cat = ct.category || "Витрати (каса)";
            opexByCategory[cat] =
                (opexByCategory[cat] || 0) + (Number(ct.amount) || 0);
        }
    }

    // ============================================
    // 3. SALARY PAYMENTS
    // ============================================
    const salaryCollection = db.collection("salary");
    const salaryRaw = await salaryCollection.find({ 
        status: "paid", 
        ...dateFilter 
    }).toArray();

    const totalSalary = salaryRaw.reduce(
        (s: number, sr: any) => s + (sr.toPay || 0),
        0
    );
    
    if (totalSalary > 0) {
        opexByCategory["Зарплата"] = (opexByCategory["Зарплата"] || 0) + totalSalary;
    }

    // ============================================
    // 4. TAXES (if tracked separately)
    // ============================================
    const taxCollection = db.collection("taxes");
    if (taxCollection) {
        try {
            const taxRaw = await taxCollection.find({
                status: "paid",
                ...dateFilter
            }).toArray();
            
            const totalTaxes = taxRaw.reduce(
                (s: number, t: any) => s + (t.amount || 0),
                0
            );
            
            if (totalTaxes > 0) {
                opexByCategory["Податки"] = (opexByCategory["Податки"] || 0) + totalTaxes;
            }
        } catch (e) {
            // Taxes collection may not exist
        }
    }

    // ============================================
    // 5. UTILITIES (if tracked separately)
    // ============================================
    const utilitiesCollection = db.collection("utilities");
    if (utilitiesCollection) {
        try {
            const utilitiesRaw = await utilitiesCollection.find({
                status: "paid",
                ...dateFilter
            }).toArray();
            
            const totalUtilities = utilitiesRaw.reduce(
                (s: number, u: any) => s + (u.amount || 0),
                0
            );
            
            if (totalUtilities > 0) {
                opexByCategory["Комунальні"] = (opexByCategory["Комунальні"] || 0) + totalUtilities;
            }
        } catch (e) {
            // Utilities collection may not exist
        }
    }

    const totalOPEX = Object.values(opexByCategory).reduce((s, v) => s + v, 0);

    return {
        total: totalOPEX,
        categories: Object.entries(opexByCategory)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount),
    };
}

/**
 * Calculate daily statistics for trend chart
 */
async function calculateDailyStats(
    db: any,
    dateFilter: Record<string, any>,
    receiptsRaw: any[],
    shiftsRaw: any[]
): Promise<DailyPoint[]> {
    const dailyMap = new Map<string, { income: number; expense: number }>();

    // Add shift sales to daily
    for (const s of shiftsRaw) {
        if (!s.endTime) continue;
        const date = new Date(s.endTime).toISOString().split("T")[0];
        const current = dailyMap.get(date) || { income: 0, expense: 0 };

        let totalSales = (s.totalSalesCash || 0) + (s.totalSalesCard || 0);
        if (!s.totalSalesCash && !s.totalSalesCard) {
            const shiftReceipts = receiptsRaw.filter(
                (r: any) =>
                    r.shiftId?.toString() === s._id.toString() ||
                    (new Date(r.createdAt) >= new Date(s.startTime) &&
                        new Date(r.createdAt) <= new Date(s.endTime))
            );
            totalSales = shiftReceipts.reduce((acc: number, r: any) => acc + (r.total || 0), 0);
        }

        current.income += totalSales;
        dailyMap.set(date, current);
    }

    // Add manual transactions to daily
    const txCollection = db.collection("transactions");
    const txRaw = await txCollection
        .find({ ...dateFilter, source: { $ne: "cash-register" } })
        .toArray();

    for (const t of txRaw) {
        if (t.category === "incasation") continue;
        const date = new Date(t.date).toISOString().split("T")[0];
        const current = dailyMap.get(date) || { income: 0, expense: 0 };
        if (t.type === "income") current.income += t.amount || 0;
        else if (t.type === "expense") current.expense += t.amount || 0;
        dailyMap.set(date, current);
    }

    // Add supplies to daily expenses
    const suppliesCollection = db.collection("stock_movements");
    const suppliesRaw = await suppliesCollection
        .find({ type: "supply", ...dateFilter, paidAmount: { $gt: 0 } })
        .toArray();

    for (const s of suppliesRaw) {
        const date = new Date(s.date).toISOString().split("T")[0];
        const current = dailyMap.get(date) || { income: 0, expense: 0 };
        current.expense += s.paidAmount || 0;
        dailyMap.set(date, current);
    }

    return Array.from(dailyMap.entries())
        .map(([dateKey, { income, expense }]) => ({
            dateKey,
            income,
            expense,
            profit: income - expense,
        }))
        .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
}

/**
 * Fetch and aggregate all P&L data
 */
async function fetchPnLData(
    db: any,
    startDate?: string,
    endDate?: string
): Promise<PnLData> {
    const dateFilter = buildDateFilter(startDate, endDate);

    // Fetch raw data in parallel
    const [receiptsRaw, shiftsRaw, cashTxRaw] = await Promise.all([
        db.collection("receipts").find({ ...buildDateFilter(startDate, endDate, "createdAt") }).toArray(),
        db.collection("cash_shifts").find({ status: "closed", ...buildDateFilter(startDate, endDate, "endTime") }).toArray(),
        db.collection("cash_transactions").find({ ...buildDateFilter(startDate, endDate, "createdAt") }).toArray(),
    ]);

    // Aggregate components
    const [revenue, cogsResult, opex, dailyStats] = await Promise.all([
        aggregateRevenue(db, dateFilter, receiptsRaw, shiftsRaw, cashTxRaw),
        aggregateCOGS(db, startDate, endDate),
        aggregateOPEX(db, dateFilter, cashTxRaw),
        calculateDailyStats(db, dateFilter, receiptsRaw, shiftsRaw),
    ]);

    const cogs = { total: cogsResult.total, categories: cogsResult.categories };
    const grossProfit = revenue.total - cogs.total;
    const operatingProfit = grossProfit - opex.total;
    const netProfit = operatingProfit; // No taxes/interest for now

    return {
        revenue,
        cogs,
        grossProfit,
        opex,
        operatingProfit,
        netProfit,
        dailyStats,
    };
}

// ============================================
// API Handler
// ============================================

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;
        const comparisonPeriod =
            (searchParams.get("comparisonPeriod") as ComparisonPeriod) || "none";

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "Потрібно вказати startDate та endDate" },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db("giraffe");

        // Fetch current period data
        const currentData = await fetchPnLData(db, startDate, endDate);

        // Calculate financial ratios
        const financialRatios = calculateFinancialRatios(currentData);

        // Fetch comparison period data if requested
        let comparison: PnLComparison | undefined;

        if (comparisonPeriod !== "none") {
            const { startDate: prevStart, endDate: prevEnd } = getComparisonDateRange(
                new Date(startDate),
                new Date(endDate),
                comparisonPeriod
            );

            const previousData = await fetchPnLData(
                db,
                prevStart.toISOString().split("T")[0],
                prevEnd.toISOString().split("T")[0]
            );

            const { variance, variancePercent } = calculateVariance(
                currentData,
                previousData
            );

            comparison = {
                currentPeriod: currentData,
                previousPeriod: previousData,
                variance,
                variancePercent,
            };
        }

        return NextResponse.json({
            ...currentData,
            financialRatios,
            comparison,
            comparisonPeriod,
        });
    } catch (err) {
        console.error("PnL API Error:", err);
        return NextResponse.json(
            {
                error: "Помилка розрахунку P&L звіту",
                details: err instanceof Error ? err.message : "Невідома помилка",
                code: "PNL_CALC_ERROR",
            },
            { status: 500 }
        );
    }
}
