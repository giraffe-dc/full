"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Preloader } from "@/components/ui/Preloader";
import { useToast } from "@/components/ui/ToastContext";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

type StaffMember = {
  _id: string;
  lastName: string;
  name: string;
  patronymic?: string;
  firstName?: string;
  position?: string;
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
  notes?: string;
  isManualEdit?: boolean;
};

export default function StaffSchedulePage() {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [scheduleType, setScheduleType] = useState<'planned' | 'actual'>('planned');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNormsModal, setShowNormsModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string } | null>(null);
  const [normsYear, setNormsYear] = useState(new Date().getFullYear());
  const [monthlyNorms, setMonthlyNorms] = useState<Record<string, number>>({});
  const [savingNorms, setSavingNorms] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    staffId: "",
    date: "",
    startTime: "09:00",
    endTime: "18:00",
    notes: "",
  });

  // Fetch role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setIsAdmin(data.user?.role === 'admin');
      } catch (e) { }
    };
    fetchRole();
  }, []);

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/staff?status=active');
        const data = await res.json();
        if (data.data) {
          setStaff(data.data);
          if (data.data.length > 0 && !selectedStaffId) {
            setSelectedStaffId(data.data[0]._id);
            setFormData(prev => ({ ...prev, staffId: data.data[0]._id }));
          }
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, []);

  // Fetch schedules for selected staff
  const fetchSchedules = async () => {
    if (!selectedStaffId) return;

    setLoading(true);
    try {
      const currentDate = new Date(selectedDate);
      let startDate: string;
      let endDate: string;

      if (viewMode === 'week') {
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(currentDate);
        monday.setDate(diff);

        // Expand range by 3 days for safety in week view
        const rangeStart = new Date(monday);
        rangeStart.setDate(monday.getDate() - 3);
        startDate = rangeStart.toISOString().split('T')[0];

        const rangeEnd = new Date(monday);
        rangeEnd.setDate(monday.getDate() + 9);
        endDate = rangeEnd.toISOString().split('T')[0];
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Fetch from 7 days before start of month to 7 days after end of month
        const rangeStart = new Date(year, month, 1);
        rangeStart.setDate(rangeStart.getDate() - 7);
        startDate = rangeStart.toISOString().split('T')[0];

        const rangeEnd = new Date(year, month + 1, 0);
        rangeEnd.setDate(rangeEnd.getDate() + 7);
        endDate = rangeEnd.toISOString().split('T')[0];
      }

      const res = await fetch(`/api/staff/schedule?startDate=${startDate}&endDate=${endDate}&staffId=${selectedStaffId}&type=${scheduleType}`);
      const data = await res.json();
      if (data.data) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Помилка завантаження графіку');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStaffId) {
      fetchSchedules();
    }
  }, [selectedDate, viewMode, selectedStaffId, scheduleType]);

  // Fetch norms when modal opens or year changes
  useEffect(() => {
    const fetchNorms = async () => {
      if (!showNormsModal) return;
      try {
        const res = await fetch(`/api/staff/norms?year=${normsYear}`);
        const data = await res.json();
        if (data.success && data.data) {
          setMonthlyNorms(data.data.months);
        } else {
          // Initialize empty norms if not found
          const emptyNorms: Record<string, number> = {};
          for (let i = 1; i <= 12; i++) emptyNorms[i.toString()] = 160;
          setMonthlyNorms(emptyNorms);
        }
      } catch (error) {
        console.error('Error fetching norms:', error);
      }
    };
    fetchNorms();
  }, [showNormsModal, normsYear]);

  const handleSaveNorms = async () => {
    setSavingNorms(true);
    try {
      const res = await fetch('/api/staff/norms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: normsYear, months: monthlyNorms }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Норми на ${normsYear} рік збережено`);
        setShowNormsModal(false);
      } else {
        toast.error(data.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving norms:', error);
      toast.error('Помилка сервера');
    } finally {
      setSavingNorms(false);
    }
  };

  // Get calendar dates
  const calendarDates = useMemo(() => {
    const dates: { date: string; isCurrentMonth: boolean }[] = [];
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = firstDay.getDay(); // 0 = Sunday

      // Previous month days
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({ date, isCurrentMonth: false });
      }

      // Current month days
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({ date, isCurrentMonth: true });
      }

      // Next month days (fill to 42 cells = 6 rows × 7 days)
      const remainingDays = 42 - dates.length;
      const nextMonth = new Date(year, month + 1, 0);
      for (let day = 1; day <= remainingDays; day++) {
        const nextMonthNum = month + 2 > 11 ? 0 : month + 2;
        const nextYear = month + 2 > 11 ? year + 1 : year;
        const date = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({ date, isCurrentMonth: false });
      }
    } else {
      // Week view
      const day = selectedDate.getDay();
      const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(selectedDate);
      monday.setDate(diff);

      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dates.push({ date: dateStr, isCurrentMonth: true });
      }
    }

    return dates;
  }, [selectedDate, viewMode]);

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, ScheduleEntry[]> = {};
    calendarDates.forEach(({ date }) => {
      grouped[date] = schedules.filter(s => {
        const scheduleDate = s.date.split('T')[0];
        return scheduleDate === date;
      });
    });
    return grouped;
  }, [schedules, calendarDates]);

  // Calculate shift statistics for selected staff
  const shiftStats = useMemo(() => {
    const currentMonthSchedules = schedules.filter(s => {
      const scheduleDate = s.date.split('T')[0];
      const scheduleMonth = new Date(scheduleDate).getMonth();
      const currentMonth = selectedDate.getMonth();
      return scheduleMonth === currentMonth;
    });

    const totalShifts = currentMonthSchedules.length;
    let totalHours = 0;

    currentMonthSchedules.forEach(shift => {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      if (shift.endTime && shift.endTime !== 'Триває') {
        const [endHour, endMin] = shift.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        totalHours += (endMinutes - startMinutes);
      }
    });

    const totalHoursFormatted = Math.floor(totalHours / 60);
    const totalMinutes = totalHours % 60;

    return {
      totalShifts,
      totalHours: totalHoursFormatted,
      totalMinutes,
      totalHoursString: `${totalHoursFormatted}г ${totalMinutes > 0 ? totalMinutes + 'хв' : ''}`,
    };
  }, [schedules, selectedDate]);

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    setFormData(prev => ({ ...prev, staffId }));
  };

  const handleAddShift = () => {
    if (scheduleType === 'actual' && !isAdmin) return;
    if (!selectedStaffId) {
      toast.error('Оберіть співробітника');
      return;
    }
    setFormData(prev => ({ ...prev, id: "", date: new Date().toISOString().split('T')[0] }));
    setShowAddModal(true);
  };

  const handleSlotClick = (date: string) => {
    if (scheduleType === 'actual' && !isAdmin) return;
    setSelectedSlot({ date });
    setFormData(prev => ({
      ...prev,
      id: "",
      date,
    }));
    setShowAddModal(true);
  };

  const handleEditShift = (shift: ScheduleEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scheduleType === 'actual' && !isAdmin) return;
    setSelectedSlot({ date: shift.date });
    setFormData({
      id: shift._id,
      staffId: shift.staffId,
      date: shift.date.split('T')[0],
      startTime: shift.startTime,
      endTime: shift.endTime === "Триває" ? "" : shift.endTime,
      notes: shift.notes || "",
    });
    setShowAddModal(true);
  };

  const handleDeleteShift = async (shiftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scheduleType === 'actual' && !isAdmin) return;
    if (!confirm('Видалити цю зміну?')) return;

    try {
      const url = scheduleType === 'actual' ? `/api/staff/schedule/actual/${shiftId}` : `/api/staff/schedule/${shiftId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Зміну видалено');
        fetchSchedules();
      } else {
        toast.error('Помилка видалення');
      }
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staffId) {
      toast.error('Оберіть співробітника');
      return;
    }

    try {
      const url = scheduleType === 'actual'
        ? formData.id ? `/api/staff/schedule/actual/${formData.id}` : `/api/staff/schedule/actual`
        : `/api/staff/${formData.staffId}/schedule`;

      const method = scheduleType === 'actual' ? (formData.id ? 'PUT' : 'POST') : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Змебережено');
        setShowAddModal(false);
        setFormData({
          id: "",
          staffId: selectedStaffId,
          date: "",
          startTime: "09:00",
          endTime: "18:00",
          notes: "",
        });
        setSelectedSlot(null);
        await fetchSchedules();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Помилка збереження');
      }
    } catch (error) {
      toast.error('Помилка збереження');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);

    if (viewMode === 'month') {
      currentDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    }

    setSelectedDate(currentDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const selectedStaff = staff.find(s => s._id === selectedStaffId);

  if (loading && !selectedStaffId) return <Preloader message="Завантаження..." />;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <button onClick={() => router.back()} className={styles.btnBack}>← Назад</button>
            <h1 className={styles.pageTitle}>
              <span className={styles.pageTitleIcon}>📅</span>
              Графік роботи
            </h1>
            <p className={styles.pageSubtitle}>Управління змінами та графіком персоналу</p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={() => router.push('/staff/schedule/summary')} className={styles.btnSecondary}>
              📊 Зведений
            </button>
            {isAdmin && (
              <button onClick={() => setShowNormsModal(true)} className={styles.btnSecondary}>
                ⚙️ Норми
              </button>
            )}
            {(!scheduleType || scheduleType === 'planned' || isAdmin) && (
              <button onClick={handleAddShift} className={styles.btnAdd}>
                + Додати зміну
              </button>
            )}
          </div>
        </div>

        {/* Staff Selector */}
        <div className={styles.staffSelector}>
          <label className={styles.selectorLabel}>Співробітник:</label>
          <select
            value={selectedStaffId}
            onChange={(e) => handleStaffChange(e.target.value)}
            className={styles.staffSelect}
          >
            {staff.map(s => (
              <option key={s._id} value={s._id}>{getDisplayName(s)} ({s.position || 'Без посади'})</option>
            ))}
          </select>
          {selectedStaff && (
            <div className={styles.staffInfo}>
              <Avatar name={getDisplayName(selectedStaff)} size="md" variant="gradient" />
              <div className={styles.staffDetails}>
                <span className={styles.staffName}>{getDisplayName(selectedStaff)}</span>
                <Badge variant={selectedStaff.status === 'active' ? 'success' : 'outline'}>
                  {selectedStaff.status === 'active' ? 'Активний' : 'Неактивний'}
                </Badge>
              </div>
            </div>
          )}
          {selectedStaffId && (
            <div className={styles.shiftStats}>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>📅</span>
                <span className={styles.statValue}>{shiftStats.totalShifts}</span>
                <span className={styles.statLabel}>змін</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statIcon}>⏱️</span>
                <span className={styles.statValue}>{shiftStats.totalHours}</span>
                <span className={styles.statLabel}>годин</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.navControls}>
            <button onClick={() => navigateDate('prev')} className={styles.navBtn}>←</button>
            <span className={styles.dateLabel}>
              {viewMode === 'week'
                ? `Тиждень ${selectedDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}`
                : selectedDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
              }
            </span>
            <button onClick={() => navigateDate('next')} className={styles.navBtn}>→</button>
            <button onClick={goToToday} className={styles.todayBtn}>
              Сьогодні
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* View Type Toggle */}
            <div className={styles.viewModeToggle}>
              <button
                className={`${styles.viewBtn} ${scheduleType === 'planned' ? styles.active : ''}`}
                onClick={() => setScheduleType('planned')}
              >
                Плановий
              </button>
              <button
                className={`${styles.viewBtn} ${scheduleType === 'actual' ? styles.active : ''}`}
                onClick={() => setScheduleType('actual')}
              >
                Фактичний
              </button>
            </div>

            {/* Scale Toggle */}
            <div className={styles.viewModeToggle}>
              <button
                className={`${styles.viewBtn} ${viewMode === 'week' ? styles.active : ''}`}
                onClick={() => setViewMode('week')}
              >
                Тиждень
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === 'month' ? styles.active : ''}`}
                onClick={() => setViewMode('month')}
              >
                Місяць
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <Preloader message="Завантаження графіку..." />
        ) : (
          <div className={styles.calendarGrid}>
            {/* Day Headers */}
            {['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'].map((dayName, index) => (
              <div key={dayName} className={styles.dayHeader}>
                <span className={styles.dayNameHeader}>{dayName}</span>
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDates.map(({ date, isCurrentMonth }) => {
              const dateObj = new Date(date);
              const dayNum = dateObj.getDate();
              const isToday = date === new Date().toISOString().split('T')[0];
              const daySchedules = schedulesByDate[date] || [];
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

              return (
                <div
                  key={date}
                  className={`
                    ${styles.calendarDay}
                    ${!isCurrentMonth ? styles.otherMonth : ''}
                    ${isToday ? styles.today : ''}
                    ${isWeekend ? styles.weekend : ''}
                    ${daySchedules.length > 0 ? styles.hasShifts : ''}
                  `}
                  onClick={() => handleSlotClick(date)}
                  style={{ cursor: scheduleType === 'actual' && !isAdmin ? 'default' : 'pointer' }}
                >
                  <div className={styles.dayNumber}>
                    {dayNum}
                    {isToday && <span className={styles.todayIndicator}>●</span>}
                  </div>
                  <div className={styles.dayShifts}>
                    {daySchedules.map(shift => (
                      <div
                        key={shift._id}
                        className={styles.shiftCard}
                        onClick={(e) => handleEditShift(shift, e)}
                        style={{ cursor: scheduleType === 'actual' && !isAdmin ? 'default' : 'pointer' }}
                      >
                        <span className={styles.shiftTime}>
                          {shift.startTime} - {shift.endTime}
                          {shift.isManualEdit && <span style={{ fontSize: "0.6rem", display: "block" }}>🛠️ Ручне ред.</span>}
                        </span>
                        {(!scheduleType || scheduleType === 'planned' || isAdmin) && (
                          <button
                            className={styles.shiftDelete}
                            onClick={(e) => handleDeleteShift(shift._id, e)}
                            title="Видалити зміну"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {daySchedules.length === 0 && (!scheduleType || scheduleType === 'planned' || isAdmin) && (
                      <span className={styles.emptyDay}>+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Shift Modal */}
      {showAddModal && (
        <Modal
          title={selectedSlot && schedulesByDate[selectedSlot.date]?.length ? 'Редагувати зміну' : 'Додати зміну'}
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedSlot(null);
          }}
          size="md"
        >
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Співробітник *</label>
              <select
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                className={styles.select}
                required
              >
                <option value="">Оберіть співробітника</option>
                {staff.map(s => (
                  <option key={s._id} value={s._id}>{getDisplayName(s)} ({s.position || 'Без посади'})</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Дата *</label>
              <input
                type="date"
                value={formData.date || selectedSlot?.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Початок *</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Кінець</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={styles.input}
                  required={scheduleType === 'planned'}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Нотатки</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className={styles.textarea}
                rows={3}
                placeholder="Додаткова інформація"
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedSlot(null);
                }}
                className={styles.btnCancel}
              >
                Скасувати
              </button>
              <button type="submit" className={styles.btnSubmit}>
                {selectedSlot && schedulesByDate[selectedSlot.date]?.length ? 'Оновити' : 'Додати'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Norms Modal */}
      {showNormsModal && (
        <Modal
          isOpen={showNormsModal}
          onClose={() => setShowNormsModal(false)}
          title={`Управління нормами годин на ${normsYear} рік`}
        >
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Виберіть рік:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[2024, 2025, 2026, 2027].map(y => (
                  <button
                    key={y}
                    onClick={() => setNormsYear(y)}
                    className={`${styles.todayBtn} ${normsYear === y ? styles.active : ''}`}
                    style={normsYear === y ? { background: 'var(--orange-500)', color: 'white', borderColor: 'var(--orange-500)' } : {}}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.monthsGrid}>
              {['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'].map((m, i) => (
                <div key={i} className={styles.monthInput}>
                  <span>{m}</span>
                  <input
                    type="number"
                    className={styles.input}
                    value={monthlyNorms[(i + 1).toString()] || ''}
                    onChange={(e) => setMonthlyNorms({ ...monthlyNorms, [(i + 1).toString()]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <div className={styles.formActions} style={{ marginTop: '2rem' }}>
              <button onClick={() => setShowNormsModal(false)} className={styles.btnCancel}>Скасувати</button>
              <button
                onClick={handleSaveNorms}
                className={styles.btnSubmit}
                disabled={savingNorms}
              >
                {savingNorms ? 'Збереження...' : 'Зберегти норми'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    // </div>
  );
}
