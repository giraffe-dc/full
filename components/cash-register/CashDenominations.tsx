"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DenominationCounts } from '../../types/cash-register';
import styles from './CashDenominations.module.css';

// ─── UAH Denominations ────────────────────────────────────────────────
const BANKNOTES = [1000, 500, 200, 100, 50, 20, 10];
const COINS = [10, 5, 2, 1, 0.5];

function getKey(type: 'banknote' | 'coin', denom: number): string {
    return `${type}_${denom}`;
}

function calcTotal(counts: DenominationCounts): number {
    let sum = 0;
    for (const d of BANKNOTES) {
        sum += (counts[getKey('banknote', d)] || 0) * d;
    }
    for (const d of COINS) {
        sum += (counts[getKey('coin', d)] || 0) * d;
    }
    return sum;
}

interface CashDenominationsProps {
    shiftId: string;
    expectedBalance: number;
    initialCounts?: DenominationCounts | null;
    readOnly?: boolean;
}

export function CashDenominations({ shiftId, expectedBalance, initialCounts, readOnly = false }: CashDenominationsProps) {
    const [open, setOpen] = useState(false);
    const [counts, setCounts] = useState<DenominationCounts>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Migrate old keys (e.g., "10") to new format ("banknote_10" or "coin_10")
    // and sync when initialCounts loaded from API
    useEffect(() => {
        if (!initialCounts || Object.keys(initialCounts).length === 0) {
            setCounts({});
            return;
        }

        const migrated: DenominationCounts = {};
        for (const [key, value] of Object.entries(initialCounts)) {
            // Check if it's an old-style numeric key
            if (!isNaN(Number(key))) {
                const denom = Number(key);
                // Determine if it's a banknote or coin based on denomination value
                const isBanknote = BANKNOTES.includes(denom);
                const isCoin = COINS.includes(denom);
                
                if (isBanknote && !isCoin) {
                    migrated[getKey('banknote', denom)] = value;
                } else if (isCoin && !isBanknote) {
                    migrated[getKey('coin', denom)] = value;
                } else if (isBanknote && isCoin) {
                    // Both exist (e.g., 10) - prefer banknote for backward compatibility
                    migrated[getKey('banknote', denom)] = value;
                }
            } else {
                // Already in new format or unknown - keep as is
                migrated[key] = value;
            }
        }
        setCounts(migrated);
    }, [initialCounts]);

    const saveToDB = useCallback(async (newCounts: DenominationCounts) => {
        if (readOnly) return;
        setSaveStatus('saving');
        try {
            await fetch(`/api/cash-register/shifts/${shiftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ denominationCounts: newCounts }),
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('idle');
        }
    }, [shiftId, readOnly]);

    const setCount = (type: 'banknote' | 'coin', denom: number, val: string) => {
        if (readOnly) return;
        const n = Math.max(0, parseInt(val, 10) || 0);
        const key = getKey(type, denom);
        const newCounts = { ...counts, [key]: n };
        setCounts(newCounts);

        // Debounce autosave — 800ms
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveToDB(newCounts), 800);
    };

    const reset = () => {
        if (readOnly) return;
        const empty: DenominationCounts = {};
        setCounts(empty);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        saveToDB(empty);
    };

    const counted = calcTotal(counts);
    const diff = counted - expectedBalance;
    const isZero = Object.values(counts).every(v => !v);

    return (
        <div className={styles.denomSection}>
            {/* Collapsible header */}
            <div className={styles.denomHeader} onClick={() => setOpen(o => !o)}>
                <span className={styles.denomHeaderLeft}>
                    🪙 Підрахунок купюр і монет {readOnly && "(Архів)"}
                </span>
                <span className={styles.denomHeaderRight}>
                    {!readOnly && saveStatus === 'saving' && (
                        <span className={`${styles.saveStatus} ${styles.saveStatusSaving}`}>Зберігається...</span>
                    )}
                    {!readOnly && saveStatus === 'saved' && (
                        <span className={`${styles.saveStatus} ${styles.saveStatusSaved}`}>✓ Збережено</span>
                    )}
                    {!isZero && (
                        <span style={{ fontWeight: 700, color: '#334155' }}>
                            {counted.toFixed(2)} ₴
                        </span>
                    )}
                    <span
                        className={styles.denomChevron}
                        style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                    >
                        ▶
                    </span>
                </span>
            </div>

            {open && (
                <div className={styles.denomBody}>
                    <div className={styles.denomTableWrapper}>
                        <table className={styles.denomTable}>
                            <thead>
                                <tr>
                                    <th>Номінал</th>
                                    <th>Кількість</th>
                                    <th>Сума</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Banknotes */}
                                <tr className={styles.denomGroupHeader}>
                                    <td colSpan={3}>Банкноти</td>
                                </tr>
                                {BANKNOTES.map(d => {
                                    const qty = counts[getKey('banknote', d)] || 0;
                                    const rowTotal = qty * d;
                                    return (
                                        <tr key={`banknote_${d}`}>
                                            <td>
                                                <span className={styles.denomBadge}>{d} ₴</span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={qty || ''}
                                                    placeholder="0"
                                                    disabled={readOnly}
                                                    className={styles.denomQtyInput}
                                                    onChange={e => setCount('banknote', d, e.target.value)}
                                                />
                                            </td>
                                            <td className={`${styles.denomRowTotal} ${rowTotal > 0 ? styles.denomRowTotalActive : ''}`}>
                                                {rowTotal > 0 ? `${rowTotal.toFixed(2)} ₴` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Coins */}
                                <tr className={styles.denomGroupHeader}>
                                    <td colSpan={3}>Монети</td>
                                </tr>
                                {COINS.map(d => {
                                    const qty = counts[getKey('coin', d)] || 0;
                                    const rowTotal = qty * d;
                                    const label = d >= 1 ? `${d} ₴` : `${Math.round(d * 100)} коп.`;
                                    return (
                                        <tr key={`coin_${d}`}>
                                            <td>
                                                <span className={`${styles.denomBadge} ${styles.denomBadgeCoin}`}>{label}</span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={qty || ''}
                                                    placeholder="0"
                                                    disabled={readOnly}
                                                    className={styles.denomQtyInput}
                                                    onChange={e => setCount('coin', d, e.target.value)}
                                                />
                                            </td>
                                            <td className={`${styles.denomRowTotal} ${rowTotal > 0 ? styles.denomRowTotalActive : ''}`}>
                                                {rowTotal > 0 ? `${rowTotal.toFixed(2)} ₴` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer summary */}
                    <div className={styles.denomFooter}>
                        <div className={`${styles.denomFooterRow} ${styles.denomFooterTotal}`}>
                            <span>💵 Підраховано готівки:</span>
                            <span>{counted.toFixed(2)} ₴</span>
                        </div>
                        <div className={styles.denomFooterRow}>
                            <span>📊 Очікуваний залишок (за звітом):</span>
                            <span style={{ fontWeight: 700 }}>{expectedBalance.toFixed(2)} ₴</span>
                        </div>
                        {!isZero && (
                            <div
                                className={`${styles.denomFooterRow} ${Math.abs(diff) < 0.005
                                    ? styles.denomFooterDiffOk
                                    : styles.denomFooterDiffWarn
                                    }`}
                            >
                                <span>
                                    {Math.abs(diff) < 0.005
                                        ? '✅ Залишок збігається'
                                        : diff > 0
                                            ? '⚠️ Надлишок:'
                                            : '⚠️ Нестача:'}
                                </span>
                                <span>
                                    {Math.abs(diff) < 0.005
                                        ? ''
                                        : `${diff > 0 ? '+' : ''}${diff.toFixed(2)} ₴`}
                                </span>
                            </div>
                        )}
                        {!readOnly && (
                            <button className={styles.denomResetBtn} onClick={reset}>
                                ↺ Скинути все
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
