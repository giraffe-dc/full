"use client";

import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import styles from '../EventFormModal.module.css';

interface NewTableFormProps {
  departmentId: string;
  onSuccess: (table: { id: string; name: string }) => void;
  onClose: () => void;
}

export function NewTableForm({ departmentId, onSuccess, onClose }: NewTableFormProps) {
  const [loading, setLoading] = useState(false);
  const [tableName, setTableName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/cash-register/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tableName,
          departmentId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.data);
      } else {
        alert(data.error || 'Помилка створення столу');
      }
    } catch (error) {
      alert('Помилка створення столу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Створити новий стіл" isOpen={true} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '0 24px' }}>
          <div className={styles.formGroup}>
            <label>Назва столу *</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className={styles.input}
              placeholder="Наприклад: Стіл 1"
              required
              autoFocus
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnCancel}>
            Скасувати
          </button>
          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? 'Створення...' : 'Створити'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
