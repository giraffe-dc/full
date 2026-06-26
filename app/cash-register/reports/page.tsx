"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { CashRegisterState, XReport, ZReport, ServiceCategory, ShiftTransaction } from "../../../types/cash-register";
import { XReportView } from "../../../components/cash-register/XReportView";
import { ZReportView } from "../../../components/cash-register/ZReportView";
import { DenomAnalyticsView } from "../../../components/cash-register/DenomAnalyticsView";
import { Preloader } from "@/components/ui/Preloader";
import { calculateSalesCash, calculateSalesCard } from "@/lib/deposit-utils";

type ReportType = "x-report" | "z-report" | "receipts" | "denom-analytics";

interface PrevDenomInfo {
  shiftNumber: number;
  countedTotal: number;
  endBalance: number;
  diff: number; // countedTotal - endBalance
}

export default function ReportsPage() {
  const [state, setState] = useState<CashRegisterState | null>(null);
  const [reportType, setReportType] = useState<ReportType>("x-report");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevDenomInfo, setPrevDenomInfo] = useState<PrevDenomInfo | null>(null);

  // Завантажити дані з API
  useEffect(() => {
    fetchReports();
  }, [reportType, startDate, endDate]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      if (reportType === 'x-report') {
        // X-Report needs current OPEN shift with its receipts
        const res = await fetch('/api/cash-register/shifts?status=open');
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          const activeShift = data.data[0];

          // Fetch full shift details + last closed shift in parallel
          const [detailsRes, prevRes] = await Promise.all([
            fetch(`/api/cash-register/shifts/${activeShift.id}`),
            fetch('/api/cash-register/shifts?status=closed&limit=1'),
          ]);
          const detailsData = await detailsRes.json();
          const prevData = await prevRes.json();

          if (detailsData.success) {
            setState(prev => ({
              ...prev || {
                currentCart: [], customers: [], services: [],
                receipts: [], shifts: [], zReports: [], lastReceiptNumber: 0, lastShiftNumber: 0
              },
              currentShift: detailsData.data
            }));
          }

          // Calculate prev shift denomination diff
          if (prevData.success && prevData.data.length > 0) {
            const prev = prevData.data[0];
            const dc = prev.denominationCounts as Record<string, number> | undefined;
            if (dc && Object.keys(dc).length > 0) {
              const countedTotal = Object.entries(dc).reduce(
                (sum, [nom, qty]) => sum + Number(nom) * (qty || 0), 0
              );
              const endBal = prev.endBalance ?? 0;
              setPrevDenomInfo({
                shiftNumber: prev.shiftNumber,
                countedTotal,
                endBalance: endBal,
                diff: countedTotal - endBal,
              });
            } else {
              setPrevDenomInfo(null);
            }
          } else {
            setPrevDenomInfo(null);
          }
        } else {
          // No open shift
          setState(prev => ({ ...prev!, currentShift: null }));
          setPrevDenomInfo(null);
        }
      }

      if (reportType === 'z-report') {
        const res = await fetch(`/api/cash-register/reports?type=z-reports&startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        if (data.success) {
          setState(prev => ({
            ...prev || {
              currentShift: null, currentCart: [], customers: [], services: [],
              receipts: [], shifts: [], zReports: [], lastReceiptNumber: 0, lastShiftNumber: 0
            },
            zReports: data.data
          }));
        }
      }
      if (reportType === 'denom-analytics') {
        const res = await fetch(`/api/cash-register/reports?type=z-reports&startDate=${startDate}&endDate=${endDate}&limit=100`);
        const data = await res.json();
        if (data.success) {
          setState(prev => ({
            ...prev || {
              currentShift: null, currentCart: [], customers: [], services: [],
              receipts: [], shifts: [], zReports: [], lastReceiptNumber: 0, lastShiftNumber: 0
            },
            zReports: data.data
          }));
        }
      }
      if (reportType === 'receipts') {
        const res = await fetch(`/api/cash-register/reports?type=analytics&startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        if (data.success) {
          setState(prev => ({
            ...prev || {
              currentShift: null, currentCart: [], customers: [], services: [],
              receipts: [], shifts: [], zReports: [], lastReceiptNumber: 0, lastShiftNumber: 0
            },
            receipts: data.data.receipts || []
          }));
        }
      }
    } catch (e) {
      console.error("Reports load error", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Генерувати X-звіт (поточна зміна)
  const generateXReport = (): XReport | null => {
    if (!state?.currentShift) return null;

    const salesByCategory: Record<string, number> = {};
    let totalSales = 0;
    let totalSalesCash = 0;
    let totalSalesCard = 0;

    state.currentShift.receipts.forEach((receipt) => {
      const total = receipt.total || 0;

      if (receipt.paymentMethod === 'cash') {
        totalSalesCash += calculateSalesCash(receipt);
        totalSales += calculateSalesCash(receipt);
      } else if (receipt.paymentMethod === 'card') {
        totalSalesCard += calculateSalesCard(receipt);
        totalSales += calculateSalesCard(receipt);
      } else if (receipt.paymentMethod === 'mixed' && receipt.paymentDetails) {
        // paymentDetails contains remaining payment split (deposit excluded)
        // Deposits are counted separately via deposit transactions
        const cashPart = (receipt.paymentDetails.cash || 0);
        const cardPart = (receipt.paymentDetails.card || 0);
        totalSalesCash += cashPart;
        totalSalesCard += cardPart;
        totalSales += cashPart + cardPart;
      } else if (receipt.paymentMethod === 'certificate') {
        totalSales += total;
      }

      receipt.items.forEach((item) => {
        const category = item.category || 'other';
        const amount = item.subtotal || (item.price * item.quantity) || 0;

        if (!salesByCategory[category]) {
          salesByCategory[category] = 0;
        }
        salesByCategory[category] += amount;
      });
    });

    const transactions = state.currentShift.transactions || [];

    // External transactions (mapped in backend) have types like 'Витрата (Accounting)', 'Постачання (Stock)', etc.
    // Internal have 'income', 'expense', 'incasation'.
    // We sum them based on their amount (normalized in backend for individual shift view).

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalIncasation = 0;

    // Filter out sales transactions (already counted via receipts)
    const filteredTransactions = transactions.filter(t => {
      const isSale = (t as any).category === 'sales' || (t as any).source === 'cash-register';
      return !isSale;
    });

    // Розрахунок totalSalesCash, totalSalesCard та totalIncome з транзакцій:
    // - Готівкові deposits → totalSalesCash (відображаємо як продажі готівкою)
    // - Карткові deposits → totalSalesCard (відображаємо як продажі карткою)
    // - Повернення готівкового deposit → віднімаємо з totalSalesCash
    // - Повернення карткового deposit → віднімаємо з totalSalesCard
    filteredTransactions.forEach(t => {
      const amt = t.amount || 0;
      const cat = (t as any).category;
      const method = (t as any).paymentMethod;

      // Готівковий deposit — додаємо як продажі готівкою
      if (cat === 'deposit' && method === 'cash') {
        totalSalesCash += amt;
        totalSales += amt;
        return;
      }

      // Картковий deposit — додаємо як продажі карткою
      if (cat === 'deposit' && method === 'card') {
        totalSalesCard += amt;
        totalSales += amt;
        return;
      }

      // Повернення готівкового deposit — віднімаємо з продажів готівкою
      if (cat === 'deposit_refund' && method === 'cash') {
        totalSalesCash -= Math.abs(amt);
        totalSales -= Math.abs(amt);
        return;
      }

      // Повернення карткового deposit — віднімаємо з продажів карткою
      if (cat === 'deposit_refund' && method === 'card') {
        totalSalesCard -= Math.abs(amt);
        totalSales -= Math.abs(amt);
        return;
      }

      // Інші deposit операції — пропускаємо
      if (cat === 'deposit_refund' || cat === 'deposit_audit') {
        return;
      }

      if ((t as any).type === 'income' || (t as any).type?.includes('Прихід')) {
        totalIncome += amt;
      } else if ((t as any).type === 'incasation' || (t as any).type?.includes('Інкасація')) {
        totalIncasation += Math.abs(amt);
      } else if ((t as any).type === 'expense' || (t as any).type?.includes('Витрата') || (t as any).type?.includes('Постачання')) {
        totalExpenses += Math.abs(amt);
      }
    });

    // Calculate current cash balance
    // Start + Sales(Cash) + Income - Expenses - Incasation
    const currentBalance = state.currentShift.startBalance + totalSalesCash + totalIncome - totalExpenses - totalIncasation;

    return {
      shiftId: state.currentShift.id,
      shiftNumber: state.currentShift.shiftNumber,
      status: "open",
      createdAt: new Date().toISOString(),
      receiptsCount: state.currentShift.receipts.length,
      totalSales,
      totalSalesCash,
      totalSalesCard,
      startBalance: state.currentShift.startBalance,
      totalIncome,
      totalExpenses,
      totalIncasation,
      currentBalance,
      salesByCategory: salesByCategory as Record<ServiceCategory, number>,
      transactions: filteredTransactions as ShiftTransaction[],
      shiftStartTime: state.currentShift.startTime,
      // Informational denomination counts — saved separately, does NOT affect balances
      denominationCounts: state.currentShift.denominationCounts,
    };
  };

  const xReport = reportType === "x-report" ? generateXReport() : null;

  if (isLoading) {
    return <Preloader message="Отримуємо дані звітів..." />;
  }

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
          className={`${styles.tab} ${reportType === "receipts" ? styles.tabActive : ""}`}
          onClick={() => setReportType("receipts")}
        >
          Архів чеків
        </button>
        <button
          className={`${styles.tab} ${reportType === "denom-analytics" ? styles.tabActive : ""}`}
          onClick={() => setReportType("denom-analytics")}
        >
          🪙 Купюрка
        </button>
      </div>

      <div className={styles.content}>
        {reportType === "x-report" && (
          xReport ? (
            <XReportView
              report={xReport}
              shiftId={state!.currentShift!.id}
              prevDenomInfo={prevDenomInfo}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>Немає відкритої зміни. Відкрийте зміну на касі для перегляду X-звіту.</p>
            </div>
          )
        )}

        {reportType === "z-report" && (
          <div className={styles.zReportsList}>
            <div className={styles.dateRange}>
              <label>
                Від:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
              <span>—</span>
              <label>
                До:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
            </div>
            {state?.zReports && state.zReports.length > 0 ? (
              state.zReports
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((report) => (
                  <div key={report.id} className={styles.zReportAccordion}>
                    <div
                      className={styles.zReportSummary}
                      onClick={() => setExpandedReceipt(expandedReceipt === report.id ? null : report.id)}
                    >
                      <div className={styles.zReportSummaryLeft}>
                        <span className={styles.zReportNumber}>Зміна #{report.shiftNumber}</span>
                        <span className={styles.zReportDate}>
                          {new Date(report.createdAt).toLocaleString('uk-UA')} - {new Date(report.endTime || report.createdAt).toLocaleString('uk-UA')}
                        </span>
                      </div>
                      <div className={styles.zReportSummaryRight}>
                        <span className={styles.zReportTotal}>{(report.totalSales ?? 0).toFixed(2)} ₴</span>
                        <span className={styles.expandIcon}>
                          {expandedReceipt === report.id ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {expandedReceipt === report.id && (
                      <div className={styles.zReportDetails}>
                        <ZReportView report={report} />
                      </div>
                    )}
                  </div>
                ))
            ) : (
              <div className={styles.emptyState}>
                <p>Немає закритих змін</p>
              </div>
            )}
          </div>
        )}

        {reportType === "receipts" && (
          <>
            <div className={styles.dateRange}>
              <label>
                Від:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
              <span>—</span>
              <label>
                До:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
            </div>

            <div className={styles.receiptsList}>
              {state?.receipts && state.receipts.length > 0 ? (
                state.receipts.map((receipt) => (
                  <div key={receipt.id} className={styles.receiptAccordion}>
                    <div
                      className={styles.receiptSummary}
                      onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                    >
                      <div className={styles.receiptSummaryLeft}>
                        <span className={styles.receiptNumber}>Чек #{receipt.receiptNumber}</span>
                        <span className={styles.receiptDate}>
                          {new Date(receipt.createdAt).toLocaleString('uk-UA')}
                        </span>
                        <span style={{ color: 'green' }}>
                          {receipt.comment}
                        </span>
                      </div>
                      <div className={styles.receiptSummaryRight}>
                        <span className={styles.receiptTotal}>{receipt.total.toFixed(2)} ₴</span>
                        <span className={styles.expandIcon}>
                          {expandedReceipt === receipt.id ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {expandedReceipt === receipt.id && (
                      <div className={styles.receiptDetails}>
                        <div className={styles.receiptItems}>
                          <h4>Товари:</h4>
                          {receipt.items.map((item, idx) => (
                            <div key={idx} className={styles.receiptItem}>
                              <span>{item.serviceName}</span>
                              <span className={styles.itemQuantity}>x{item.quantity}</span>
                              <span className={styles.itemPrice}>{(item.subtotal - (item.discount ?? 0)).toFixed(2)} ₴</span>
                              <span style={{ color: 'red' }}> Знижка: {item.discount?.toFixed(2)} ₴</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.receiptFooter}>
                          <div className={styles.receiptMeta}>
                            <span className={styles.paymentMethod}>
                              {receipt.paymentMethod === 'cash' ? '💵 Готівка' :
                                receipt.paymentMethod === 'card' ? '💳 Карта' : '💰 Змішана'}
                            </span>
                            {receipt.paymentMethod === 'mixed' && receipt.paymentDetails && (
                              <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '10px' }}>
                                (Готівка: {receipt.paymentDetails.cash?.toFixed(2)} ₴ | Картка: {receipt.paymentDetails.card?.toFixed(2)} ₴)
                              </span>
                            )}
                            {(receipt.depositAmount || 0) > 0 && (
                              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '600', marginLeft: '10px' }}>
                                | Передплата: {receipt.depositAmount?.toFixed(2)} ₴
                                ({receipt.depositMethod === 'card' ? '💳 Карта' : '💵 Готівка'})
                                {receipt.depositInfo?.createdAt && (
                                  <> {new Date(receipt.depositInfo.createdAt).toLocaleString('uk-UA')}</>
                                )}
                              </span>
                            )}
                            {receipt.subtotal !== undefined && (
                              <span className={styles.subtotalInfo}>
                                Підсумок: {receipt.total.toFixed(2)} ₴
                                {receipt.tax ? ` | Податок: ${receipt.tax.toFixed(2)} ₴` : ''}
                              </span>

                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>Немає чеків за обраний період</p>
                </div>
              )}
            </div>
          </>
        )}

        {reportType === "denom-analytics" && (
          <div className={styles.denomAnalyticsList}>
            <div className={styles.dateRange}>
              <label>
                Від:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
              <span>—</span>
              <label>
                До:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </label>
            </div>
            {state?.zReports && (
              <DenomAnalyticsView reports={state.zReports} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
