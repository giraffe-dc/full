"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EventPackage } from '@/types/events';
import styles from './page.module.css';
import { useToast } from '@/components/ui/ToastContext';
import { Preloader } from '@/components/ui/Preloader';
import { Modal } from '@/components/ui/Modal';

export default function EventPackagesPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<EventPackage | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events/packages');
      const data = await res.json();
      if (data.success) {
        setPackages(data.data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Помилка завантаження пакетів');
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
      fetchPackages();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей пакет?')) return;
    
    try {
      const res = await fetch(`/api/events/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Пакет видалено');
        fetchPackages();
      } else {
        toast.error('Помилка видалення');
      }
    } catch (error) {
      toast.error('Помилка видалення');
    }
  };

  const handleBack = () => {
    router.push('/events');
  };

  if (!user) return <Preloader message="Перевірка авторизації..." />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <button onClick={handleBack} className={styles.btnBack}>← Назад</button>
          <h1 className={styles.title}>📦 Пакети послуг</h1>
          <p className={styles.lead}>Управління пакетами для подій</p>
        </div>
        <button onClick={() => setShowFormModal(true)} className={styles.btnAdd}>
          + Додати пакет
        </button>
      </div>

      {loading ? (
        <Preloader message="Завантаження пакетів..." />
      ) : (
        <div className={styles.grid}>
          {packages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Пакетів ще немає</p>
              <button onClick={() => setShowFormModal(true)} className={styles.btnCreate}>
                Створити перший пакет
              </button>
            </div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{pkg.name}</h3>
                  <span className={`${styles.statusBadge} ${pkg.status === 'active' ? styles.active : styles.inactive}`}>
                    {pkg.status === 'active' ? 'Активний' : 'Неактивний'}
                  </span>
                </div>
                <p className={styles.description}>{pkg.description}</p>
                <div className={styles.cardMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Ціна</span>
                    <span className={styles.metaValue}>{pkg.basePrice} ₴</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Гостей</span>
                    <span className={styles.metaValue}>до {pkg.maxGuests}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Тривалість</span>
                    <span className={styles.metaValue}>{Math.floor(pkg.duration / 60)}г {pkg.duration % 60}хв</span>
                  </div>
                </div>
                {pkg.includedServices && pkg.includedServices.length > 0 && (
                  <div className={styles.servicesList}>
                    <h4>Включено:</h4>
                    <ul>
                      {pkg.includedServices.map((service, idx) => (
                        <li key={idx}>{service.name} ({service.quantity} {service.unitPrice > 0 ? `× ${service.unitPrice} ₴` : ''})</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className={styles.cardActions}>
                  <button
                    onClick={() => {
                      setEditingPackage(pkg);
                      setShowFormModal(true);
                    }}
                    className={styles.btnEdit}
                  >
                    ✏️ Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className={styles.btnDelete}
                  >
                    🗑️ Видалити
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showFormModal && (
        <PackageFormModal
          pkg={editingPackage}
          onClose={() => {
            setShowFormModal(false);
            setEditingPackage(null);
          }}
          onSubmit={() => {
            fetchPackages();
            setShowFormModal(false);
            setEditingPackage(null);
          }}
        />
      )}
    </div>
  );
}

// Package Form Modal Component
function PackageFormModal({ pkg, onClose, onSubmit }: { pkg: EventPackage | null; onClose: () => void; onSubmit: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    maxGuests: 10,
    duration: 120,
    status: 'active' as 'active' | 'inactive',
    includedServices: [] as any[],
  });

  useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        basePrice: pkg.basePrice,
        maxGuests: pkg.maxGuests,
        duration: pkg.duration,
        status: pkg.status,
        includedServices: pkg.includedServices || [],
      });
    }
  }, [pkg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = pkg ? `/api/events/packages/${pkg.id}` : '/api/events/packages';
      const method = pkg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(pkg ? 'Пакет оновлено' : 'Пакет створено');
        onSubmit();
      } else {
        toast.error(data.error || 'Помилка збереження');
      }
    } catch (error) {
      toast.error('Помилка збереження');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setFormData(prev => ({
      ...prev,
      includedServices: [
        ...prev.includedServices,
        { id: `svc_${Date.now()}`, name: '', category: 'other', quantity: 1, unitPrice: 0, total: 0 },
      ],
    }));
  };

  const updateService = (index: number, field: string, value: any) => {
    const updated = [...formData.includedServices];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setFormData(prev => ({ ...prev, includedServices: updated }));
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includedServices: prev.includedServices.filter((_, i) => i !== index),
    }));
  };

  return (
    <Modal title={pkg ? 'Редагувати пакет' : 'Новий пакет'} isOpen={true} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Назва пакету *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>Опис</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Базова ціна (₴) *</label>
            <input
              type="number"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
              className={styles.input}
              required
              min="0"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Макс. гостей *</label>
            <input
              type="number"
              value={formData.maxGuests}
              onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) || 0 })}
              className={styles.input}
              required
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Тривалість (хв) *</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
              className={styles.input}
              required
              min="30"
              step="30"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Статус</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className={styles.select}
          >
            <option value="active">Активний</option>
            <option value="inactive">Неактивний</option>
          </select>
        </div>

        <div className={styles.servicesSection}>
          <h4>Включені послуги</h4>
          {formData.includedServices.map((service, index) => (
            <div key={service.id} className={styles.serviceRow}>
              <input
                type="text"
                placeholder="Назва послуги"
                value={service.name}
                onChange={(e) => updateService(index, 'name', e.target.value)}
                className={styles.serviceInput}
              />
              <input
                type="number"
                placeholder="К-сть"
                value={service.quantity}
                onChange={(e) => updateService(index, 'quantity', parseInt(e.target.value) || 0)}
                className={styles.serviceInputSmall}
                min="1"
              />
              <input
                type="number"
                placeholder="Ціна"
                value={service.unitPrice}
                onChange={(e) => updateService(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                className={styles.serviceInputSmall}
                min="0"
                step="0.01"
              />
              <span className={styles.serviceTotal}>{service.total} ₴</span>
              <button type="button" onClick={() => removeService(index)} className={styles.removeServiceBtn}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addService} className={styles.addServiceBtn}>+ Додати послугу</button>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnCancel}>Скасувати</button>
          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? 'Збереження...' : (pkg ? 'Оновити' : 'Створити')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
