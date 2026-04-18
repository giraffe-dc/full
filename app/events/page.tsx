"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Event, EventType, EventStatus, CalendarEvent, CalendarViewMode, CalendarFilters, PaymentStatus } from '@/types/events';
import styles from './page.module.css';
import { useToast } from '@/components/ui/ToastContext';
import { Preloader } from '@/components/ui/Preloader';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { EventFormModal } from '@/components/events/EventFormModal';
import { EventDetailsModal } from '@/components/events/EventDetailsModal';
import { EventFilters } from '@/components/events/EventFilters';

// Event type colors - modified by payment status
const getEventColors = (event: Event) => {
  // Cancelled events get red color
  if (event.status === 'cancelled') {
    return { bg: 'rgba(239, 68, 68, 0.43)', border: '#ef4444', text: '#dc2626' };
  }

  // Paid events get green color
  if (event.paymentStatus === 'paid') {
    return { bg: 'rgba(34, 197, 94, 0.3)', border: '#22c55e', text: '#16a34a' };
  }

  // Default colors by event type
  const EVENT_TYPE_COLORS: Record<EventType, { bg: string; border: string; text: string }> = {
    birthday: { bg: 'rgba(41, 25, 192, 0.2)', border: '#2f45c0ff', text: '#05035eff' },
    corporate: { bg: 'rgba(139, 11, 224, 0.2)', border: '#a00da5ff', text: '#3b82f6' },
    graduation: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#10b981' },
    holiday: { bg: 'rgba(241, 220, 24, 0.8)', border: '#e9853eff', text: '#f97316' },
    other: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6', text: '#8b5cf6' },
  };

  return EVENT_TYPE_COLORS[event.eventType];
};

