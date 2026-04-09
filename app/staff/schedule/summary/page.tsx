"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Preloader } from "@/components/ui/Preloader";
import { useToast } from "@/components/ui/ToastContext";

type StaffMember = {
  _id: string;
  name: string;
  position?: string;
  salary?: number;
  status: string;
};

type ScheduleEntry = {
  _id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export default function StaffScheduleSummaryPage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch staff and schedules
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [staffRes, scheduleRes] = await Promise.all([
          fetch('/api/staff?status=active'),
          fetch(`/api/staff/schedule?startDate=${selectedMonth}-01&endDate=${selectedMonth}-31`),
        ]);

        const staffData = await staffRes.json();
        const scheduleData = await scheduleRes.json();

        if (staffData.data) setStaff(staffData.data);
        if (scheduleData.data) setSchedules(scheduleData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Помилка завантаження даних');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  // Get days in month
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  // Get day labels (ПН, ВТ, etc.)
  const dayLabels = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const labels = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const dayNames = ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
      labels.push({
        day,
        dayName: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        fullDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      });
    }
    return labels;
  }, [selectedMonth, daysInMonth]);

  // Get shifts for staff member by date
  const getShiftForDate = (staffId: string, date: string) => {
    return schedules.find(s => {
      const sStaffId = s.staffId;
      const sDate = s.date.split('T')[0];
      return sStaffId === staffId && sDate === date;
    });
  };

  // Calculate stats for staff member
  const calculateStats = (staffId: string) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let totalShifts = 0;
    let totalHours = 0;
    let weekendShifts = 0;

    dayLabels.forEach(({ fullDate, isWeekend }) => {
      const shift = getShiftForDate(staffId, fullDate);
      if (shift) {
        totalShifts++;
        const [startHour, startMin] = shift.startTime.split(':').map(Number);
        const [endHour, endMin] = shift.endTime.split(':').map(Number);
        const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
        totalHours += hours;
        if (isWeekend) weekendShifts++;
      }
    });

    return {
      shifts: totalShifts,
      hours: Math.round(totalHours),
      weekendShifts,
    };
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMonthLabel = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/staff/schedule/export?month=${selectedMonth}`);
      const data = await res.json();

      if (data.success) {
        // Convert to CSV
        const columns = data.data.columns as { label: string; key: string }[];
        const rows = data.data.rows as any[];
        const csvRows: string[] = [];

        // Header row
        csvRows.push(columns.map(c => c.label).join(','));

        // Data rows
        rows.forEach(row => {
          const values = columns.map(col => {
            const value = row[col.key];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Графік_${selectedMonth}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('Графік експортовано');
      } else {
        toast.error('Помилка експорту');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Помилка експорту');
    }
  };

  const getShiftDisplay = (shift?: ScheduleEntry) => {
    if (!shift) return '';
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    const hours = endHour - startHour + (endMin - startMin) / 60;
    return hours.toFixed(0);
  };

  if (loading) return <Preloader message="Завантаження табеля..." />;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <button onClick={() => router.push('/staff/schedule')} className={styles.btnBack}>← Назад</button>
            <h1 className={styles.pageTitle}>
              <span className={styles.pageTitleIcon}>📊</span>
              Зведений графік
            </h1>
            <p className={styles.pageSubtitle}>Табель робочого часу</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.monthSelector}>
              <button onClick={() => handleMonthChange('prev')} className={styles.navBtn}>←</button>
              <span className={styles.monthLabel}>{getMonthLabel()}</span>
              <button onClick={() => handleMonthChange('next')} className={styles.navBtn}>→</button>
            </div>
            <button onClick={handleExport} className={styles.btnExport}>
              📥 Експорт Excel
            </button>
          </div>
        </div>

        {/* Summary Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.summaryTable}>
            <thead>
              <tr className={styles.headerRow}>
                <th rowSpan={2} className={styles.headerCell}>ПІП</th>
                <th rowSpan={2} className={styles.headerCell}>Посада</th>
                <th rowSpan={2} className={styles.headerCell}>Оклад</th>
                <th colSpan={daysInMonth} className={styles.daysHeader}>Дні місяця</th>
                <th rowSpan={2} className={styles.headerCell}>Вихід</th>
                <th rowSpan={2} className={styles.headerCell}>Годин</th>
              </tr>
              <tr className={styles.headerRow}>
                {dayLabels.map(({ day, dayName, isWeekend }) => (
                  <th key={day} className={`${styles.dayCell} ${isWeekend ? styles.weekend : ''}`}>
                    <div className={styles.dayLabel}>
                      <span className={styles.dayName}>{dayName}</span>
                      <span className={styles.dayNum}>{day}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(member => {
                const stats = calculateStats(member._id);
                return (
                  <tr key={member._id} className={styles.staffRow}>
                    <td className={styles.nameCell}>{member.name}</td>
                    <td className={styles.positionCell}>{member.position || '-'}</td>
                    <td className={styles.salaryCell}>{member.salary ? `${member.salary} ₴` : '-'}</td>
                    {dayLabels.map(({ fullDate, isWeekend }) => {
                      const shift = getShiftForDate(member._id, fullDate);
                      const hours = getShiftDisplay(shift);
                      return (
                        <td key={fullDate} className={`${styles.shiftCell} ${isWeekend ? styles.weekend : ''}`}>
                          {shift ? hours : ''}
                        </td>
                      );
                    })}
                    <td className={styles.statsCell}>{stats.shifts}</td>
                    <td className={`${styles.statsCell} ${styles.totalHours}`}>{stats.hours}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
