/**
 * Спільні утиліти для розрахунку передплат (депозитів).
 * Використовуються в shifts, close-preview, pnl, accounts тощо.
 */

interface ReceiptLike {
    paymentMethod: string;
    total: number;
    paymentDetails?: { cash?: number; card?: number };
    depositAmount?: number;
    depositMethod?: string | null;
    depositInfo?: { method?: string; createdAt?: string };
}

interface CheckLike {
    total: number;
    paidAmount?: number;
    deposit?: any;
}

/**
 * Розраховує суму продажів готівкою з урахуванням депозиту.
 * Для готівкових чеків: total - depositAmount
 * Для змішаних: paymentDetails.cash - (якщо deposit був готівкою)
 * Для карткових чеків: 0
 */
export function calculateSalesCash(receipt: ReceiptLike): number {
    const depAmt = Number(receipt.depositAmount) || 0;

    if (receipt.paymentMethod === 'mixed') {
        return Math.max(0, receipt.paymentDetails?.cash || 0);
    }
    if (receipt.paymentMethod === 'card') return 0;
    return Math.max(0, (receipt.total || 0) - depAmt);
}

/**
 * Розраховує суму продажів карткою з урахуванням депозиту.
 * Для карткових чеків: total - depositAmount
 * Для змішаних: paymentDetails.card - (якщо deposit був карткою)
 * Для готівкових чеків: 0
 */
export function calculateSalesCard(receipt: ReceiptLike): number {
    const depAmt = Number(receipt.depositAmount) || 0;

    if (receipt.paymentMethod === 'mixed') {
        return Math.max(0, receipt.paymentDetails?.card || 0);
    }
    if (receipt.paymentMethod === 'cash') return 0;
    return Math.max(0, (receipt.total || 0) - depAmt);
}

/**
 * Отримати залишок до сплати по чеку.
 */
export function getRemainingAmount(check: CheckLike): number {
    return Math.max(0, check.total - (check.paidAmount || 0));
}

/**
 * Визначити чи є активна передплата на чеку.
 */
export function hasDeposit(check: CheckLike): boolean {
    return !!(check.paidAmount && check.paidAmount > 0 && check.deposit);
}

/**
 * Перевірити чи чек повністю оплачений через передплату.
 */
export function isFullyCoveredByDeposit(check: CheckLike): boolean {
    return (check.paidAmount || 0) >= check.total - 0.01;
}
