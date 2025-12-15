
import React, { useState, useEffect } from 'react';
import styles from './StockSection.module.css';

interface StockBalance {
    _id: string;
    warehouseId: string;
    itemId: string;
    itemName: string; // Storing here for simplicity, otherwise need lookup
    quantity: number;
    unit: string;
    avgCost: number;
    lastCost: number;
}

interface Warehouse {
    _id: string;
    name: string;
}

export function StockBalances() {
    const [balances, setBalances] = useState<StockBalance[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchBalances();
    }, [selectedWarehouse]);

    const fetchWarehouses = async () => {
        try {
            const res = await fetch('/api/accounting/stock/warehouses');
            const data = await res.json();
            if (data.data) setWarehouses(data.data);
        } catch (e) { console.error(e); }
    };

    const fetchBalances = async () => {
        try {
            setIsLoading(true);
            let url = '/api/accounting/stock/balances';
            if (selectedWarehouse) url += `?warehouseId=${selectedWarehouse}`;

            const res = await fetch(url);
            const data = await res.json();
            if (data.data) {
                setBalances(data.data);
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getWarehouseName = (id: string) => {
        const wh = warehouses.find(w => w._id === id);
        return wh ? wh.name : 'Unknown';
    };

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Залишки на складах</h2>
                </div>
                <div className={styles.toolbarRight}>
                    <select
                        value={selectedWarehouse}
                        onChange={e => setSelectedWarehouse(e.target.value)}
                        className={styles.select}
                        style={{ marginRight: '10px' }}
                    >
                        <option value="">Всі склади</option>
                        {warehouses.map(w => (
                            <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                    </select>
                    <button className={styles.toolbarButton}>🔄 Оновити</button>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Найменування</th>
                            <th>Склад</th>
                            <th>Кількість</th>
                            <th>Од. вим.</th>
                            <th>Остання ціна</th>
                            <th>Вартість залишку</th>
                        </tr>
                    </thead>
                    <tbody>
                        {balances.length > 0 ? (
                            balances.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.itemName}</td>
                                    <td><span className={styles.categoryBadge}>{getWarehouseName(item.warehouseId)}</span></td>
                                    <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                                    <td>{item.unit}</td>
                                    <td>{item.lastCost?.toFixed(2)} ₴</td>
                                    <td>{(item.quantity * (item.lastCost || 0)).toFixed(2)} ₴</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className={styles.noData}>Запишиків не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
