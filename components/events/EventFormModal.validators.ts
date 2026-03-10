// Валідація форми

import { EventFormData, FormErrors } from './EventFormModal.types';

/**
 * Перевіряє валідність форми
 */
export function validateEventForm(
  data: EventFormData,
  selectedDepartment: string,
  selectedTable: string
): FormErrors {
  const errors: FormErrors = {};
  
  // Обов'язкові поля
  if (!data.title || data.title.trim().length === 0) {
    errors.title = "Назва обов'язкова";
  }
  
  if (!data.date) {
    errors.date = "Дата обов'язкова";
  }
  
  if (!data.startTime) {
    errors.startTime = "Час початку обов'язковий";
  }
  
  if (!data.endTime) {
    errors.endTime = "Час завершення обов'язковий";
  }
  
  if (!data.clientName || data.clientName.trim().length === 0) {
    errors.clientName = "Ім'я клієнта обов'язкове";
  }
  
  if (!data.clientPhone || data.clientPhone.trim().length === 0) {
    errors.clientPhone = "Телефон обов'язковий";
  }
  
  if (!selectedDepartment) {
    errors.department = "Зал обов'язковий";
  }
  
  if (!selectedTable) {
    errors.table = "Стіл обов'язковий";
  }
  
  // Валідація телефону (простий формат)
  if (data.clientPhone && !/^\+?[0-9]{10,15}$/.test(data.clientPhone.replace(/[-\s()]/g, ''))) {
    errors.clientPhone = "Невірний формат телефону";
  }
  
  // Валідація email (якщо вказано)
  if (data.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clientEmail)) {
    errors.clientEmail = "Невірний формат email";
  }
  
  // Валідація знижки
  if (data.discount < 0) {
    errors.discount = "Знижка не може бути від'ємною";
  }
  
  if (data.discount > data.subtotal) {
    errors.discount = "Знижка не може перевищувати суму";
  }
  
  return errors;
}

/**
 * Перевіряє чи є форма валідною
 */
export function isFormValid(
  data: EventFormData,
  selectedDepartment: string,
  selectedTable: string
): boolean {
  const errors = validateEventForm(data, selectedDepartment, selectedTable);
  return Object.keys(errors).length === 0;
}
