"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Preloader } from "@/components/ui/Preloader";
import { useToast } from "@/components/ui/ToastContext";

type StaffMember = {
  _id: string;
  lastName: string;
  name: string;
  patronymic?: string;
  firstName?: string;
  position?: string;
  salary?: number;
  status: string;
};

const getDisplayName = (member: StaffMember) => {
  const parts = [member.lastName, member.name || member.firstName, member.patronymic].filter(Boolean);
  return parts.join(' ') || member.name || 'Без імені';
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
  const [scheduleType, setScheduleType] = useState<'planned' | 'actual'>('planned');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentNorm, setCurrentNorm] = useState<number>(0);

  // Fetch staff and schedules
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [staffRes, scheduleRes] = await Promise.all([
          fetch('/api/staff?status=active'),
          fetch(`/api/staff/schedule?startDate=${selectedMonth}-01&endDate=${selectedMonth}-31&type=${scheduleType}`),
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
  }, [selectedMonth, scheduleType]);

  // Fetch norm for current month
  useEffect(() => {
    const fetchNorm = async () => {
      try {
        const [year, month] = selectedMonth.split('-');
        const res = await fetch(`/api/staff/norms?year=${year}`);
        const data = await res.json();
        if (data.success && data.data && data.data.months) {
          setCurrentNorm(data.data.months[parseInt(month).toString()] || 0);
        } else {
          setCurrentNorm(0);
        }
      } catch (error) {
        console.error('Error fetching norm:', error);
      }
    };
    fetchNorm();
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
  const getShiftsForDate = (staffId: string, date: string) => {
    return schedules.filter(s => {
      const sStaffId = s.staffId;
      const sDate = s.date.split('T')[0];
      return sStaffId === staffId && sDate === date;
    });
  };

  // Calculate stats for staff member
  const calculateStats = (staffId: string) => {
    let totalShifts = 0;
    let totalHours = 0;
    let weekendShifts = 0;

    dayLabels.forEach(({ fullDate, isWeekend }) => {
      const dayShifts = getShiftsForDate(staffId, fullDate);
      if (dayShifts.length > 0) {
        totalShifts += dayShifts.length;

        dayShifts.forEach(shift => {
          const [startHour, startMin] = shift.startTime.split(':').map(Number);

          if (shift.endTime && shift.endTime !== 'Триває') {
            const [endHour, endMin] = shift.endTime.split(':').map(Number);

            let diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            if (diffMinutes < 0) diffMinutes += 1440; // Midnight crossover fix

            const hours = diffMinutes / 60;
            totalHours += hours;
          }
        });

        if (isWeekend) weekendShifts += dayShifts.length;
      }
    });

    return {
      shifts: totalShifts,
      hours: Number(totalHours.toFixed(1)),
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
      const res = await fetch(`/api/staff/schedule/export?month=${selectedMonth}&type=${scheduleType}`);
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
        const typeLabel = scheduleType === 'actual' ? 'Фактичний' : 'Плановий';
        link.download = `Графік_${typeLabel}_${selectedMonth}.csv`;
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

  const getShiftDisplay = (dayShifts: ScheduleEntry[]) => {
    if (dayShifts.length === 0) return '';

    let totalDayHours = 0;
    let hasActive = false;

    dayShifts.forEach(shift => {
      if (shift.endTime === 'Триває') {
        hasActive = true;
      } else {
        const [startHour, startMin] = shift.startTime.split(':').map(Number);
        const [endHour, endMin] = shift.endTime.split(':').map(Number);

        let diffMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        if (diffMinutes < 0) diffMinutes += 1440; // Midnight crossover fix

        totalDayHours += diffMinutes / 60;
      }
    });

    if (totalDayHours === 0 && hasActive) return '—';
    if (totalDayHours === 0) return '';

    // Display with 1 decimal if needed, otherwise as integer
    return totalDayHours % 1 === 0 ? totalDayHours.toString() : totalDayHours.toFixed(1);
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

        {/* Controls */}
        <div className={styles.controls} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.viewModeToggle}>
            <button
              className={`${styles.viewBtn} ${scheduleType === 'planned' ? styles.active : ''}`}
              onClick={() => setScheduleType('planned')}
            >
              Плановий графік
            </button>
            <button
              className={`${styles.viewBtn} ${scheduleType === 'actual' ? styles.active : ''}`}
              onClick={() => setScheduleType('actual')}
            >
              Фактичні виходи
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
                {/*<th rowSpan={2} className={styles.headerCell}>Оклад</th>*/}
                <th colSpan={daysInMonth} className={styles.daysHeader}>Дні місяця</th>
                <th rowSpan={2} className={styles.headerCell}>Вихід</th>
                <th rowSpan={2} className={styles.headerCell}>Годин</th>
                <th rowSpan={2} className={styles.headerCell}>Норма</th>
                <th rowSpan={2} className={styles.headerCell}>+/-</th>
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
                    <td className={styles.nameCell}>{getDisplayName(member)}</td>
                    <td className={styles.positionCell}>{member.position || '-'}</td>
                    {/*<td className={styles.salaryCell}>{member.salary ? `${member.salary} ₴` : '-'}</td>*/}
                    {dayLabels.map(({ fullDate, isWeekend }) => {
                      const dayShifts = getShiftsForDate(member._id, fullDate);
                      const hours = getShiftDisplay(dayShifts);
                      return (
                        <td key={fullDate} className={`${styles.shiftCell} ${isWeekend ? styles.weekend : ''}`}>
                          {dayShifts.length > 0 ? (hours === '' && dayShifts.some(s => s.endTime === 'Триває') ? <span style={{ fontSize: "0.7rem" }}>Триває</span> : hours) : ''}
                        </td>
                      );
                    })}
                    <td className={styles.statsCell}>{stats.shifts}</td>
                    <td className={`${styles.statsCell} ${styles.totalHours}`}>{stats.hours}</td>
                    <td className={styles.statsCell}>{currentNorm || '-'}</td>
                    <td className={`${styles.statsCell} ${currentNorm > 0 ? (stats.hours >= currentNorm ? styles.positive : styles.negative) : ''}`}>
                      {currentNorm > 0 ? (stats.hours - currentNorm).toFixed(1) : '-'}
                    </td>
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
