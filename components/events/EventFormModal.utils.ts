// Мапінг даних для чеків

import { SelectedProduct, CheckItem, EventFormData } from './EventFormModal.types';

/**
 * Конвертує обрані продукти в items для чеку
 */
export function mapProductsToCheckItems(selectedProducts: SelectedProduct[]): CheckItem[] {
  return selectedProducts.map(item => ({
    serviceId: `evt_${item.productId}`,
    productId: item.productId,
    serviceName: item.name,
    category: 'events',
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));
}

/**
 * Конвертує чек в дані форми
 */
export function mapCheckToFormData(check: any): Partial<EventFormData> {
  const result: Partial<EventFormData> = {};
  
  if (check.total !== undefined) {
    result.total = check.total;
  }
  
  if (check.paidAmount !== undefined) {
    result.paidAmount = check.paidAmount;
  }
  
  if (check.paymentStatus) {
    result.paymentStatus = check.paymentStatus;
  } else if (check.paymentMethod) {
    result.paymentStatus = 'paid';
  } else if (check.paidAmount >= check.total) {
    result.paymentStatus = 'paid';
  } else if (check.paidAmount > 0) {
    result.paymentStatus = 'deposit';
  } else {
    result.paymentStatus = 'unpaid';
  }
  
  if (check.comment) {
    result.clientNotes = check.comment;
  }
  
  if (check.notes) {
    result.internalNotes = check.notes;
  }
  
  if (check.guestsCount) {
    result.childGuests = check.guestsCount;
  }
  
  if (check.waiterName) {
    result.clientName = check.waiterName;
  }
  
  return result;
}

/**
 * Конвертує чек в обрані продукти
 */
export function mapCheckItemsToProducts(checkItems: any[]): SelectedProduct[] {
  return checkItems.map(item => ({
    productId: item.productId || item.serviceId,
    name: item.serviceName,
    quantity: item.quantity,
    price: item.price,
  }));
}

/**
 * Розраховує підсумки
 */
export function calculateTotals(
  basePrice: number,
  additionalServicesTotal: number,
  extraGuestsTotal: number,
  discount: number
) {
  const subtotal = basePrice + additionalServicesTotal + extraGuestsTotal;
  const total = subtotal - discount;
  
  return { subtotal, total };
}

/**
 * Форматує тривалість у зручний вигляд
 */
export function formatDuration(minutes: number): {
  hours: number;
  minutes: number;
  formatted: string;
} {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return {
    hours,
    minutes: mins,
    formatted: `${hours} год ${mins} хв`,
  };
}

/**
 * Розраховує тривалість між часом початку та завершення
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Handle overnight events
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  return durationMinutes;
}
