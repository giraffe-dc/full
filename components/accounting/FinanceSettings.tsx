import React, { useState, useEffect } from 'react';
import { MoneyAccount } from '../../types/accounting';
import styles from './FinanceSettings.module.css';
import { useToast } from '../ui/ToastContext';

interface FinanceSettingsProps {
}

export function FinanceSettings() {
    const toast = useToast();
    const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Form State
    const [cashAccountId, setCashAccountId] = useState('');
    const [cardAccountId, setCardAccountId] = useState('');
    const [safeAccountId, setSafeAccountId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [accRes, setRes] = await Promise.all([
                fetch('/api/accounting/accounts'),
                fetch('/api/settings')
            ]);
            const accData = await accRes.json();
            const setData = await setRes.json();

            if (accData.data) setAccounts(accData.data);
            if (setData.data && setData.data.finance) {
                setSettings(setData.data);
                setCashAccountId(setData.data.finance.cashAccountId || '');
                setCardAccountId(setData.data.finance.cardAccountId || '');
                setSafeAccountId(setData.data.finance.safeAccountId || '');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    finance: {
                        cashAccountId,
                        cardAccountId,
                        safeAccountId
                    }
                })
            });
            if (res.ok) {
                toast.success('Налаштування збережено!');
            } else {
                toast.error('Помилка збереження');
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка сервера');
        }
    };

    if (loading) return <div>Завантаження налаштувань...</div>;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Фінанси / Налаштування рахунків</h2>
            <p className={styles.description}>Прив'яжіть ваші рахунки до типів оплат для автоматичного обліку.</p>

            <div className={styles.formGroup}>
                <label className={styles.label}>Рахунок для готівки</label>
                <select
                    className={styles.select}
                    value={cashAccountId}
                    onChange={(e) => setCashAccountId(e.target.value)}
                >
                    <option value="">-- Оберіть рахунок --</option>
                    {accounts.filter(a => a.type === 'cash').map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.balance} {a.currency})</option>
                    ))}
                </select>
                <p className={styles.hint}>Сюди будуть зараховуватися оплати готівкою.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Рахунок для картки / терміналу</label>
                <select
                    className={styles.select}
                    value={cardAccountId}
                    onChange={(e) => setCardAccountId(e.target.value)}
                >
                    <option value="">-- Оберіть рахунок --</option>
                    {accounts.filter(a => a.type === 'card' || a.type === 'bank').map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.balance} {a.currency})</option>
                    ))}
                </select>
                <p className={styles.hint}>Сюди будуть зараховуватися безготівкові оплати.</p>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>Рахунок для інкасації (Сейф)</label>
                <select
                    className={styles.select}
                    value={safeAccountId}
                    onChange={(e) => setSafeAccountId(e.target.value)}
                >
                    <option value="">-- Оберіть рахунок --</option>
                    {accounts.filter(a => a.type === 'safe' || a.type === 'other').map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.balance} {a.currency})</option>
                    ))}
                </select>
                <p className={styles.hint}>Рахунок для зберігання інкасованих коштів.</p>
            </div>

            <button className={styles.saveButton} onClick={handleSave}>Зберегти налаштування</button>
        </div>
    );
}
