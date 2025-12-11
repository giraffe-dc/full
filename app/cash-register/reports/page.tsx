"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { CashRegisterState, XReport, ZReport, PeriodAnalytics, ServiceCategory } from "../../../types/cash-register";
import { XReportView } from "../../../components/cash-register/XReportView";
import { ZReportView } from "../../../components/cash-register/ZReportView";
import { PeriodAnalyticsView } from "../../../components/cash-register/PeriodAnalyticsView";

type ReportType = "x-report" | "z-report" | "analytics";

export default function ReportsPage() {
  const [state, setState] = useState<CashRegisterState | null>(null);
  const [reportType, setReportType] = useState<ReportType>("x-report");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Завантажити дані з localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("cashRegisterState");
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setState(parsedState);
      } catch (error) {
        console.error("Помилка при завантаженні стану:", error);
      }
    }
  }, []);

  // Генерувати X-звіт (поточна зміна)
  const generateXReport = (): XReport | null => {
    if (!state?.currentShift) return null;

    const salesByCategory: Record<ServiceCategory, number> = {
      bowling: 0,
      billiards: 0,
      karaoke: 0,
      games: 0,
      bar: 0,
    };

    state.currentShift.receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        salesByCategory[item.category] += item.subtotal;
      });
    });

    return {
      shiftId: state.currentShift.id,
      shiftNumber: state.currentShift.shiftNumber,
      status: "open",
      createdAt: new Date().toISOString(),
      receiptsCount: state.currentShift.receipts.length,
      totalSales: state.currentShift.totalSales,
      currentBalance: state.currentShift.startBalance + state.currentShift.totalSales,
      salesByCategory,
    };
  };

  // Генерувати аналітику за період
  const generatePeriodAnalytics = (): PeriodAnalytics => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const relevantReceipts = state?.receipts.filter((receipt) => {
      const receiptDate = new Date(receipt.createdAt);
      return receiptDate >= start && receiptDate <= end;
    }) || [];

    const salesByCategory: Record<ServiceCategory, { total: number; percentage: number; count: number }> = {
      bowling: { total: 0, percentage: 0, count: 0 },
      billiards: { total: 0, percentage: 0, count: 0 },
      karaoke: { total: 0, percentage: 0, count: 0 },
      games: { total: 0, percentage: 0, count: 0 },
      bar: { total: 0, percentage: 0, count: 0 },
    };

    const topServices: Array<{
      serviceId: string;
      serviceName: string;
      quantity: number;
      total: number;
      percentage: number;
    }> = [];

    const dailyStats: Array<{ date: string; revenue: number; receiptsCount: number }> = [];
    const dailyMap = new Map<string, { revenue: number; count: number }>();

    let totalRevenue = 0;
    let totalCustomers = new Set<string>();

    relevantReceipts.forEach((receipt) => {
      totalRevenue += receipt.total;
      if (receipt.customerId) totalCustomers.add(receipt.customerId);

      const receiptDate = new Date(receipt.createdAt).toISOString().split("T")[0];
      const existing = dailyMap.get(receiptDate) || { revenue: 0, count: 0 };
      dailyMap.set(receiptDate, {
        revenue: existing.revenue + receipt.total,
        count: existing.count + 1,
      });

      receipt.items.forEach((item) => {
        salesByCategory[item.category].total += item.subtotal;
        salesByCategory[item.category].count += item.quantity;

        const existingService = topServices.find((s) => s.serviceId === item.serviceId);
        if (existingService) {
          existingService.quantity += item.quantity;
          existingService.total += item.subtotal;
        } else {
          topServices.push({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            quantity: item.quantity,
            total: item.subtotal,
            percentage: 0,
          });
        }
      });
    });

    // Розрахувати відсотки
    Object.keys(salesByCategory).forEach((category) => {
      if (totalRevenue > 0) {
        salesByCategory[category as ServiceCategory].percentage = (salesByCategory[category as ServiceCategory].total / totalRevenue) * 100;
      }
    });

    topServices.forEach((service) => {
      service.percentage = (service.total / totalRevenue) * 100;
    });

    topServices.sort((a, b) => b.total - a.total);

    // Побудувати щоденну статистику
    Array.from(dailyMap.entries()).forEach(([date, data]) => {
      dailyStats.push({
        date,
        revenue: data.revenue,
        receiptsCount: data.count,
      });
    });

    dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      startDate,
      endDate,
      totalRevenue,
      averageCheck: relevantReceipts.length > 0 ? totalRevenue / relevantReceipts.length : 0,
      customersCount: totalCustomers.size,
      receiptsCount: relevantReceipts.length,
      salesByCategory,
      topServices: topServices.slice(0, 5),
      dailyStats,
    };
  };

  const xReport = reportType === "x-report" ? generateXReport() : null;
  const periodAnalytics = reportType === "analytics" ? generatePeriodAnalytics() : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Звіти касового реєстру</h1>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${reportType === "x-report" ? styles.tabActive : ""}`}
          onClick={() => setReportType("x-report")}
        >
          X-Звіт (поточна зміна)
        </button>
        <button
          className={`${styles.tab} ${reportType === "z-report" ? styles.tabActive : ""}`}
          onClick={() => setReportType("z-report")}
        >
          Z-Звіти (закриті зміни)
        </button>
        <button
          className={`${styles.tab} ${reportType === "analytics" ? styles.tabActive : ""}`}
          onClick={() => setReportType("analytics")}
        >
          Аналітика за період
        </button>
      </div>

      <div className={styles.content}>
        {reportType === "x-report" && xReport && <XReportView report={xReport} />}

        {reportType === "z-report" && (
          <div className={styles.zReportsList}>
            {state?.zReports && state.zReports.length > 0 ? (
              state.zReports
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((report) => <ZReportView key={report.id} report={report} />)
            ) : (
              <div className={styles.emptyState}>
                <p>Немає закритих змін</p>
              </div>
            )}
          </div>
        )}

        {reportType === "analytics" && (
          <>
            <div className={styles.dateRange}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
              <span>—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            {periodAnalytics && <PeriodAnalyticsView analytics={periodAnalytics} />}
          </>
        )}
      </div>
    </div>
  );
}
