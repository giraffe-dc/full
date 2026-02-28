import React from 'react';
import { ZReport } from '../../types/cash-register';
import styles from './ReportViews.module.css';

interface DenomAnalyticsViewProps {
    reports: ZReport[];
}

const BANKNOTES = [1000, 500, 200, 100, 50, 20, 10];
const COINS = [10, 5, 2, 1, 0.5];

function calcTotal(counts: any): number {
    if (!counts || Object.keys(counts).length === 0) return 0;
    return [...BANKNOTES, ...COINS].reduce(
        (sum, d) => sum + (counts[String(d)] || 0) * d,
        0
    );
}

export function DenomAnalyticsView({ reports }: DenomAnalyticsViewProps) {
    const sortedReports = [...reports].sort((a, b) =>
        new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );

    const totalDiff = sortedReports.reduce((sum, r) => {
        const counted = calcTotal(r.denominationCounts);
        const expected = r.endBalance || 0;
        return sum + (counted - expected);
    }, 0);

    return (
        <div className={styles.reportCard}>
            <div className={styles.reportHeader}>
                <h2>Статистика підрахунку купюр (Купюрка)</h2>
                <div className={styles.reportMeta}>
                    <span>Всього змін у вибірці: {reports.length}</span>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.analyticsTable}>
                    <thead>
                        <tr>
                            <th>Зміна</th>
                            <th>Дата закриття</th>
                            <th>Очікувано (баланс)</th>
                            <th>Підраховано (купюри)</th>
                            <th>Різниця</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedReports.map((report) => {
                            const counted = calcTotal(report.denominationCounts);
                            const expected = report.endBalance || 0;
                            const diff = counted - expected;
                            const hasCounts = report.denominationCounts && Object.keys(report.denominationCounts).length > 0;

                            return (
                                <tr key={report.id}>
                                    <td>#{report.shiftNumber}</td>
                                    <td>{new Date(report.endTime).toLocaleString('uk-UA')}</td>
                                    <td>{expected.toFixed(2)} ₴</td>
                                    <td>
                                        {hasCounts ? (
                                            `${counted.toFixed(2)} ₴`
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Не підраховано</span>
                                        )}
                                    </td>
                                    <td className={diff > 0 ? styles.positive : diff < 0 ? styles.negative : ''}>
                                        {hasCounts ? (
                                            `${diff > 0 ? '+' : ''}${diff.toFixed(2)} ₴`
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className={styles.tableTotalRow}>
                            <td colSpan={4}>Загальна розбіжність за період:</td>
                            <td className={totalDiff > 0 ? styles.positive : totalDiff < 0 ? styles.negative : ''}>
                                {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(2)} ₴
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {reports.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Немає даних за вибраний період
                </div>
            )}
        </div>
    );
}
