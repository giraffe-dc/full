"use client";

import { useState, useEffect } from 'react';
import { Event, EventType, EventStatus, PaymentStatus, EventPackage, ServiceItem, ResourceBooking } from '@/types/events';
import styles from './EventFilters.module.css';

interface EventFiltersProps {
  eventTypes: EventType[];
  statuses: EventStatus[];
  searchQuery: string;
  onEventTypeChange: (types: EventType[]) => void;
  onStatusChange: (statuses: EventStatus[]) => void;
  onSearchChange: (query: string) => void;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: 'День народження',
  corporate: 'Корпоратив',
  graduation: 'Випускний',
  holiday: 'Виїздні',
  other: 'Інше',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Чернетка',
  confirmed: 'Підтверджено',
  in_progress: 'В процесі',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};

export function EventFilters({
  eventTypes,
  statuses,
  searchQuery,
  onEventTypeChange,
  onStatusChange,
  onSearchChange,
}: EventFiltersProps) {
  const toggleEventType = (type: EventType) => {
    if (eventTypes.includes(type)) {
      onEventTypeChange(eventTypes.filter(t => t !== type));
    } else {
      onEventTypeChange([...eventTypes, type]);
    }
  };

  const toggleStatus = (status: EventStatus) => {
    if (statuses.includes(status)) {
      onStatusChange(statuses.filter(s => s !== status));
    } else {
      onStatusChange([...statuses, status]);
    }
  };

  const clearAll = () => {
    onEventTypeChange([]);
    onStatusChange([]);
    onSearchChange('');
  };

  const hasFilters = eventTypes.length > 0 || statuses.length > 0 || searchQuery;

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Пошук</label>
        <input
          type="text"
          placeholder="Пошук за назвою або клієнтом..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Тип події</label>
        <div className={styles.checkboxGroup}>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(type => (
            <label key={type} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={eventTypes.includes(type)}
                onChange={() => toggleEventType(type)}
              />
              <span>{EVENT_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Статус</label>
        <div className={styles.checkboxGroup}>
          {(Object.keys(STATUS_LABELS) as EventStatus[]).map(status => (
            <label key={status} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={statuses.includes(status)}
                onChange={() => toggleStatus(status)}
              />
              <span>{STATUS_LABELS[status]}</span>
            </label>
          ))}
        </div>
      </div>

      {hasFilters && (
        <div className={styles.filterActions}>
          <button onClick={clearAll} className={styles.clearBtn}>
            Очистити фільтри
          </button>
        </div>
      )}
    </div>
  );
}
