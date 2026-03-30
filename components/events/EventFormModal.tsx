"use client";

import { useState, useEffect } from 'react';
import { EventFormModalProps } from './EventFormModal.types';
import { useEventForm } from './useEventForm';
import { useEventProducts } from './useEventProducts';
import { useDepartmentsAndTables } from './useDepartmentsAndTables';
import { useCheckSync } from './useCheckSync';
import { useEventShortage } from './useEventShortage';
import { Modal } from '../ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { EventBasicInfo } from './sections/EventBasicInfo';
import { EventProducts } from './sections/EventProducts';
import { EventPayment } from './sections/EventPayment';
import styles from './EventFormModal.module.css';

export function EventFormModal({ event, onClose, onSubmit }: EventFormModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'main' | 'products' | 'payment'>('main');
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Initialize department and table from event when editing
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    if (event?.assignedRooms && event.assignedRooms.length > 0) {
      return event.assignedRooms[0].resourceId || '';
    }
    return '';
  });

  const [selectedTable, setSelectedTable] = useState(() => {
    if (event?.assignedRooms && event.assignedRooms.length > 0) {
      return event.assignedRooms[0].resourceName || '';
    }
    return '';
  });

  // Form hook
  const {
    formData,
    loading,
    errors,
    updateField,
    handleSubmit,
    durationDisplay,
    checkSync: formCheckSync,
  } = useEventForm({
    event,
    selectedDepartment,
    selectedTable,
    getSelectedProducts: () => selectedProducts,
    onSubmitSuccess: onSubmit,
    onClose,
    toast,
    createdBy: selectedStaffId,
    createdByName: activeStaff.find(s => s.id === selectedStaffId)?.name || 'Giraffe',
  });

  // Use checkSync from form
  const checkSync = formCheckSync;

  // Fetch check when table changes OR when component mounts with existing check
  useEffect(() => {
    if (selectedTable) {
      // Always fetch check when table is selected
      checkSync.fetchCheck(selectedTable);
    }
  }, [selectedTable]);

  // Fetch active staff on mount
  useEffect(() => {
    const fetchActiveStaff = async () => {
      try {
        const res = await fetch('/api/cash-register/shifts?activeStaff=true');
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          setActiveStaff(data.data);

          // If only one staff member, auto-select
          if (data.data.length === 1) {
            setSelectedStaffId(data.data[0].id);
          } else if (data.data.length === 0) {
            // No staff - will use "Giraffe" as default
            setSelectedStaffId('');
          } else {
            // Multiple staff - show modal to select
            setShowStaffModal(true);
          }
        }
      } catch (error) {
        console.error('Error fetching active staff:', error);
      }
    };

    fetchActiveStaff();
  }, []);

  // Fetch packages
  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        const res = await fetch('/api/events/packages?status=active');
        const data = await res.json();
        if (data.success) {
          setPackages(data.data);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  // Force sync when switching to products tab
  useEffect(() => {
    if (activeTab === 'products' && checkSync.existingCheck) {
      // Re-fetch check to ensure latest data
      checkSync.fetchCheck(checkSync.existingCheck.tableId);
    }
  }, [activeTab]);

  // Products hook
  const {
    products,
    recipes,
    selectedProducts,
    searchQuery,
    filter,
    filteredProducts,
    toggleProduct,
    updateQuantity,
    removeProduct,
    setSearchQuery,
    setFilter,
    total: productsTotal,
  } = useEventProducts(event);

  // Update additionalServicesTotal when products change
  useEffect(() => {
    updateField('additionalServicesTotal', productsTotal);
  }, [productsTotal, updateField]);

  const {
    departments,
    tables,
    loadingDepartments,
    loadingTables,
    fetchTables,
    createTable,
  } = useDepartmentsAndTables();

  // Handle table creation
  const handleCreateTable = async (tableName: string) => {
    if (selectedDepartment) {
      const newTable = await createTable(tableName, selectedDepartment);
      if (newTable) {
        setSelectedTable(newTable.id);
      }
    }
  };

  // Shortage check integration
  const { shortages, loading: shortageLoading } = useEventShortage(selectedProducts, formData.packageId || null);

  useEffect(() => {
    if (shortages.length > 0) {
      console.log('🚩 [EventFormModal] SHORTAGES DETECTED:', shortages);
    }
  }, [shortages]);

  // Manual sync button handler
  const handleSyncFromCheck = async () => {
    if (checkSync.existingCheck) {
      await checkSync.fetchCheck(checkSync.existingCheck.tableId);
      alert('Дані синхронізовано з чеком!');
    }
  };

  return (
    <Modal
      title={event ? 'Редагувати подію' : 'Нова подія'}
      isOpen={true}
      onClose={onClose}
      size="xl"
    >
      {/* Header with sync button */}
      <div className={styles.syncHeader}>
        <div>
          <h2 className={styles.syncTitle}>
            {event ? 'Редагувати подію' : 'Нова подія'}
          </h2>
          {checkSync.existingCheck && (
            <p className={styles.syncHint}>
              🔔 Чек прив'язано до столу
            </p>
          )}
        </div>
        {checkSync.existingCheck && (
          <button
            type="button"
            onClick={handleSyncFromCheck}
            className={styles.syncBtn}
          >
            🔄 Оновити з чеку
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {shortages.length > 0 && (
          <div className={styles.shortageWarning}>
            <div className={styles.shortageHeader}>
              <span>⚠️ Увага: Дефіцит інгредієнтів!</span>
              {shortageLoading && <span style={{ fontSize: '10px', fontWeight: 500, opacity: 0.6 }}>(оновлення...)</span>}
            </div>
            <div className={styles.shortageList}>
              {shortages.map((s, i) => (
                <div key={i} className={styles.shortageItem}>
                  {s.name || 'Невідомий інгредієнт'}
                  <span className={styles.shortageDeficit}>-{s.deficit.toFixed(1)} {s.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'main' ? styles.active : ''}`}
            onClick={() => setActiveTab('main')}
          >
            Основне
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'products' ? styles.active : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Товари/Послуги
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'payment' ? styles.active : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            Оплата
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === 'main' && (
            <EventBasicInfo
              formData={formData}
              errors={errors}
              durationDisplay={durationDisplay}
              departments={departments}
              tables={tables}
              loadingDepartments={loadingDepartments}
              loadingTables={loadingTables}
              selectedDepartment={selectedDepartment}
              selectedTable={selectedTable}
              onUpdateField={updateField}
              onDepartmentChange={(deptId: string) => {
                setSelectedDepartment(deptId);
                setSelectedTable('');
                fetchTables(deptId);
              }}
              onTableChange={setSelectedTable}
              onTableCreate={handleCreateTable}
              packages={packages}
              loadingPackages={loadingPackages}
            />
          )}

          {activeTab === 'products' && (
            <EventProducts
              products={products}
              recipes={recipes}
              selectedProducts={selectedProducts}
              searchQuery={searchQuery}
              filter={filter}
              filteredProducts={filteredProducts}
              productsTotal={productsTotal}
              onToggleProduct={toggleProduct}
              onUpdateQuantity={updateQuantity}
              onRemoveProduct={removeProduct}
              onSearchChange={setSearchQuery}
              onFilterChange={setFilter}
            />
          )}

          {activeTab === 'payment' && (
            <EventPayment
              formData={formData}
              onUpdateField={updateField}
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnCancel}>
            Скасувати
          </button>
          <button type="submit" disabled={loading} className={styles.btnSubmit}>
            {loading ? 'Збереження...' : (event ? 'Оновити' : 'Створити')}
          </button>
        </div>
      </form>

      {/* Staff Selection Modal */}
      {showStaffModal && (
        <Modal
          title="👤 Хто створює подію?"
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          size="md"
        >
          <div className={styles.staffModalContent}>
            <p className={styles.staffModalText}>
              На зміні працює кілька співробітників. Оберіть хто створює подію:
            </p>
            <div className={styles.staffList}>
              {activeStaff.map(staff => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(staff.id);
                    setShowStaffModal(false);
                  }}
                  className={styles.staffBtn}
                >
                  <div className={styles.staffName}>{staff.name}</div>
                  <div className={styles.staffPosition}>{staff.position}</div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
