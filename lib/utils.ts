/**
 * Нормалізує номер телефону: якщо починається на 0, додає +38
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.trim();
  
  // Якщо починається на 0 і має 10 цифр (наприклад, 0971234567)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+38' + cleaned;
  }
  
  // Якщо починається на 0 і має 9 цифр (буває і таке, якщо випадково пропустили цифру, але краще додати +38)
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    return '+38' + cleaned;
  }

  return cleaned;
}
