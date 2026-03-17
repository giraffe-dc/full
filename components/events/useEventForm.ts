// Hook для управління формою події

import { useState, useEffect, useCallback } from 'react';
import { EventFormData, UseEventFormReturn, CheckData, SelectedProduct } from './EventFormModal.types';
import { calculateDuration, formatDuration, calculateTotals, mapProductsToCheckItems } from './EventFormModal.utils';
import { validateEventForm } from './EventFormModal.validators';
import { useCheckSync } from './useCheckSync';
import { normalizePhone } from '@/lib/utils';

interface UseEventFormProps {
  event?: any | null;
  selectedDepartment: string;
  selectedTable: string;
  getSelectedProducts: () => SelectedProduct[];
  onSubmitSuccess: () => void;
  onClose: () => void;
  toast?: any;
  createdBy?: string;
  createdByName?: string;
}

export function useEventForm({
  event,
  selectedDepartment,
  selectedTable,
  getSelectedProducts,
  onSubmitSuccess,
  onClose,
  toast,
  createdBy,
  createdByName,
}: UseEventFormProps): UseEventFormReturn {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    eventType: 'birthday',
    status: 'draft',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    childGuests: 0,
    adultGuests: 0,
    packageId: '',
    packageName: '',
    basePrice: 0,
    additionalServicesTotal: 0,
    extraGuestsTotal: 0,
    subtotal: 0,
    discount: 0,
    discountReason: '',
    total: 0,
    paidAmount: 0,
    paymentStatus: 'unpaid',
    internalNotes: '',
    clientNotes: '',
    childBirthday: '',
  });

  // Check sync hook
  const checkSync = useCheckSync(setFormData, () => {});

  // Auto-calculate duration
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const duration = calculateDuration(formData.startTime, formData.endTime);
      if (duration !== formData.duration) {
        setFormData(prev => ({ ...prev, duration }));
      }
    }
  }, [formData.startTime, formData.endTime]);

  // Auto-calculate totals
  useEffect(() => {
    const { subtotal, total } = calculateTotals(
      formData.basePrice,
      formData.additionalServicesTotal,
      formData.extraGuestsTotal,
      formData.discount
    );

    if (subtotal !== formData.subtotal || total !== formData.total) {
      setFormData(prev => ({ ...prev, subtotal, total }));
    }
  }, [formData.basePrice, formData.additionalServicesTotal, formData.extraGuestsTotal, formData.discount, formData.subtotal, formData.total]);

  // Load event data for editing
  useEffect(() => {
    if (event) {
      setFormData(prev => ({
        ...prev,
        title: event.title,
        eventType: event.eventType,
        status: event.status,
        clientName: event.clientName,
        clientPhone: event.clientPhone,
        clientEmail: event.clientEmail || '',
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        childGuests: event.childGuests,
        adultGuests: event.adultGuests,
        packageId: event.packageId || '',
        packageName: event.packageName,
        basePrice: event.basePrice,
        additionalServicesTotal: event.additionalServicesTotal,
        extraGuestsTotal: event.extraGuestsTotal,
        subtotal: event.subtotal,
        discount: event.discount,
        discountReason: event.discountReason || '',
        total: event.total,
        paidAmount: event.paidAmount,
        paymentStatus: event.paymentStatus,
        internalNotes: event.internalNotes || '',
        clientNotes: event.clientNotes || '',
        childBirthday: event.childBirthday || '',
      }));
      // Note: Check fetching is now handled in EventFormModal when selectedTable is set
    }
  }, [event]);

  // Update field
  const updateField = useCallback((field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get selected products from parent
    const selectedProducts = getSelectedProducts();

    // Validate
    const normalizedPhone = normalizePhone(formData.clientPhone);
    const validationErrors = validateEventForm({ ...formData, clientPhone: normalizedPhone }, selectedDepartment, selectedTable);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      // Prepare event data (single payload)
      const eventData = {
        ...formData,
        clientPhone: normalizedPhone,
        totalGuests: formData.childGuests + formData.adultGuests,
        customServices: selectedProducts.map(item => ({
          id: item.productId,
          name: item.name,
          category: item.categoryId || 'events',
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        })),
        assignedRooms: selectedTable && selectedDepartment ? [{
          resourceId: selectedDepartment,
          resourceName: selectedTable,
          startTime: formData.startTime,
          endTime: formData.endTime,
        }] : [],
        assignedAnimators: [],
        assignedEquipment: [],
        // Keep existing checkId when editing
        checkId: event?.checkId || undefined,
        // Creator info
        createdBy: createdBy || undefined,
        createdByName: createdByName || 'Giraffe',
      };

      const url = event ? `/api/events/${event.id}` : '/api/events';
      const method = event ? 'PUT' : 'POST';

      // Single API call - backend handles both event and check
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await res.json();

      if (data.success) {
        console.log('✅ Event saved (check handled by backend):', data.checkId || event?.checkId);
        toast.success(event ? 'Подію оновлено' : 'Подію створено');
        onSubmitSuccess();
      } else {
        toast.error(data.error || 'Помилка збереження');
        setErrors({ submit: data.error || 'Помилка збереження' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Помилка збереження події');
      setErrors({ submit: 'Помилка збереження' });
    } finally {
      setLoading(false);
    }
  }, [formData, selectedDepartment, selectedTable, getSelectedProducts, event, onSubmitSuccess, toast]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      eventType: 'birthday',
      status: 'draft',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '16:00',
      duration: 120,
      childGuests: 0,
      adultGuests: 0,
      packageId: '',
      packageName: '',
      basePrice: 0,
      additionalServicesTotal: 0,
      extraGuestsTotal: 0,
      subtotal: 0,
      discount: 0,
      discountReason: '',
      total: 0,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      internalNotes: '',
      clientNotes: '',
      childBirthday: '',
    });
    setErrors({});
  }, []);

  // Format duration
  const durationDisplay = formatDuration(formData.duration);

  return {
    formData,
    loading,
    errors,
    updateField,
    handleSubmit,
    resetForm,
    durationDisplay,
    checkSync: {
      existingCheck: checkSync.existingCheck,
      fetchCheck: checkSync.fetchCheck,
    },
  };
}
