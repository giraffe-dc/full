"use client";

import React, { useEffect, useState } from 'react';
import { Modal, Button, Badge, Preloader } from '@/components/ui';
import { Promotion, PromotionCondition } from '../../types/marketing';
import { Check, CartItem } from '../../types/cash-register';
import styles from './ApplyPromotionModal.module.css';

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
                const active = data.data.filter((p: Promotion) => p.isActive);
                setPromotions(active);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const validateCondition = (condition: PromotionCondition, items: CartItem[]): boolean => {
        let relevantQuantity = 0;
        let relevantAmount = 0;
        const targetIds = condition.targetIds || [];

        for (const item of items) {
            let isMatch = false;
            if (condition.type === 'total_amount') {
                isMatch = true;
            } else if (condition.type === 'product') {
                if (
                    (item.productId && targetIds.includes(item.productId)) ||
                    (condition.targetNames && condition.targetNames.includes(item.serviceName))
                ) {
                    isMatch = true;
                }
            } else if (condition.type === 'category') {
                if (
                    (condition.targetNames && condition.targetNames.includes(item.category)) ||
                    (condition.targetIds && condition.targetIds.includes(item.category))
                ) {
                    isMatch = true;
                }
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
        let updatedItems = check.items.map(i => ({ ...i, discount: 0 }));

        if (p.result.type === 'fixed_discount') {
            totalDiscount = p.result.value;
        } else if (p.result.type === 'percent_discount') {
            const percent = p.result.value;
            const matchingItemIndices = new Set<number>();

            p.conditions.forEach(cond => {
                updatedItems.forEach((item, idx) => {
                    let isMatch = false;
                    if (cond.type === 'total_amount') isMatch = true;
                    if (cond.type === 'product' && ((item.productId && cond.targetIds?.includes(item.productId)) || (cond.targetNames?.includes(item.serviceName)))) isMatch = true;
                    if (cond.type === 'category' && (cond.targetNames?.includes(item.category) || cond.targetIds?.includes(item.category))) isMatch = true;
                    if (isMatch) matchingItemIndices.add(idx);
                });
            });

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

    const isPromotionEligibleBySettings = (p: Promotion): boolean => {
        const now = new Date();
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate) {
            const end = new Date(p.endDate);
            end.setHours(23, 59, 59, 999);
            if (end < now) return false;
        }
        if (p.daysOfWeek && p.daysOfWeek.length > 0) {
            const currentDay = now.getDay();
            if (!p.daysOfWeek.includes(currentDay)) return false;
        }
        if (p.timeStart && p.timeEnd) {
            const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            if (currentTimeStr < p.timeStart || currentTimeStr > p.timeEnd) return false;
        }
        if (p.audience === 'registered' && !check.customerId) return false;
        return true;
    };

    const availablePromotions = promotions.map(p => {
        if (!isPromotionEligibleBySettings(p)) return null;
        const isEligible = p.conditions.every(c => validateCondition(c, check.items));
        if (!isEligible) return null;
        return calculatePromotion(p);
    }).filter(p => p !== null) as PromotionCalculation[];

    const getPromotionTag = (p: Promotion) => {
        if (p.result.type === 'percent_discount') return { label: `${p.result.value}%`, variant: 'percent' as const };
        if (p.result.type === 'fixed_discount') return { label: `-${p.result.value}₴`, variant: 'fixed' as const };
        return { label: 'Акція', variant: 'total' as const };
    };

    return (
        <Modal
            isOpen={true}
            title="🏷️ Доступні акції"
            onClose={onClose}
            size="lg"
        >
            <div className={styles.modalContent}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <Preloader fullScreen={false} variant="yellow" showText={false} />
                        <p className={styles.loadingText}>Перевіряємо доступні акції...</p>
                    </div>
                ) : availablePromotions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🏷️</div>
                        <p className={styles.emptyText}>Немає доступних акцій для цього чеку</p>
                    </div>
                ) : (
                    <div className={styles.promotionList}>
                        {availablePromotions.map(({ promotion, discountAmount, updatedItems }) => {
                            const tag = getPromotionTag(promotion);
                            const isActive = check.appliedPromotionId === (promotion.id || promotion._id);

                            return (
                                <div
                                    key={promotion.id || promotion._id}
                                    className={`${styles.promotionCard} ${isActive ? styles.active : ''}`}
                                >
                                    <div className={styles.promotionInfo}>
                                        <div className={styles.promotionName}>{promotion.name}</div>
                                        <div className={styles.promotionDiscount}>
                                            Знижка: <span className={styles.amount}>-{discountAmount.toFixed(2)} ₴</span>
                                        </div>
                                        <div className={styles.promotionTags}>
                                            <Badge variant={tag.variant === 'percent' ? 'info' : tag.variant === 'fixed' ? 'purple' : 'default'} size="sm">
                                                {tag.label}
                                            </Badge>
                                            {promotion.conditions.map((cond, idx) => (
                                                <Badge key={idx} variant="default" size="sm">
                                                    {cond.type === 'product' ? 'Товар' : cond.type === 'category' ? 'Категорія' : 'Сума'}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={styles.promotionButtons}>
                                        {isActive ? (
                                            <button
                                                className={styles.cancelButton}
                                                onClick={() => onApply(null, 0, check.items.map(i => ({ ...i, discount: 0 })))}
                                            >
                                                Скасувати
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.applyButton}
                                                onClick={() => onApply(promotion, discountAmount, updatedItems)}
                                            >
                                                Застосувати
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
