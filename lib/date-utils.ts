/**
 * Calculate age from birthday date
 * @param birthday - Date string in YYYY-MM-DD format
 * @returns Age in years
 */
export function calculateAge(birthday: string): number {
    if (!birthday) return 0;
    
    const today = new Date();
    const birthDate = new Date(birthday);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Format date to Ukrainian format (e.g., "15 березня")
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDateUA(dateStr: string): string {
    if (!dateStr) return "";
    
    const date = new Date(dateStr);
    const day = date.getDate();
    
    const monthNames = [
        'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
        'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
    ];
    
    const month = monthNames[date.getMonth()];
    
    return `${day} ${month}`;
}

/**
 * Check if two dates are on the same day (month and day only)
 * @param date1 - First date string in YYYY-MM-DD format
 * @param date2 - Second date string in YYYY-MM-DD format
 * @returns True if dates match (ignoring year)
 */
export function isSameDay(date1: string, date2: string): boolean {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
}

/**
 * Check if a date is in a specific month (by month index 0-11)
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param month - Month index (0-11)
 * @returns True if date is in the specified month
 */
export function isMonth(dateStr: string, month: number): boolean {
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return date.getMonth() === month;
}
