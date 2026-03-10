"use client";

import { useState, useEffect } from 'react';
import { Event, EventType, PaymentStatus } from '@/types/events';
import styles from './EventDetailsModal.module.css';
import { Modal } from '../ui/Modal';

interface EventDetailsModalProps {
  event: Event;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface CheckData {
  id: string;
  tableId: string;
  items: any[];
  total: number;
  paidAmount?: number;
  paymentStatus?: string;
  comment?: string;
  notes?: string;
  guestsCount?: number;
  updatedAt?: string;
  source?: 'checks' | 'receipts';
}

const EVENT_TYPE_ICONS: Record<EventType, string> = {
  birthday: '🎂',
  corporate: '🎉',
  graduation: '🎓',
  holiday: '🎊',
  other: '📅',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: 'День народження',
  corporate: 'Корпоратив',
  graduation: 'Випускний',
  holiday: 'Виїздні',
  other: 'Інше',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  confirmed: { bg: '#dbeafe', text: '#1d4ed8' },
  in_progress: { bg: '#fef3c7', text: '#d97706' },
  completed: { bg: '#d1fae5', text: '#059669' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Не оплачено',
  deposit: 'Депозит',
  paid: 'Оплачено',
  refunded: 'Повернено',
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  unpaid: { bg: '#fee2e2', text: '#dc2626' },
  deposit: { bg: '#fef3c7', text: '#d97706' },
  paid: { bg: '#d1fae5', text: '#059669' },
  refunded: { bg: '#f3f4f6', text: '#6b7280' },
};

export function EventDetailsModal({ event, onClose, onEdit, onDelete }: EventDetailsModalProps) {
  const statusColors = STATUS_COLORS[event.status];
  const paymentStatusColors = PAYMENT_STATUS_COLORS[event.paymentStatus];
  const icon = EVENT_TYPE_ICONS[event.eventType];

  // Check sync state
  const [checkData, setCheckData] = useState<CheckData | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);

  // Fetch check data
  const fetchCheck = async () => {
    if (!event.checkId) {
      console.log('🔍 No checkId found, skipping check fetch');
      return;
    }

    setLoadingCheck(true);
    try {
      // Fetch check by ID (backend searches in checks first, then receipts)
      console.log('🔍 Fetching check by checkId:', event.checkId);
      const res = await fetch(`/api/cash-register/checks/${event.checkId}?_t=${Date.now()}`);
      const data = await res.json();

      if (data.success && data.data) {
        const check = data.data;
        const source = data.source || 'checks';
        
        console.log(`✅ Found check in ${source}:`, {
          id: check.id,
          status: check.status,
          paymentStatus: check.paymentStatus,
          total: check.total,
          paidAmount: check.paidAmount,
          items: check.items?.length || 0
        });

        setCheckData({
          id: check._id || check.id,
          tableId: check.tableId,
          items: check.items || [],
          total: check.total,
          paidAmount: source === 'receipts' ? check.total : (check.paidAmount || check.total),
          paymentStatus: source === 'receipts' ? 'paid' : (check.paymentStatus || check.status),
          comment: check.comment,
          notes: check.notes,
          guestsCount: check.guestsCount,
          updatedAt: check.updatedAt || check.createdAt,
          source: source  // Source marker
        });
      } else {
        console.log('⚠️ Check not found by checkId:', event.checkId);
      }
    } catch (error) {
      console.error('❌ Error fetching check:', error);
    } finally {
      setLoadingCheck(false);
    }
  };

  // Fetch check on mount
  useEffect(() => {
    fetchCheck();
  }, [event.id]);

  // Polling for check changes (every 10 seconds)
  useEffect(() => {
    if (!checkData) return;
    
    const pollCheck = async () => {
      try {
        // Add timestamp to prevent caching
        const res = await fetch(`/api/cash-register/checks/${checkData.id}?_t=${Date.now()}`);
        if (!res.ok) return;
        
        const text = await res.text();
        if (!text) return;
        
        const data = JSON.parse(text);
        if (data.success && data.data) {
          const updatedCheck = data.data;
          
          // Check if items changed
          const currentItemsHash = JSON.stringify(updatedCheck.items || []);
          const prevItemsHash = JSON.stringify(checkData?.items || []);
          
          if (currentItemsHash !== prevItemsHash) {
            console.log('🔄 Check updated, syncing...');
            setCheckData(prev => prev ? {
              ...prev,
              items: updatedCheck.items || [],
              total: updatedCheck.total,
              paidAmount: updatedCheck.paidAmount,
              paymentStatus: updatedCheck.paymentStatus || updatedCheck.status,
              comment: updatedCheck.comment,
              notes: updatedCheck.notes,
              guestsCount: updatedCheck.guestsCount,
              updatedAt: updatedCheck.updatedAt,
            } : null);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error polling check:', error);
        }
      }
    };
    
    const intervalId = setInterval(pollCheck, 10 * 1000);
    return () => clearInterval(intervalId);
  }, [checkData?.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const remaining = event.total - event.paidAmount;

  return (
    <Modal
      title={`${icon} ${event.title}`}
      isOpen={true}
      onClose={onClose}
      size="xl"
    >
      <div className={styles.header}>
        <div className={styles.statuses}>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
          >
            {event.status === 'draft' ? 'Чернетка' :
              event.status === 'confirmed' ? 'Підтверджено' :
                event.status === 'in_progress' ? 'В процесі' :
                  event.status === 'completed' ? 'Завершено' : 'Скасовано'}
          </span>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: paymentStatusColors.bg, color: paymentStatusColors.text }}
          >
            {PAYMENT_STATUS_LABELS[event.paymentStatus]}
          </span>
        </div>
        <div className={styles.actions}>
          {event.paymentStatus === 'paid' ? (
            <div style={{ 
              padding: '10px 18px', 
              background: '#f3f4f6', 
              color: '#6b7280',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔒 Заблоковано
            </div>
          ) : (
            <button onClick={onEdit} className={styles.btnEdit}>
              ✏️ Редагувати
            </button>
          )}
          <button onClick={onDelete} className={styles.btnDelete}>
            🗑️ Видалити
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Main Info */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📅 Дата та час</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Дата</span>
              <span className={styles.infoValue}>{formatDate(event.date)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Час</span>
              <span className={styles.infoValue}>{event.startTime} - {event.endTime}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Тривалість</span>
              <span className={styles.infoValue}>{Math.floor(event.duration / 60)}г {event.duration % 60}хв</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Тип події</span>
              <span className={styles.infoValue}>{EVENT_TYPE_LABELS[event.eventType]}</span>
            </div>
          </div>
        </section>

        {/* Client Info */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>👤 Клієнт</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ім'я</span>
              <span className={styles.infoValue}>{event.clientName}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Телефон</span>
              <span className={styles.infoValue}>
                <a href={`tel:${event.clientPhone}`}>{event.clientPhone}</a>
              </span>
            </div>
            {event.clientEmail && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>
                  <a href={`mailto:${event.clientEmail}`}>{event.clientEmail}</a>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Guests */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>👥 Гості</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Діти</span>
              <span className={styles.infoValue}>{event.childGuests}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Дорослі</span>
              <span className={styles.infoValue}>{event.adultGuests}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Всього</span>
              <span className={styles.infoValue}>{event.totalGuests} гостей</span>
            </div>
          </div>
        </section>

        {/* Package & Services */}
        {event.packageName && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>📦 Пакет послуг</h3>
            <div className={styles.packageInfo}>
              <span className={styles.packageName}>{event.packageName}</span>
              <span className={styles.packagePrice}>{event.basePrice} ₴</span>
            </div>
          </section>
        )}

        {/* Check Items (Real-time from cash register) */}
        {checkData && checkData.items && checkData.items.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              🛒 Товари з чеку
              {loadingCheck && <span className={styles.loadingIndicator}>🔄 Оновлення...</span>}
            </h3>
            <div className={styles.servicesList}>
              {checkData.items.map((item, index) => (
                <div key={index} className={styles.serviceItem}>
                  <span className={styles.serviceName}>{item.serviceName || item.name}</span>
                  <span className={styles.serviceQty}>{item.quantity} × {item.price} ₴</span>
                  <span className={styles.serviceTotal}>{item.subtotal || (item.quantity * item.price)} ₴</span>
                </div>
              ))}
            </div>
            {checkData.updatedAt && (
              <p className={styles.lastUpdate}>
                Оновлено: {new Date(checkData.updatedAt).toLocaleTimeString('uk-UA')}
              </p>
            )}
          </section>
        )}

        {/* Show event customServices if no check data */}
        {!checkData && event.customServices && event.customServices.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>➕ Додаткові послуги</h3>
            <div className={styles.servicesList}>
              {event.customServices.map(service => (
                <div key={service.id} className={styles.serviceItem}>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.serviceQty}>{service.quantity} × {service.unitPrice} ₴</span>
                  <span className={styles.serviceTotal}>{service.total} ₴</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            💰 Фінанси
            {checkData && <span className={styles.syncBadge}>✅ Синхронізовано з чеком</span>}
          </h3>
          <div className={styles.paymentSummary}>
            {/* <div className={styles.paymentRow}>
              <span>Базовий пакет:</span>
              <span>{event.basePrice.toFixed(2)} ₴</span>
            </div>
            {event.additionalServicesTotal > 0 && (
              <div className={styles.paymentRow}>
                <span>Додаткові послуги:</span>
                <span>{event.additionalServicesTotal.toFixed(2)} ₴</span>
              </div>
            )}
            {event.extraGuestsTotal > 0 && (
              <div className={styles.paymentRow}>
                <span>Додаткові гості:</span>
                <span>{event.extraGuestsTotal.toFixed(2)} ₴</span>
              </div>
            )}
            {event.discount > 0 && (
              <div className={`${styles.paymentRow} ${styles.discount}`}>
                <span>
                  Знижка
                  {event.discountReason && <span className={styles.discountReason}> ({event.discountReason})</span>}
                </span>
                <span>-{event.discount.toFixed(2)} ₴</span>
              </div>
            )} */}
            <div className={`${styles.paymentRow} ${styles.total}`}>
              <span>Всього:</span>
              <span>{checkData?.total ? checkData.total.toFixed(2) : event.total.toFixed(2)} ₴</span>
            </div>
            <div className={styles.paymentRow}>
              <span>Сплачено:</span>
              <span className={styles.paid}>
                {checkData?.paidAmount ? checkData.paidAmount.toFixed(2) : event.paidAmount.toFixed(2)} ₴
              </span>
            </div>
            <div className={`${styles.paymentRow} ${styles.remaining}`}>
              <span>До сплати:</span>
              <span>
                {(checkData?.total || event.total) - (checkData?.paidAmount || event.paidAmount) >= 0
                  ? ((checkData?.total || event.total) - (checkData?.paidAmount || event.paidAmount)).toFixed(2)
                  : remaining.toFixed(2)} ₴
              </span>
            </div>
            {checkData && checkData.paymentStatus && (
              <div className={`${styles.paymentRow} ${styles.statusRow}`}>
                <span>Статус оплати:</span>
                <span className={styles.paymentStatusBadge}>
                  {checkData.paymentStatus === 'paid' ? 'Оплачено' :
                    checkData.paymentStatus === 'deposit' ? 'Депозит' :
                      checkData.paymentStatus === 'refunded' ? 'Повернено' : 'Не оплачено'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {event.clientNotes && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>📝 Побажання клієнта</h3>
            <p className={styles.notes}>{event.clientNotes}</p>
          </section>
        )}

        {event.internalNotes && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>📋 Внутрішні нотатки</h3>
            <p className={styles.notes}>{event.internalNotes}</p>
          </section>
        )}
      </div>

      <div className={styles.footer}>
        <button onClick={onClose} className={styles.btnClose}>
          Закрити
        </button>
      </div>
    </Modal>
  );
}
