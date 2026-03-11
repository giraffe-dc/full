"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/ToastContext';
import { ClientRow } from '@/types/accounting';
import { Promotion } from '@/types/marketing';
import { Preloader } from '@/components/ui/Preloader';

export default function BroadcastPage() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    
    const [messageText, setMessageText] = useState("");
    const [selectedPromotion, setSelectedPromotion] = useState<string>("");
    
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, promosRes] = await Promise.all([
                fetch('/api/accounting/clients'),
                fetch('/api/marketing/promotions')
            ]);
            
            const clientsData = await clientsRes.json();
            const promosData = await promosRes.json();

            if (clientsData.data) {
                // Filter only clients with telegram
                const tgClients = clientsData.data.filter((c: any) => c.telegramChatId && c.status !== 'inactive');
                setClients(tgClients);
                if (selectAll) {
                    setSelectedClients(new Set(tgClients.map((c: any) => c._id || c.id)));
                }
            }
            
            if (promosData.data) {
                const activePromos = promosData.data.filter((p: any) => p.isActive);
                setPromotions(activePromos);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Помилка завантаження даних");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedClients(new Set(clients.map(c => (c as any)._id || c.id)));
        } else {
            setSelectedClients(new Set());
        }
    };

    const handleSelectClient = (clientId: string) => {
        const newSelected = new Set(selectedClients);
        if (newSelected.has(clientId)) {
            newSelected.delete(clientId);
            setSelectAll(false);
        } else {
            newSelected.add(clientId);
            if (newSelected.size === clients.length) {
                setSelectAll(true);
            }
        }
        setSelectedClients(newSelected);
    };

    const handleSend = async () => {
        if (selectedClients.size === 0) {
            toast.error("Виберіть хоча б одного клієнта");
            return;
        }

        if (!messageText.trim() && !selectedPromotion) {
            toast.error("Введіть текст повідомлення або виберіть акцію");
            return;
        }

        if (!confirm(`Відправити повідомлення ${selectedClients.size} клієнтам?`)) {
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch('/api/marketing/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientIds: Array.from(selectedClients),
                    text: messageText,
                    promotionId: selectedPromotion || null
                })
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                toast.success(`Успішно надіслано ${data.count} клієнтам`);
                setMessageText("");
                setSelectedPromotion("");
            } else {
                toast.error(data.error || "Помилка розсилки");
            }
            
        } catch (error) {
            console.error("Broadcast error:", error);
            toast.error("Внутрішня помилка розсилки");
        } finally {
            setIsSending(false);
        }
    };

    const previewMessage = useMemo(() => {
        let finalMessage = "";

        if (selectedPromotion) {
            const promotion = promotions.find(p => (p as any)._id === selectedPromotion || p.id === selectedPromotion);
            if (promotion) {
                const resultMsg = promotion.result?.type === 'percent_discount' 
                    ? `зі знижкою ${promotion.result.value}%`
                    : promotion.result?.type === 'fixed_discount'
                    ? `зі знижкою ${promotion.result.value} ₴`
                    : `з бонусом ${promotion.result?.value || ''}`;
                
                finalMessage = `🌟 **${promotion.name}** 🌟\n\nЧудова новина! У нас діє спеціальна пропозиція ${resultMsg}.\n\nЗавітайте до нас з ${promotion.startDate} до ${promotion.endDate} та скористайтеся вигодою! 🦒`;
            }
        }

        if (messageText) {
            if (finalMessage) {
                finalMessage = `${messageText}\n\n${finalMessage}`;
            } else {
                finalMessage = messageText;
            }
        }

        return finalMessage || "Тут буде попередній перегляд вашого повідомлення...";
    }, [messageText, selectedPromotion, promotions]);

    if (isLoading) return <Preloader message="Завантаження клієнтів та акцій..." />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Спеціальні розсилки Telegram</h1>
                <p className={styles.subtitle}>Надсилайте кастомні повідомлення або рекламні пропозиції вашим підключеним клієнтам.</p>
            </div>

            <div className={styles.card}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Додати існуючу акцію (опціонально)</label>
                    <select 
                        value={selectedPromotion}
                        onChange={(e) => setSelectedPromotion(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">-- Без акції --</option>
                        {promotions.map(p => (
                            <option key={(p as any)._id || p.id} value={(p as any)._id || p.id}>
                                {p.name} ({p.startDate} - {p.endDate})
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Особисте повідомлення / Текст</label>
                    <textarea 
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className={styles.textarea}
                        placeholder="Напишіть тут текст, який отримають клієнти..."
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Попередній перегляд повідомлення</label>
                    <div className={styles.previewBox}>
                        {previewMessage}
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.formGroup}>
                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Отримувачі (Клієнти з Telegram)</span>
                        <span style={{ fontWeight: 'normal', color: '#6b7280' }}>
                            Обрано: {selectedClients.size} / {clients.length}
                        </span>
                    </label>

                    {clients.length > 0 ? (
                        <>
                            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectAll}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className={styles.checkbox}
                                />
                                <strong>Вибрати всіх</strong>
                            </div>
                            
                            <div className={styles.clientsList}>
                                {clients.map(c => {
                                    const id = (c as any)._id || c.id;
                                    return (
                                        <label key={id} className={styles.clientItem}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedClients.has(id)}
                                                onChange={() => handleSelectClient(id)}
                                                className={styles.checkbox}
                                            />
                                            <span>
                                                <strong>{c.name}</strong> 
                                                <span style={{color: '#6b7280', fontSize: '0.85em', marginLeft: '8px'}}>
                                                    ({c.phone})
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            Немає жодного активного клієнта з підключеним Telegram. Хай клієнти підключать бота.
                        </div>
                    )}
                </div>

                <div className={styles.buttonContainer}>
                    <button 
                        onClick={handleSend}
                        disabled={isSending || selectedClients.size === 0 || (!messageText && !selectedPromotion)}
                        className={styles.sendButton}
                    >
                        {isSending ? (
                            'Відправка...'
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                Розіслати вибраним
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
