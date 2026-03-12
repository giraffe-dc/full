"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { useToast } from '@/components/ui/ToastContext';
import { ClientRow } from '@/types/accounting';
import { Promotion } from '@/types/marketing';
import { Preloader } from '@/components/ui/Preloader';

type TabType = 'automation' | 'broadcasts' | 'invitations';

interface TelegramSetting {
    _id?: string;
    type: string;
    text: string;
    isActive: boolean;
}

export default function TelegramPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('automation');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Broadcast State
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [messageText, setMessageText] = useState("");
    const [selectedPromotion, setSelectedPromotion] = useState<string>("");
    const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(true);

    // Automation Settings State
    const [settings, setSettings] = useState<TelegramSetting[]>([]);

    // Invitations State
    const [unconnectedClients, setUnconnectedClients] = useState<ClientRow[]>([]);
    const [optedOutClients, setOptedOutClients] = useState<ClientRow[]>([]);
    const [inviteText, setInviteText] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, promosRes, settingsRes] = await Promise.all([
                fetch('/api/accounting/clients'),
                fetch('/api/marketing/promotions'),
                fetch('/api/telegram/settings')
            ]);

            const clientsData = await clientsRes.json();
            const promosData = await promosRes.json();
            const settingsData = await settingsRes.json();

            if (clientsData.data) {
                const tgClients = clientsData.data.filter((c: any) => c.telegramChatId && c.status !== 'inactive');
                const noTgClients = clientsData.data.filter((c: any) => !c.telegramChatId && !c.telegramOptOut && c.status !== 'inactive');
                const optOutClients = clientsData.data.filter((c: any) => !c.telegramChatId && c.telegramOptOut && c.status !== 'inactive');
                setClients(tgClients);
                setUnconnectedClients(noTgClients);
                setOptedOutClients(optOutClients);
                if (selectAll) setSelectedClients(new Set(tgClients.map((c: any) => c._id || c.id)));
            }

            if (promosData.data) {
                setPromotions(promosData.data.filter((p: any) => p.isActive));
            }

            if (settingsData.data) {
                setSettings(settingsData.data);
                // Set inviteText from DB setting
                const invitationSetting = settingsData.data.find((s: any) => s.type === 'invitation_text');
                if (invitationSetting?.text) {
                    setInviteText(invitationSetting.text);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Помилка завантаження даних");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Broadcast Handlers ---
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
            if (newSelected.size === clients.length) setSelectAll(true);
        }
        setSelectedClients(newSelected);
    };

    const handleSendBroadcast = async () => {
        if (selectedClients.size === 0) {
            toast.error("Виберіть хоча б одного клієнта");
            return;
        }

        if (!messageText.trim() && !selectedPromotion) {
            toast.error("Введіть текст повідомлення або виберіть акцію");
            return;
        }

        if (!confirm(`Відправити повідомлення ${selectedClients.size} клієнтам?`)) return;

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
            finalMessage = finalMessage ? `${messageText}\n\n${finalMessage}` : messageText;
        }
        return finalMessage || "Тут буде попередній перегляд вашого повідомлення...";
    }, [messageText, selectedPromotion, promotions]);

    // --- Invitation Handlers ---
    const getCleanPhone = (phone: string) => {
        return phone.replace(/\D/g, '');
    };

    const handleSms = (phone: string) => {
        window.open(`sms:${phone}?body=${encodeURIComponent(invitationTextSetting.text)}`, '_blank');
    };

    const handleWhatsApp = (phone: string) => {
        const clean = getCleanPhone(phone);
        window.open(`https://wa.me/${clean}?text=${encodeURIComponent(invitationTextSetting.text)}`, '_blank');
    };

    const handleViber = (phone: string) => {
        navigator.clipboard.writeText(invitationTextSetting.text).then(() => {
            toast.success("Текст скопійовано! Відкриваємо Viber...");
            const clean = getCleanPhone(phone);
            window.location.href = `viber://chat?number=%2B${clean}`;
        }).catch(() => {
            toast.error("Не вдалося скопіювати текст");
        });
    };

    const handleOptOut = async (client: any, optOutStatus: boolean) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/accounting/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: client._id || client.id,
                    name: client.name,
                    phone: client.phone,
                    email: client.email || "",
                    address: client.address || "",
                    comment: client.comment || "",
                    birthday: client.birthday || "",
                    telegramChatId: client.telegramChatId || "",
                    telegramOptOut: optOutStatus
                })
            });

            if (res.ok) {
                toast.success(optOutStatus ? "Клієнта переміщено у 'Відмовились'" : "Клієнта повернуто у 'Запрошення'");
                fetchData();
            } else {
                toast.error("Помилка збереження статусу");
            }
        } catch (error) {
            toast.error("Внутрішня помилка сервера");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Automation Handlers ---
    const handleUpdateSetting = (type: string, field: 'text' | 'isActive', value: any) => {
        setSettings(prev => prev.map(s => s.type === type ? { ...s, [field]: value } : s));
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/telegram/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                toast.success("Налаштування збережено");
            } else {
                toast.error("Помилка збереження");
            }
        } catch (error) {
            toast.error("Внутрішня помилка при збереженні");
        } finally {
            setIsSaving(false);
        }
    };

    const birthdaySetting = settings.find(s => s.type === 'birthday') || { type: 'birthday', text: '', isActive: false };
    const birthdayReminder1mSetting = settings.find(s => s.type === 'birthday_reminder_1m') || { type: 'birthday_reminder_1m', text: '', isActive: false };
    const reminderSetting = settings.find(s => s.type === 'reminder') || { type: 'reminder', text: '', isActive: false };
    const botStartGreetingSetting = settings.find(s => s.type === 'bot_start_greeting') || { type: 'bot_start_greeting', text: '', isActive: false };
    const botShareButtonSetting = settings.find(s => s.type === 'bot_share_button') || { type: 'bot_share_button', text: '', isActive: false };
    const botSuccessReplySetting = settings.find(s => s.type === 'bot_success_reply') || { type: 'bot_success_reply', text: '', isActive: false };
    const botFailureReplySetting = settings.find(s => s.type === 'bot_failure_reply') || { type: 'bot_failure_reply', text: '', isActive: false };
    const invitationTextSetting = settings.find(s => s.type === 'invitation_text') || { type: 'invitation_text', text: '', isActive: false };

    if (isLoading) return <Preloader message="Завантаження Telegram-модуля..." />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Управління Telegram</h1>
                <p className={styles.subtitle}>
                    Налаштуйте автоматичні повідомлення та створюйте ручні розсилки для ваших клієнтів.
                </p>
            </div>

            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'automation' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('automation')}
                >
                    Автоматизація (Привітання)
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'broadcasts' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('broadcasts')}
                >
                    Спеціальні розсилки
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'invitations' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('invitations')}
                >
                    Запрошення ({unconnectedClients.length})
                </button>
            </div>

            {/* AUTOMATION TAB */}
            {activeTab === 'automation' && (
                <div>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Привітання з Днем Народження
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={birthdaySetting.isActive}
                                    onChange={(e) => handleUpdateSetting('birthday', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {birthdaySetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст привітання</label>
                            <textarea
                                value={birthdaySetting.text}
                                onChange={(e) => handleUpdateSetting('birthday', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!birthdaySetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Доступні змінні: <span className={styles.badge}>[ChildName]</span> (Ім'я дитини), <span className={styles.badge}>[ChildAge]</span> (Вік дитини), <span className={styles.badge}>[ClientName]</span> (Ім'я клієнта)
                            </span>
                        </div>
                    </div>

                    {/* Birthday Reminder 1 Month */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Нагадування про День Народження (за 1 місяць)
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={birthdayReminder1mSetting.isActive}
                                    onChange={(e) => handleUpdateSetting('birthday_reminder_1m', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {birthdayReminder1mSetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст нагадування</label>
                            <textarea
                                value={birthdayReminder1mSetting.text}
                                onChange={(e) => handleUpdateSetting('birthday_reminder_1m', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!birthdayReminder1mSetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Доступні змінні: <span className={styles.badge}>[ChildName]</span> (Ім'я дитини), <span className={styles.badge}>[ClientName]</span> (Ім'я клієнта), <span className={styles.badge}>[BirthdayDate]</span> (Дата ДН)
                            </span>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Нагадування про Бронювання (за 1 день)
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={reminderSetting.isActive}
                                    onChange={(e) => handleUpdateSetting('reminder', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {reminderSetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст нагадування</label>
                            <textarea
                                value={reminderSetting.text}
                                onChange={(e) => handleUpdateSetting('reminder', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!reminderSetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Доступні змінні: <span className={styles.badge}>[ClientName]</span>, <span className={styles.badge}>[EventTitle]</span>, <span className={styles.badge}>[EventTime]</span>
                            </span>
                        </div>
                    </div>

                    {/* Bot Start Greeting */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Привітання бота (/start)
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={botStartGreetingSetting.isActive}
                                    onChange={(e) => handleUpdateSetting('bot_start_greeting', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {botStartGreetingSetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст привітання</label>
                            <textarea
                                value={botStartGreetingSetting.text}
                                onChange={(e) => handleUpdateSetting('bot_start_greeting', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!botStartGreetingSetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Текст, який отримує користувач після натискання /start
                            </span>
                        </div>
                    </div>

                    {/* Bot Share Button */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Текст кнопки (поділитися контактом)
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={botShareButtonSetting.isActive}
                                    onChange={(e) => handleUpdateSetting('bot_share_button', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {botShareButtonSetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст кнопки</label>
                            <textarea
                                value={botShareButtonSetting.text}
                                onChange={(e) => handleUpdateSetting('bot_share_button', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!botShareButtonSetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Наприклад: 📱 Поділитися номером телефону
                            </span>
                        </div>
                    </div>

                    {/* Bot Success Reply */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Успішне підключення
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={botSuccessReplySetting.isActive}
                                    onChange={(e) => handleUpdateSetting('bot_success_reply', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {botSuccessReplySetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст відповіді</label>
                            <textarea
                                value={botSuccessReplySetting.text}
                                onChange={(e) => handleUpdateSetting('bot_success_reply', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!botSuccessReplySetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Доступні змінні: <span className={styles.badge}>[ClientName]</span> (Ім'я клієнта)
                            </span>
                        </div>
                    </div>

                    {/* Bot Failure Reply */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Невдале підключення (клієнт не знайдений)
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={botFailureReplySetting.isActive}
                                    onChange={(e) => handleUpdateSetting('bot_failure_reply', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {botFailureReplySetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст відповіді</label>
                            <textarea
                                value={botFailureReplySetting.text}
                                onChange={(e) => handleUpdateSetting('bot_failure_reply', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!botFailureReplySetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Повідомлення, коли клієнта з таким номером не знайдено в базі
                            </span>
                        </div>
                    </div>

                    {/* Invitation Text */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            Текст запрошення
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={invitationTextSetting.isActive}
                                    onChange={(e) => handleUpdateSetting('invitation_text', 'isActive', e.target.checked)}
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                {invitationTextSetting.isActive ? 'Увімкнено' : 'Вимкнено'}
                            </label>
                        </h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Текст запрошення</label>
                            <textarea
                                value={invitationTextSetting.text}
                                onChange={(e) => handleUpdateSetting('invitation_text', 'text', e.target.value)}
                                className={styles.textarea}
                                disabled={!invitationTextSetting.isActive}
                            />
                            <span className={styles.helperText}>
                                Використовується для SMS/WhatsApp/Viber розсилок із запрошенням до бота
                            </span>
                        </div>
                    </div>

                    <div className={styles.buttonContainer}>
                        <button
                            onClick={handleSaveSettings}
                            className={styles.primaryButton}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Збереження...' : '💾 Зберегти налаштування'}
                        </button>
                    </div>
                </div>
            )}

            {/* BROADCASTS TAB */}
            {activeTab === 'broadcasts' && (
                <div>
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
                                                        <span style={{ color: '#6b7280', fontSize: '0.85em', marginLeft: '8px' }}>({c.phone})</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.emptyState}>
                                    Немає активних клієнтів з підключеним Telegram.
                                </div>
                            )}
                        </div>

                        <div className={styles.buttonContainer}>
                            <button
                                onClick={handleSendBroadcast}
                                disabled={isSending || selectedClients.size === 0 || (!messageText && !selectedPromotion)}
                                className={styles.primaryButton}
                            >
                                {isSending ? 'Відправка...' : '📢 Розіслати вибраним'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVITATIONS TAB */}
            {activeTab === 'invitations' && (
                <div>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Текст запрошення</h2>
                        <div className={styles.formGroup}>
                            <textarea
                                value={invitationTextSetting.text}
                                onChange={(e) => handleUpdateSetting('invitation_text', 'text', e.target.value)}
                                className={styles.textarea}
                            />
                            <span className={styles.helperText}>
                                Цей текст буде автоматично вставлено у SMS та WhatsApp. Для Viber текст скопіюється в буфер обміну. Не забудьте вставити актуальне посилання на вашого бота!
                            </span>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Клієнти без підключеного Telegram ({unconnectedClients.length})</h2>

                        {unconnectedClients.length > 0 ? (
                            <div className={styles.clientsList} style={{ maxHeight: '500px' }}>
                                {unconnectedClients.map(c => {
                                    return (
                                        <div key={(c as any)._id || c.id} className={styles.clientItem} style={{ justifyContent: 'space-between', padding: '10px' }}>
                                            <div>
                                                <strong>{c.name}</strong>
                                                <div style={{ color: '#6b7280', fontSize: '0.85em' }}>{c.phone}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button onClick={() => handleViber(c.phone)} className={styles.actionBtnViber} title="Відправити у Viber">Viber</button>
                                                <button onClick={() => handleWhatsApp(c.phone)} className={styles.actionBtnWa} title="Відправити у WhatsApp">WA</button>
                                                <button onClick={() => handleSms(c.phone)} className={styles.actionBtnSms} title="Відправити SMS">SMS</button>
                                                <button onClick={() => handleOptOut(c, true)} className={styles.actionBtnReject} title="Відмітити як відмову">❌</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                Усі активні клієнти вже підключені до Telegram! 🎉
                            </div>
                        )}
                    </div>

                    {optedOutClients.length > 0 && (
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Відмовилися від Telegram ({optedOutClients.length})</h2>
                            <span className={styles.helperText} style={{marginBottom: '10px', display: 'block'}}>
                                Ці клієнти відмовились від підключення бота (або ви вручну прибрали їх зі списку запрошень).
                            </span>
                            <div className={styles.clientsList} style={{ maxHeight: '300px' }}>
                                {optedOutClients.map(c => {
                                    return (
                                        <div key={(c as any)._id || c.id} className={styles.clientItem} style={{ justifyContent: 'space-between', padding: '10px', background: '#fef2f2', borderColor: '#fee2e2' }}>
                                            <div>
                                                <strong style={{color: '#991b1b'}}>{c.name}</strong>
                                                <div style={{ color: '#b91c1c', fontSize: '0.85em' }}>{c.phone}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button onClick={() => handleOptOut(c, false)} className={styles.actionBtnRestore} title="Повернути до списку запрошень">Повернути</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
