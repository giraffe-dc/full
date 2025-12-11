import React, { useState } from 'react';
import { Customer } from '../../types/cash-register';
import styles from './CustomerSelector.module.css';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onAddCustomer: (customer: Customer) => void;
}

export function CustomerSelector({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onAddCustomer,
}: CustomerSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const handleAddCustomer = () => {
    if (!formData.name.trim()) {
      alert('Введіть ім\'я клієнта');
      return;
    }

    const newCustomer: Customer = {
      id: `customer-${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      createdAt: new Date().toISOString(),
      visits: 0,
      totalSpent: 0,
    };

    onAddCustomer(newCustomer);
    setFormData({ name: '', phone: '', email: '' });
    setShowAddForm(false);
    onSelectCustomer(newCustomer);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Клієнт</h3>

      {selectedCustomer ? (
        <div className={styles.selectedCustomer}>
          <div className={styles.customerInfo}>
            <div className={styles.customerName}>{selectedCustomer.name}</div>
            {selectedCustomer.phone && (
              <div className={styles.customerPhone}>{selectedCustomer.phone}</div>
            )}
            <div className={styles.customerStats}>
              <span>Відвідувань: {selectedCustomer.visits}</span>
              <span>Витрачено: {selectedCustomer.totalSpent.toFixed(2)} ₴</span>
            </div>
          </div>
          <button
            className={styles.clearButton}
            onClick={() => onSelectCustomer(null)}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className={styles.noCustomer}>
          <p>Клієнт не вибраний</p>
        </div>
      )}

      <div className={styles.customersList}>
        {customers.length > 0 && (
          <>
            <div className={styles.listLabel}>Останні клієнти:</div>
            {customers.slice(-5).reverse().map((customer) => (
              <button
                key={customer.id}
                className={`${styles.customerButton} ${
                  selectedCustomer?.id === customer.id ? styles.customerButtonActive : ''
                }`}
                onClick={() => onSelectCustomer(customer)}
              >
                <div className={styles.customerButtonName}>{customer.name}</div>
                <div className={styles.customerButtonPhone}>{customer.phone || 'Без телефону'}</div>
              </button>
            ))}
          </>
        )}
      </div>

      <button
        className={styles.addButton}
        onClick={() => setShowAddForm(!showAddForm)}
      >
        + Додати клієнта
      </button>

      {showAddForm && (
        <div className={styles.form}>
          <input
            type="text"
            placeholder="Ім'я клієнта"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
          />
          <input
            type="tel"
            placeholder="Телефон"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={styles.input}
          />
          <div className={styles.formButtons}>
            <button
              className={styles.buttonSave}
              onClick={handleAddCustomer}
            >
              Зберегти
            </button>
            <button
              className={styles.buttonCancel}
              onClick={() => setShowAddForm(false)}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
