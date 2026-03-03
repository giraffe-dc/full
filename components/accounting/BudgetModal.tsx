"use client";

import React, { useState, useEffect } from "react";
import styles from "./BudgetModal.module.css";
import type { BudgetItem } from "../../types/accounting";

interface BudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (items: BudgetItem[]) => Promise<void>;
    existingItems: BudgetItem[];
    month: string;
    categories: string[];
}

export function BudgetModal({
    isOpen,
    onClose,
    onSave,
    existingItems,
    month,
    categories,
}: BudgetModalProps) {
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing items or empty items for each category
            if (existingItems.length > 0) {
                setItems(existingItems);
            } else {
                // Create empty items for each category
                const emptyItems = categories.map((cat) => ({
                    categoryId: cat,
                    categoryName: cat,
                    month,
                    plannedAmount: 0,
                }));
                setItems(emptyItems);
            }
        }
    }, [isOpen, existingItems, categories, month]);

    const handleAmountChange = (categoryId: string, value: string) => {
        const amount = parseFloat(value) || 0;
        setItems((prev) =>
            prev.map((item) =>
                item.categoryId === categoryId
                    ? { ...item, plannedAmount: amount }
                    : item
            )
        );
    };

    const handleAddCategory = () => {
        const availableCategories = categories.filter(
            (cat) => !items.some((item) => item.categoryId === cat)
        );
        if (availableCategories.length > 0) {
            setItems((prev) => [
                ...prev,
                {
                    categoryId: availableCategories[0],
                    categoryName: availableCategories[0],
                    month,
                    plannedAmount: 0,
                },
            ]);
        }
    };

    const handleRemoveItem = (categoryId: string) => {
        setItems((prev) => prev.filter((item) => item.categoryId !== categoryId));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(items);
            onClose();
        } catch (e) {
            console.error("Failed to save budget:", e);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalPlanned = items.reduce(
        (sum, item) => sum + item.plannedAmount,
        0
    );

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        Бюджет на {new Date(month + "-01").toLocaleDateString("uk-UA", {
                            month: "long",
                            year: "numeric",
                        })}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <table className={styles.budgetTable}>
                        <thead>
                            <tr>
                                <th>Категорія</th>
                                <th>Планова сума (₴)</th>
                                <th>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.categoryId}>
                                    <td>{item.categoryName}</td>
                                    <td>
                                        <input
                                            type="number"
                                            className={styles.amountInput}
                                            value={item.plannedAmount}
                                            onChange={(e) =>
                                                handleAmountChange(
                                                    item.categoryId,
                                                    e.target.value
                                                )
                                            }
                                            min="0"
                                            step="0.01"
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() =>
                                                handleRemoveItem(item.categoryId)
                                            }
                                        >
                                            Видалити
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className={styles.totalRow}>
                                <td>Разом:</td>
                                <td>
                                    <strong>
                                        {totalPlanned.toLocaleString("uk-UA", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}{" "}
                                        ₴
                                    </strong>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>

                    <button
                        className={styles.addCategoryButton}
                        onClick={handleAddCategory}
                    >
                        + Додати категорію
                    </button>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Скасувати
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Збереження..." : "Зберегти бюджет"}
                    </button>
                </div>
            </div>
        </div>
    );
}
