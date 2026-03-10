import { DenominationCounts } from '../types/cash-register';

export const BANKNOTES = [1000, 500, 200, 100, 50, 20, 10];
export const COINS = [10, 5, 2, 1, 0.5];

/**
 * Returns a standardized key for a denomination
 */
export function getDenomKey(type: 'banknote' | 'coin', denom: number): string {
    return `${type}_${denom}`;
}

/**
 * Calculates the total sum for denomination counts.
 * Handles both new string keys ("banknote_100") and legacy numeric keys ("100").
 */
export function calculateDenominationTotal(counts: DenominationCounts | undefined | null): number {
    if (!counts || Object.keys(counts).length === 0) return 0;

    let sum = 0;

    // We iterate over all keys in the counts object to ensure we capture
    // both legacy numeric keys and new formatted keys.
    for (const [key, value] of Object.entries(counts)) {
        const count = Number(value) || 0;
        if (count === 0) continue;

        // 1. Check if it's a new formatted key (e.g., "banknote_500" or "coin_10")
        if (key.includes('_')) {
            const parts = key.split('_');
            const denomValue = parseFloat(parts[1]);
            if (!isNaN(denomValue)) {
                sum += count * denomValue;
            }
        }
        // 2. Check if it's a legacy numeric key (e.g., "500")
        else if (!isNaN(Number(key))) {
            const denomValue = parseFloat(key);
            sum += count * denomValue;
        }
    }

    return sum;
}
