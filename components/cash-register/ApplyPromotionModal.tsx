import React, { useEffect, useState } from 'react';
import { Promotion, PromotionCondition } from '../../types/marketing';
import { Check, CartItem } from '../../types/cash-register';
import { Preloader } from '../ui/Preloader';
import styles from '../accounting/marketing/PromotionModal.module.css'; // Reusing styles

interface ApplyPromotionModalProps {
    check: Check;
    onClose: () => void;
    onApply: (promotion: Promotion | null, discountAmount: number, items?: CartItem[]) => void;
}

export function ApplyPromotionModal({ check, onClose, onApply }: ApplyPromotionModalProps) {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/marketing/promotions');
            const data = await res.json();
            if (data.success) {
                // Filter only active promotions
                const active = data.data.filter((p: Promotion) => p.isActive);
                setPromotions(active);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // Validation Logic
    const validateCondition = (condition: PromotionCondition, items: CartItem[]): boolean => {
        let relevantQuantity = 0;
        let relevantAmount = 0;

        // Use check items logic
        // Need to match condition.targetIds to item.productId or item.category

        // Wait, items in Check (CartItem) have `productId` and `category` (string name usually, or ID?).
        // In types/cash-register.ts: category is string. productId is string.
        // In types/marketing.ts: targetIds are string IDs.

        // Assumption: condition.targetIds contains productId or Category ID/Name.
        // If type=='category', we match category name? Or we fetch category IDs?
        // Marketing search uses IDs. Cash Register items store `category` as string NAME usually.
        // But CartItem also has `productId`.

        // Let's assume strict matching might be hard without full category map.
        // For 'product', we match `productId` or `serviceId`.

        const targetIds = condition.targetIds || [];

        // Aggregate totals for matching items
        for (const item of items) {
            let isMatch = false;
            if (condition.type === 'total_amount') {
                isMatch = true;
            } else if (condition.type === 'product') {
                console.log(item);
                console.log(targetIds);
                if (item.productId && targetIds.includes(item.productId)) isMatch = true;
            } else if (condition.type === 'category') {
                // Tricky: if cart item stores category name but we have category ID in targetIds.
                // We might need to match via Names if possible, or expect Ids.
                // The Search in PromotionModal stores ID and Name.
                // Let's check name as fallback?
                // Or we rely on cart item having category ID?
                // CartItem interface: `category: string`. Usually name.

                // Fallback: match by name if targetNames exists
                if (condition.targetNames && condition.targetNames.includes(item.category)) {
                    isMatch = true;
                }
                // If item.category is actually an ID (unlikely in current code?), check targetIds
            }

            if (isMatch) {
                relevantQuantity += item.quantity;
                relevantAmount += item.price * item.quantity;
            }
        }

        if (condition.operator === 'gte') {
            if (condition.unit === 'qty') return relevantQuantity >= condition.value;
            if (condition.unit === 'uah') return relevantAmount >= condition.value;
        }

        return false;
    };

    interface PromotionCalculation {
        promotion: Promotion;
        discountAmount: number;
        updatedItems: CartItem[];
    }

    const calculatePromotion = (p: Promotion): PromotionCalculation => {
        let totalDiscount = 0;
        // Deep clone items to avoid mutating state directly
        let updatedItems = check.items.map(i => ({ ...i, discount: 0 }));

        if (p.result.type === 'fixed_discount') {
            totalDiscount = p.result.value;
            // For fixed discount, we don't necessarily distribute it to items, 
            // but we could if needed. For now, let's keep it global.
            // If we wanted to distribute:
            // const factor = totalDiscount / check.subtotal;
            // updatedItems.forEach(i => i.discount = i.subtotal * factor);
        } else if (p.result.type === 'percent_discount') {
            const percent = p.result.value;
            const matchingItemIndices = new Set<number>();

            // Identify matching items
            p.conditions.forEach(cond => {
                updatedItems.forEach((item, idx) => {
                    let isMatch = false;
                    // Simplistic matching logic
                    if (cond.type === 'total_amount') isMatch = true;
                    if (cond.type === 'product' && item.productId && cond.targetIds?.includes(item.productId)) isMatch = true;
                    if (cond.type === 'category' && cond.targetNames?.includes(item.category)) isMatch = true;
                    // Note: Category matching by name fallback

                    if (isMatch) matchingItemIndices.add(idx);
                });
            });

            // Apply discount to matching items
            updatedItems.forEach((item, idx) => {
                if (matchingItemIndices.has(idx)) {
                    const itemDiscount = (item.subtotal * percent) / 100;
                    item.discount = itemDiscount;
                    totalDiscount += itemDiscount;
                }
            });
        }

        return { promotion: p, discountAmount: totalDiscount, updatedItems };
    };

    const availablePromotions = promotions.map(p => {
        const isEligible = p.conditions.every(c => validateCondition(c, check.items));
        if (!isEligible) return null;
        return calculatePromotion(p);
    }).filter(p => p !== null) as PromotionCalculation[];


    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '600px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Доступні акції</h2>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>
                <div className={styles.content}>
                    {isLoading ? (
                        <Preloader fullScreen={false} variant="dark" message="Перевіряємо доступні акції..." />
                    ) : availablePromotions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                            Немає доступних акцій для цього чеку
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {availablePromotions.map(({ promotion, discountAmount, updatedItems }) => (
                                <div key={promotion.id || promotion._id} style={{
                                    padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: check.appliedPromotionId === (promotion.id || promotion._id) ? '#f0fdf4' : 'white',
                                    borderColor: check.appliedPromotionId === (promotion.id || promotion._id) ? '#10b981' : '#e5e7eb'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{promotion.name}</div>
                                        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                            Знижка: <span style={{ color: '#ef4444', fontWeight: 600 }}>-{discountAmount.toFixed(2)} ₴</span>
                                        </div>
                                    </div>
                                    {check.appliedPromotionId === (promotion.id || promotion._id) ? (
                                        <button
                                            onClick={() => onApply(null, 0)}
                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            Скасувати
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onApply(promotion, discountAmount, updatedItems)}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            Застосувати
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// I need to update the interface helper here too.
// Real fix below:
