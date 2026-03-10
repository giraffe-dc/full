"use client";

import { useEffect } from 'react';
import { EventFormData, FormErrors, Department, Table } from '../EventFormModal.types';
import styles from '../EventFormModal.module.css';
import { useDepartmentsAndTables } from '../useDepartmentsAndTables';

interface EventBasicInfoProps {
  formData: EventFormData;
  errors: FormErrors;
  durationDisplay: { hours: number; minutes: number; formatted: string };
  departments: Department[];
  tables: Table[];
  loadingDepartments: boolean;
  loadingTables: boolean;
  selectedDepartment: string;
  selectedTable: string;
  onUpdateField: (field: keyof EventFormData, value: any) => void;
  onDepartmentChange: (deptId: string) => void;
  onTableChange: (tableId: string) => void;
  onTableCreate: (tableName: string) => Promise<void>;
}

export function EventBasicInfo({
  formData,
  errors,
  durationDisplay,
  selectedDepartment,
  selectedTable,
  onUpdateField,
  onDepartmentChange,
  onTableChange,
  onTableCreate,
}: EventBasicInfoProps) {
  const { departments, tables, loadingDepartments, loadingTables, fetchTables, createTable } = useDepartmentsAndTables();

  // Fetch tables when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchTables(selectedDepartment);
    } else {
      fetchTables('');
    }
  }, [selectedDepartment]);

  // Handle table creation
  const handleCreateTable = async () => {
    const tableName = prompt('Введіть назву столу:');
    if (tableName && selectedDepartment) {
      await onTableCreate(tableName);
    }
  };

  return (
    <div className={styles.formGrid}>
      {/* Тип і Статус */}
      <div className={styles.formGroup}>
        <label>Тип події *</label>
        <select
          value={formData.eventType}
          onChange={(e) => onUpdateField('eventType', e.target.value)}
          className={`${styles.select} ${errors.eventType ? styles.selectError : ''}`}
          required
        >
          <option value="birthday">День народження</option>
          <option value="corporate">Корпоратив</option>
          <option value="graduation">Випускний</option>
          <option value="holiday">Виїздні</option>
          <option value="other">Інше</option>
        </select>
        {errors.eventType && <span className={styles.error}>{errors.eventType}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Статус *</label>
        <select
          value={formData.status}
          onChange={(e) => onUpdateField('status', e.target.value)}
          className={`${styles.select} ${errors.status ? styles.selectError : ''}`}
          required
        >
          <option value="draft">Чернетка</option>
          <option value="confirmed">Підтверджено</option>
          <option value="in_progress">В процесі</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Скасовано</option>
        </select>
        {errors.status && <span className={styles.error}>{errors.status}</span>}
      </div>

      {/* Назва */}
      <div className={styles.formGroupFull}>
        <label>Назва події *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onUpdateField('title', e.target.value)}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          placeholder="Наприклад: День народження Софії"
          required
        />
        {errors.title && <span className={styles.error}>{errors.title}</span>}
      </div>

      {/* Зал і Стіл */}
      <div className={styles.formGroup}>
        <label>Зал *</label>
        <select
          value={selectedDepartment}
          onChange={(e) => {
            onDepartmentChange(e.target.value);
            onTableChange('');
          }}
          className={`${styles.select} ${errors.department ? styles.selectError : ''}`}
          disabled={loadingDepartments}
          required
        >
          <option value="">Оберіть зал</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        {errors.department && <span className={styles.error}>{errors.department}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Стіл *</label>
        <div className={styles.tableSelectWrapper}>
          <select
            value={selectedTable}
            onChange={(e) => onTableChange(e.target.value)}
            className={`${styles.select} ${errors.table ? styles.selectError : ''}`}
            disabled={!selectedDepartment || loadingTables}
            required
          >
            <option value="">Оберіть стіл</option>
            {tables.map(table => (
              <option key={table.id} value={table.id} disabled={table.status === 'busy'}>
                {table.name} {table.status === 'busy' ? '(зайнятий)' : '(вільний)'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateTable}
            className={styles.addTableBtn}
            title="Створити новий стіл"
            disabled={!selectedDepartment}
          >
            +
          </button>
        </div>
        {errors.table && <span className={styles.error}>{errors.table}</span>}
      </div>

      {/* Дата і Час */}
      <div className={styles.formGroup}>
        <label>Дата *</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => onUpdateField('date', e.target.value)}
          className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
          required
        />
        {errors.date && <span className={styles.error}>{errors.date}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Час початку *</label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => onUpdateField('startTime', e.target.value)}
          className={`${styles.input} ${errors.startTime ? styles.inputError : ''}`}
          required
        />
        {errors.startTime && <span className={styles.error}>{errors.startTime}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Час завершення *</label>
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => onUpdateField('endTime', e.target.value)}
          className={`${styles.input} ${errors.endTime ? styles.inputError : ''}`}
          required
        />
        {errors.endTime && <span className={styles.error}>{errors.endTime}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Тривалість</label>
        <div className={styles.durationDisplay}>
          <span className={styles.durationValue}>
            {durationDisplay.hours} год {durationDisplay.minutes} хв
          </span>
          <span className={styles.durationHint}>({formData.duration} хв)</span>
        </div>
      </div>

      {/* Клієнт */}
      <div className={styles.formGroup}>
        <label>Ім'я клієнта *</label>
        <input
          type="text"
          value={formData.clientName}
          onChange={(e) => onUpdateField('clientName', e.target.value)}
          className={`${styles.input} ${errors.clientName ? styles.inputError : ''}`}
          required
        />
        {errors.clientName && <span className={styles.error}>{errors.clientName}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Телефон *</label>
        <input
          type="tel"
          value={formData.clientPhone}
          onChange={(e) => onUpdateField('clientPhone', e.target.value)}
          className={`${styles.input} ${errors.clientPhone ? styles.inputError : ''}`}
          required
        />
        {errors.clientPhone && <span className={styles.error}>{errors.clientPhone}</span>}
      </div>

      <div className={styles.formGroup}>
        <label>Email</label>
        <input
          type="email"
          value={formData.clientEmail}
          onChange={(e) => onUpdateField('clientEmail', e.target.value)}
          className={styles.input}
        />
      </div>

      {/* Гості */}
      <div className={styles.formGroup}>
        <label>Діти</label>
        <input
          type="number"
          value={formData.childGuests}
          onChange={(e) => onUpdateField('childGuests', parseInt(e.target.value) || 0)}
          className={styles.input}
          min="0"
        />
      </div>

      <div className={styles.formGroup}>
        <label>Дорослі</label>
        <input
          type="number"
          value={formData.adultGuests}
          onChange={(e) => onUpdateField('adultGuests', parseInt(e.target.value) || 0)}
          className={styles.input}
          min="0"
        />
      </div>

      {/* Коментарі */}
      <div className={styles.formGroupFull}>
        <label>Побажання клієнта</label>
        <textarea
          value={formData.clientNotes}
          onChange={(e) => onUpdateField('clientNotes', e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Наприклад: Алергія на полуницю"
        />
      </div>

      <div className={styles.formGroupFull}>
        <label>Внутрішні нотатки</label>
        <textarea
          value={formData.internalNotes}
          onChange={(e) => onUpdateField('internalNotes', e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Для персоналу"
        />
      </div>
    </div>
  );
}
