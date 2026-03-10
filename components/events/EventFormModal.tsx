"use client";

import { useState, useEffect } from 'react';
import { EventFormModalProps } from './EventFormModal.types';
import { useEventForm } from './useEventForm';
import { useEventProducts } from './useEventProducts';
import { useDepartmentsAndTables } from './useDepartmentsAndTables';
import { useCheckSync } from './useCheckSync';
import { Modal } from '../ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { EventBasicInfo } from './sections/EventBasicInfo';
import { EventProducts } from './sections/EventProducts';
import { EventPayment } from './sections/EventPayment';
import styles from './EventFormModal.module.css';

export function EventFormModal({ event, onClose, onSubmit }: EventFormModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'main' | 'products' | 'payment'>('main');
  
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
            {event ? 'Редагувати подію' : 'Нова подія'}
          </h2>
          {checkSync.existingCheck && (
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              🔔 Чек прив'язано до столу
            </p>
          )}
        </div>
        {checkSync.existingCheck && (
          <button
            type="button"
            onClick={handleSyncFromCheck}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            🔄 Оновити з чеку
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
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
              onDepartmentChange={(deptId) => {
                setSelectedDepartment(deptId);
                setSelectedTable('');
                fetchTables(deptId);
              }}
              onTableChange={setSelectedTable}
              onTableCreate={handleCreateTable}
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
    </Modal>
  );
}
