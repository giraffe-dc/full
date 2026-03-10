"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EventStatistics, EventType, EventStatus } from '../../../types/events';
import styles from './page.module.css';
import { Preloader } from '@/components/ui/Preloader';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

export default function EventsDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      
      const [statsRes, revenueRes] = await Promise.all([
        fetch(`/api/events/statistics/summary?${params.toString()}`),
        fetch(`/api/events/statistics/revenue?${params.toString()}&groupBy=day`),
      ]);

      const statsData = await statsRes.json();
      const revenueData = await revenueRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (revenueData.success) {
        setRevenueData(revenueData.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  }, [user, startDate, endDate]);

  const maxRevenue = useMemo(() => {
    return Math.max(...revenueData.map(d => d.revenue), 0);
  }, [revenueData]);

  if (!user) return <Preloader message="Перевірка авторизації..." />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Аналітика подій</h1>
          <p className={styles.lead}>Статистика та показники ефективності</p>
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      {loading ? (
        <Preloader message="Завантаження статистики..." />
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>🎉</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Всього подій</span>
                <span className={styles.kpiValue}>{stats.totalEvents}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>✅</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Проведено</span>
                <span className={styles.kpiValue}>{stats.completedEvents}</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>💰</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Виручка</span>
                <span className={styles.kpiValue}>{stats.totalRevenue.toLocaleString()} ₴</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>📈</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Середній чек</span>
                <span className={styles.kpiValue}>{Math.round(stats.averageCheck).toLocaleString()} ₴</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>🎯</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Конверсія</span>
                <span className={styles.kpiValue}>{stats.conversionRate}%</span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>❌</div>
              <div className={styles.kpiContent}>
                <span className={styles.kpiLabel}>Скасовано</span>
                <span className={styles.kpiValue}>{stats.cancelledEvents}</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className={styles.chartsGrid}>
            {/* Revenue Chart */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Виручка по днях</h3>
              <div className={styles.barChart}>
                {revenueData.length === 0 ? (
                  <div className={styles.emptyChart}>Немає даних</div>
                ) : (
                  revenueData.map((item, index) => {
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    const date = new Date(item.period);
                    const dayLabel = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                    
                    return (
                      <div key={item.period} className={styles.barItem}>
                        <div className={styles.barContainer}>
                          <div
                            className={styles.bar}
                            style={{ height: `${height}%` }}
                            title={`${item.revenue} ₴`}
                          />
                        </div>
                        <span className={styles.barLabel}>{dayLabel}</span>
                        <span className={styles.barValue}>{item.revenue} ₴</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Events by Type */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Події по типах</h3>
              <div className={styles.typeBreakdown}>
                {(Object.entries(stats.eventsByType) as [EventType, number][]).map(([type, count]) => {
                  const percentage = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
                  const typeLabels: Record<EventType, string> = {
                    birthday: 'День народження',
                    corporate: 'Корпоратив',
                    graduation: 'Випускний',
                    holiday: 'Свято',
                    other: 'Інше',
                  };
                  const typeColors: Record<EventType, string> = {
                    birthday: '#ec4899',
                    corporate: '#3b82f6',
                    graduation: '#10b981',
                    holiday: '#f97316',
                    other: '#8b5cf6',
                  };

                  return (
                    <div key={type} className={styles.typeItem}>
                      <div className={styles.typeHeader}>
                        <span className={styles.typeName}>{typeLabels[type]}</span>
                        <span className={styles.typeCount}>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className={styles.typeBar}>
                        <div
                          className={styles.typeBarFill}
                          style={{ width: `${percentage}%`, backgroundColor: typeColors[type] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events by Status */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Події по статусах</h3>
              <div className={styles.statusBreakdown}>
                {(Object.entries(stats.eventsByStatus) as [EventStatus, number][]).map(([status, count]) => {
                  const percentage = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
                  const statusLabels: Record<EventStatus, string> = {
                    draft: 'Чернетка',
                    confirmed: 'Підтверджено',
                    in_progress: 'В процесі',
                    completed: 'Завершено',
                    cancelled: 'Скасовано',
                  };
                  const statusColors: Record<EventStatus, string> = {
                    draft: '#6b7280',
                    confirmed: '#3b82f6',
                    in_progress: '#f59e0b',
                    completed: '#10b981',
                    cancelled: '#ef4444',
                  };

                  return (
                    <div key={status} className={styles.statusItem}>
                      <div
                        className={styles.statusDot}
                        style={{ backgroundColor: statusColors[status] }}
                      />
                      <span className={styles.statusName}>{statusLabels[status]}</span>
                      <span className={styles.statusCount}>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Packages */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Популярні пакети</h3>
              {stats.popularPackages.length === 0 ? (
                <div className={styles.emptyChart}>Немає даних</div>
              ) : (
                <div className={styles.packagesList}>
                  {stats.popularPackages.map((pkg, index) => (
                    <div key={pkg.packageId} className={styles.packageItem}>
                      <span className={styles.packageRank}>{index + 1}</span>
                      <span className={styles.packageName}>{pkg.name}</span>
                      <span className={styles.packageCount}>{pkg.count} подій</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>Не вдалося завантажити статистику</p>
          <button onClick={fetchStatistics} className={styles.btnRetry}>
            Спробувати знову
          </button>
        </div>
      )}
    </div>
  );
}