const EVENT_TYPE_ICONS: Record<EventType, string> = {
  birthday: '🎂',
  corporate: '🎉',
  graduation: '🎓',
  holiday: '🎊',
  other: '📅',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Чернетка',
  confirmed: 'Підтверджено',
  in_progress: 'В процесі',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EventsPage() {
  const router = useRouter();
  const toast = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(formatDateString(new Date()));
  const [filterEventTypes, setFilterEventTypes] = useState<EventType[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<EventStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const handleOpenDashboard = () => {
    router.push('/events/dashboard');
  };

  const handleOpenPackages = () => {
    router.push('/events/packages');
  };

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Calculate date range based on view mode
      const currentDate = new Date(selectedDate);
      let startDate: string;
      let endDate: string;

      switch (viewMode) {
        case 'day':
          startDate = selectedDate;
          endDate = selectedDate;
          break;
        case 'week':
          const weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - currentDate.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          startDate = formatDateString(weekStart);
          endDate = formatDateString(weekEnd);
          break;
        case 'month':
        default:
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          startDate = formatDateString(monthStart);
          endDate = formatDateString(monthEnd);
          break;
      }

      params.set('startDate', startDate);
      params.set('endDate', endDate);

      if (filterEventTypes.length > 0) {
        params.set('eventTypes', filterEventTypes.join(','));
      }

      if (filterStatuses.length > 0) {
        params.set('statuses', filterStatuses.join(','));
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Помилка завантаження подій');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, selectedDate, viewMode]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filterEventTypes.length > 0 && !filterEventTypes.includes(event.eventType)) {
        return false;
      }
      if (filterStatuses.length > 0 && !filterStatuses.includes(event.status)) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.title.toLowerCase().includes(query) ||
          event.clientName.toLowerCase().includes(query) ||
          event.clientEmail?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [events, filterEventTypes, filterStatuses, searchQuery]);

  // Convert to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return filteredEvents.map(event => {
      const colors = getEventColors(event);
      const icon = EVENT_TYPE_ICONS[event.eventType];

      // Add status indicator to title
      let title = `${icon} ${event.title}`;
      if (event.status === 'cancelled') {
        title = `❌ ${title}`;
      } else if (event.paymentStatus === 'paid') {
        title = `✅ ${title}`;
      }

      return {
        id: event.id,
        title,
        start: `${event.date}T${event.startTime}`,
        end: `${event.date}T${event.endTime}`,
        eventType: event.eventType,
        status: event.status,
        clientName: event.clientName,
        totalGuests: event.totalGuests,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        extendedProps: {
          paymentStatus: event.paymentStatus,
          total: event.total,
          paidAmount: event.paidAmount,
          event,
        },
      };
    });
  }, [filteredEvents]);

  // Group events by date for list view
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    filteredEvents.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort();
    const result: Record<string, Event[]> = {};
    sortedDates.forEach(date => {
      result[date] = grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return result;
  }, [filteredEvents]);

  // Navigation handlers
  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);

    switch (viewMode) {
      case 'day':
        currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
      default:
        currentDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }

    setSelectedDate(formatDateString(currentDate));
  };

  const goToToday = () => {
    setSelectedDate(formatDateString(new Date()));
  };

  // Modal handlers
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setShowFormModal(true);
  };

  const handleOpenDetails = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setShowFormModal(true);
    setShowDetailsModal(false);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цю подію?')) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Подію видалено');
        fetchEvents();
        setShowDetailsModal(false);
      } else {
        toast.error('Помилка видалення');
      }
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleFormSubmit = () => {
    fetchEvents();
    setShowFormModal(false);
  };

  // Get visible date range label
  const getDateRangeLabel = () => {
    const currentDate = new Date(selectedDate);
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      case 'month':
      default:
        return currentDate.toLocaleDateString('uk-UA', options);
    }
  };

  if (!user) return <Preloader message="Перевірка авторизації..." />;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎉 Управління подіями</h1>
          <p className={styles.lead}>Організація та проведення святкових подій</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleOpenDashboard} className={styles.btnSecondary}>
            📊 Аналітика
          </button>
          <button onClick={handleOpenPackages} className={styles.btnSecondary}>
            📦 Пакети
          </button>
          <button onClick={handleOpenCreate} className={styles.btnAdd}>
            + Додати подію
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className={styles.controls}>
        {/* <EventFilters
          eventTypes={filterEventTypes}
          statuses={filterStatuses}
          searchQuery={searchQuery}
          onEventTypeChange={setFilterEventTypes}
          onStatusChange={setFilterStatuses}
          onSearchChange={setSearchQuery}
        /> */}

        <div className={styles.viewControls}>
          <button onClick={() => navigateDate('prev')} className={styles.navBtn}>←</button>
          <span className={styles.dateLabel}>{getDateRangeLabel()}</span>
          <button onClick={() => navigateDate('next')} className={styles.navBtn}>→</button>
          <button onClick={goToToday} className={styles.todayBtn}>Сьогодні</button>

          <div className={styles.viewModeToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Місяць
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Тиждень
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'day' ? styles.active : ''}`}
              onClick={() => setViewMode('day')}
            >
              День
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              Список
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Preloader message="Завантаження подій..." />
      ) : (
        <div className={styles.content}>
          {viewMode === 'list' ? (
            /* List View */
            <div className={styles.listView}>
              {Object.keys(eventsByDate).length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Подій не знайдено</p>
                  <button onClick={handleOpenCreate} className={styles.btnCreate}>
                    Створити першу подію
                  </button>
                </div>
              ) : (
                Object.entries(eventsByDate).map(([date, dateEvents]) => (
                  <div key={date} className={styles.dateGroup}>
                    <h3 className={styles.dateHeader}>
                      {new Date(date).toLocaleDateString('uk-UA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                    <div className={styles.eventsList}>
                      {dateEvents.map(event => {
                        const colors = getEventColors(event);
                        const icon = EVENT_TYPE_ICONS[event.eventType];

                        // Add paid badge
                        const isPaid = event.paymentStatus === 'paid';

                        return (
                          <div
                            key={event.id}
                            className={styles.eventCard}
                            onClick={() => handleOpenDetails(event)}
                            style={{
                              borderLeftColor: colors.border,
                              opacity: isPaid ? 0.7 : 1,
                            }}
                          >
                            <div className={styles.eventCardHeader}>
                              <span className={styles.eventTime}>
                                {event.startTime} - {event.endTime}
                              </span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {isPaid && (
                                  <span
                                    className={styles.statusBadge}
                                    style={{ backgroundColor: '#22c55e', color: 'white' }}
                                  >
                                    ✅ Оплачено
                                  </span>
                                )}
                                <span
                                  className={styles.statusBadge}
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                  {STATUS_LABELS[event.status]}
                                </span>
                              </div>
                            </div>
                            <h4 className={styles.eventCardTitle}>
                              {icon} {event.title}
                            </h4>
                            <div className={styles.eventCardMeta}>
                              <span>👤 {event.clientName}</span>
                              <span>👥 {event.totalGuests} гостей</span>
                              <span>💰 {event.total} ₴</span>
                              {isPaid && (
                                <span style={{ color: '#22c55e', fontWeight: 700 }}>
                                  💳 Сплачено: {event.paidAmount} ₴
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Calendar View */
            <div className={styles.calendarView}>
              <div className={styles.calendarGrid}>
                {/* Weekday headers - integrated directly into grid */}
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(day => (
                  <div key={day} className={styles.weekdayCell}>{day}</div>
                ))}

                {/* Calendar days */}
                {(() => {
                  const currentDate = new Date(selectedDate);
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();

                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);

                  // Fix: Ukrainian calendar starts on Monday
                  // getDay(): Sun=0, Mon=1, ..., Sat=6
                  // Convert to: Mon=0, Tue=1, ..., Sun=6
                  let startDay = firstDay.getDay();
                  const startDayIndex = startDay === 0 ? 6 : startDay - 1;

                  const totalDays = lastDay.getDate();

                  const days = [];

                  // Previous month days
                  const prevMonth = new Date(year, month, 0);
                  const prevMonthDays = prevMonth.getDate();
                  for (let i = startDayIndex; i > 0; i--) {
                    const day = prevMonthDays - i + 1;
                    days.push({ day, month: month - 1, current: false });
                  }

                  // Current month days
                  for (let day = 1; day <= totalDays; day++) {
                    days.push({ day, month, current: true });
                  }

                  // Next month days
                  const remainingDays = 42 - days.length; // 6 rows * 7 days
                  for (let day = 1; day <= remainingDays; day++) {
                    days.push({ day, month: month + 1, current: false });
                  }

                  return days.map(({ day, month: m, current }, index) => {
                    const actualMonth = m < 0 ? 11 : m > 11 ? 0 : m;
                    const actualYear = m < 0 ? year - 1 : m > 11 ? year + 1 : year;
                    const dateStr = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = calendarEvents.filter(e => e.start.startsWith(dateStr));
                    const isToday = dateStr === formatDateString(new Date());

                    return (
                      <div
                        key={index}
                        className={`${styles.calendarDay} ${!current ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}
                        onClick={() => setSelectedDate(dateStr)}
                      >
                        <div className={styles.dayNumber}>
                          {day}
                          {isToday && <span className={styles.todayIndicator}>●</span>}
                        </div>
                        <div className={styles.dayEvents}>
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={styles.calendarEvent}
                              style={{
                                backgroundColor: event.backgroundColor,
                                borderColor: event.borderColor,
                                color: event.textColor,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetails((event.extendedProps as any).event);
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className={styles.moreEvents}>
                              +{dayEvents.length - 3} ще
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showFormModal && (
        <EventFormModal
          event={editingEvent}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {showDetailsModal && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setShowDetailsModal(false)}
          onEdit={() => handleEdit(selectedEvent)}
          onDelete={() => handleDelete(selectedEvent.id)}
        />
      )}
    </div>
  );
}
