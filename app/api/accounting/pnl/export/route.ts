import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

interface ExportData {
    revenue: { total: number; categories: { name: string; amount: number }[] };
    cogs: { total: number; categories: { name: string; amount: number }[] };
    grossProfit: number;
    opex: { total: number; categories: { name: string; amount: number }[] };
    operatingProfit: number;
    netProfit: number;
    dailyStats: { dateKey: string; income: number; expense: number; profit: number }[];
    financialRatios?: {
        grossMarginPercent: number;
        operatingMarginPercent: number;
        netMarginPercent: number;
    };
    comparison?: any;
    filters: { startDate: string; endDate: string };
}

export async function POST(req: NextRequest) {
    try {
        const data: ExportData = await req.json();

        // Create workbook
        const wb = XLSX.utils.book_new();

        // ============================================
        // Sheet 1: P&L Summary
        // ============================================
        const summaryData = [
            ["ЗВІТ ПРО ПРИБУТКИ ТА ЗБИТКИ (P&L)"],
            [`Період: ${data.filters.startDate} - ${data.filters.endDate}`],
            [],
            ["ПОКАЗНИК", "СУМА (₴)", "%"],
            ["Доходи (Revenue)", data.revenue.total, ""],
            ["Собівартість (COGS)", -data.cogs.total, ""],
            ["Валовий прибуток", data.grossProfit, data.financialRatios?.grossMarginPercent?.toFixed(1) + "%"],
            ["Операційні витрати (OPEX)", -data.opex.total, ""],
            ["Операційний прибуток", data.operatingProfit, data.financialRatios?.operatingMarginPercent?.toFixed(1) + "%"],
            ["Чистий прибуток", data.netProfit, data.financialRatios?.netMarginPercent?.toFixed(1) + "%"],
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths
        wsSummary["!cols"] = [
            { wch: 35 },
            { wch: 20 },
            { wch: 10 },
        ];

        // Style header row (basic styling)
        const range = XLSX.utils.decode_range(wsSummary["!ref"] || "A1:C10");
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!wsSummary[address]) continue;
            wsSummary[address].s = {
                font: { bold: true, sz: 14 },
                alignment: { horizontal: "center" },
            };
        }

        XLSX.utils.book_append_sheet(wb, wsSummary, "P&L Звіт");

        // ============================================
        // Sheet 2: Revenue Details
        // ============================================
        const revenueData = [
            ["ДЕТАЛІЗАЦІЯ ДОХОДІВ"],
            [],
            ["Категорія", "Сума (₴)", "% від загального"],
            ...data.revenue.categories.map((cat) => [
                cat.name,
                cat.amount,
                ((cat.amount / data.revenue.total) * 100).toFixed(1) + "%",
            ]),
            [],
            ["РАЗОМ:", data.revenue.total, "100%"],
        ];

        const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
        wsRevenue["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsRevenue, "Доходи");

        // ============================================
        // Sheet 3: COGS Details
        // ============================================
        const cogsData = [
            ["ДЕТАЛІЗАЦІЯ СОБІВАРТОСТІ (COGS)"],
            [],
            ["Постачальник / Категорія", "Сума (₴)", "% від загального"],
            ...data.cogs.categories.map((cat) => [
                cat.name,
                cat.amount,
                ((cat.amount / data.cogs.total) * 100).toFixed(1) + "%",
            ]),
            [],
            ["РАЗОМ:", data.cogs.total, "100%"],
        ];

        const wsCOGS = XLSX.utils.aoa_to_sheet(cogsData);
        wsCOGS["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsCOGS, "Собівартість");

        // ============================================
        // Sheet 4: OPEX Details
        // ============================================
        const opexData = [
            ["ДЕТАЛІЗАЦІЯ ОПЕРАЦІЙНИХ ВИТРАТ (OPEX)"],
            [],
            ["Категорія", "Сума (₴)", "% від загального"],
            ...data.opex.categories.map((cat) => [
                cat.name,
                cat.amount,
                ((cat.amount / data.opex.total) * 100).toFixed(1) + "%",
            ]),
            [],
            ["РАЗОМ:", data.opex.total, "100%"],
        ];

        const wsOPEX = XLSX.utils.aoa_to_sheet(opexData);
        wsOPEX["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsOPEX, "Операційні витрати");

        // ============================================
        // Sheet 5: Daily Trends
        // ============================================
        const dailyData = [
            ["ЩОДЕННА ДИНАМІКА"],
            [],
            ["Дата", "Доходи (₴)", "Витрати (₴)", "Прибуток (₴)"],
            ...data.dailyStats.map((day) => [
                new Date(day.dateKey).toLocaleDateString("uk-UA"),
                day.income,
                day.expense,
                day.profit,
            ]),
        ];

        const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
        wsDaily["!cols"] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsDaily, "Динаміка по днях");

        // ============================================
        // Sheet 6: Financial Ratios
        // ============================================
        if (data.financialRatios) {
            const ratiosData = [
                ["ФІНАНСОВІ КОЕФІЦІЄНТИ"],
                [],
                ["Показник", "Значення"],
                ["Валова маржа (Gross Margin)", data.financialRatios.grossMarginPercent.toFixed(2) + "%"],
                ["Операційна маржа (Operating Margin)", data.financialRatios.operatingMarginPercent.toFixed(2) + "%"],
                ["Чиста маржа (Net Margin)", data.financialRatios.netMarginPercent.toFixed(2) + "%"],
            ];

            const wsRatios = XLSX.utils.aoa_to_sheet(ratiosData);
            wsRatios["!cols"] = [{ wch: 40 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsRatios, "Фін. коефіцієнти");
        }

        // ============================================
        // Sheet 7: Comparison (if available)
        // ============================================
        if (data.comparison) {
            const comparisonData = [
                ["ПОРІВНЯННЯ ПЕРІОДІВ"],
                [],
                ["Показник", "Поточний період", "Попередній період", "Відхилення", "% зміни"],
                [
                    "Доходи",
                    data.comparison.currentPeriod.revenue.total,
                    data.comparison.previousPeriod.revenue.total,
                    data.comparison.variance.revenue,
                    data.comparison.variancePercent.revenue.toFixed(1) + "%",
                ],
                [
                    "COGS",
                    data.comparison.currentPeriod.cogs.total,
                    data.comparison.previousPeriod.cogs.total,
                    data.comparison.variance.cogs,
                    data.comparison.variancePercent.cogs.toFixed(1) + "%",
                ],
                [
                    "Валовий прибуток",
                    data.comparison.currentPeriod.grossProfit,
                    data.comparison.previousPeriod.grossProfit,
                    data.comparison.variance.grossProfit,
                    data.comparison.variancePercent.grossProfit.toFixed(1) + "%",
                ],
                [
                    "OPEX",
                    data.comparison.currentPeriod.opex.total,
                    data.comparison.previousPeriod.opex.total,
                    data.comparison.variance.opex,
                    data.comparison.variancePercent.opex.toFixed(1) + "%",
                ],
                [
                    "Операційний прибуток",
                    data.comparison.currentPeriod.operatingProfit,
                    data.comparison.previousPeriod.operatingProfit,
                    data.comparison.variance.operatingProfit,
                    data.comparison.variancePercent.operatingProfit.toFixed(1) + "%",
                ],
                [
                    "Чистий прибуток",
                    data.comparison.currentPeriod.netProfit,
                    data.comparison.previousPeriod.netProfit,
                    data.comparison.variance.netProfit,
                    data.comparison.variancePercent.netProfit.toFixed(1) + "%",
                ],
            ];

            const wsComparison = XLSX.utils.aoa_to_sheet(comparisonData);
            wsComparison["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsComparison, "Порівняння");
        }

        // Generate buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as downloadable file
        return new NextResponse(buf, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="PNL_${data.filters.startDate}_to_${data.filters.endDate}.xlsx"`,
            },
        });
    } catch (err) {
        console.error("Export error:", err);
        return NextResponse.json(
            {
                error: "Помилка експорту",
                details: err instanceof Error ? err.message : "Невідома помилка",
            },
            { status: 500 }
        );
    }
}
