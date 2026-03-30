"use client";

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastContext';
import styles from './SalarySection.module.css';

interface SalaryRow {
  id: string;
  employee: string;
  position: string;
  totalHours: number;
  totalShifts: number;
  ratePerHour: number;
  baseSalary: number;
  bonus: number;
  fine: number;
  toPay: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface SalarySectionProps {
  month: string;
}

export function SalarySection({ month }: SalarySectionProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ bonus: 0, fine: 0 });

  const fetchSalary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/salary?month=${month}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
      }
    } catch (error) {
      console.error('Error fetching salary:', error);
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalary();
  }, [month]);

  const handleEdit = (row: SalaryRow) => {
    setEditingId(row.id);
    setEditData({ bonus: row.bonus, fine: row.fine });
  };

  const handleSave = async (id: string) => {
    try {
      const res = await fetch('/api/accounting/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: id, bonus: editData.bonus, fine: editData.fine }),
      });

      if (res.ok) {
        toast.success('Дані оновлено');
        setEditingId(null);
        fetchSalary();
      } else {
        toast.error('Помилка збереження');
      }
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/accounting/salary/export?month=${month}`);
      const data = await res.json();

      if (data.success) {
        // Convert to CSV
        const csvRows = [
          ['Працівник', 'Посада', 'Годин', 'Змін', 'Ставка', 'Оклад', 'Премія', 'Штраф', 'До виплати'].join(','),
          ...rows.map(row => [
            `"${row.employee}"`,
            row.position,
            row.totalHours,
            row.totalShifts,
            row.ratePerHour,
            row.baseSalary,
            row.bonus,
            row.fine,
            row.toPay
          ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Зарплата_${month}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Експортовано');
      }
    } catch (error) {
      toast.error('Помилка експорту');
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('uk-UA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className={`${styles.statusBadge} ${styles.statusSuccess}`}>Виплачено</span>;
      case 'overdue':
        return <span className={`${styles.statusBadge} ${styles.statusDanger}`}>Прострочено</span>;
      default:
        return <span className={`${styles.statusBadge} ${styles.statusWarning}`}>Очікує</span>;
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Завантаження даних...</p>
      </div>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>💰 Зарплата</h2>
          <p className={styles.subtitle}>Облік відпрацьованих годин та виплат</p>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.btnExport} type="button" onClick={handleExport}>
            📥 Експорт
          </button>
          <button className={styles.btnRefresh} type="button" onClick={fetchSalary}>
            🔄 Оновити
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Працівник</th>
              <th>Посада</th>
              <th>Годин</th>
              <th>Змін</th>
              <th>Ставка/год</th>
              <th>Оклад</th>
              <th>Премія</th>
              <th>Штраф</th>
              <th>До виплати</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.noData}>
                  Немає даних за обраний період
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.nameCell}>{row.employee}</td>
                  <td>{row.position}</td>
                  <td className={styles.hoursCell}>{row.totalHours}</td>
                  <td className={styles.center}>{row.totalShifts}</td>
                  <td className={styles.center}>{row.ratePerHour} ₴</td>
                  <td className={styles.bold}>{formatCurrency(row.baseSalary)} ₴</td>
                  <td>
                    {editingId === row.id ? (
                      <input
                        type="number"
                        value={editData.bonus}
                        onChange={(e) => setEditData({ ...editData, bonus: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                        min="0"
                      />
                    ) : (
                      <span className={row.bonus > 0 ? styles.bonus : ''}>
                        {row.bonus > 0 ? `+${formatCurrency(row.bonus)} ₴` : '-'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === row.id ? (
                      <input
                        type="number"
                        value={editData.fine}
                        onChange={(e) => setEditData({ ...editData, fine: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                        min="0"
                      />
                    ) : (
                      <span className={row.fine > 0 ? styles.fine : ''}>
                        {row.fine > 0 ? `-${formatCurrency(row.fine)} ₴` : '-'}
                      </span>
                    )}
                  </td>
                  <td className={styles.toPay}>{formatCurrency(row.toPay)} ₴</td>
                  <td>{getStatusBadge(row.status)}</td>
                  <td>
                    <div className={styles.actions}>
                      {editingId === row.id ? (
                        <>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleSave(row.id)}
                          >
                            Зберегти
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.secondaryButton}`}
                            onClick={() => setEditingId(null)}
                          >
                            Скасувати
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={`${styles.actionButton} ${styles.secondaryButton}`}
                            onClick={() => handleEdit(row)}
                          >
                            ✏️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className={styles.summaryFooter}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Всього співробітників:</span>
          <span className={styles.summaryValue}>{rows.length}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Всього годин:</span>
          <span className={styles.summaryValue}>
            {rows.reduce((sum, r) => sum + r.totalHours, 0)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Всього до виплати:</span>
          <span className={styles.summaryValueTotal}>
            {formatCurrency(rows.reduce((sum, r) => sum + r.toPay, 0))} ₴
          </span>
        </div>
      </div>
    </section>
  );
}
