import React, { useState, useEffect } from 'react';
import styles from './StockSection.module.css';

interface StockBalance {
    _id: string;
    warehouseId: string;
    itemId: string;
    itemName: string;
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
    const [searchTerm, setSearchTerm] = useState('');

    // Accordion state
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});
    const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

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

    const toggleExpand = async (item: StockBalance) => {
        if (expandedItemId === item._id) {
            setExpandedItemId(null);
            return;
        }

        setExpandedItemId(item._id);

        // If not in cache, fetch it
        if (!historyCache[item._id]) {
            try {
                setLoadingHistory(item._id);
                const res = await fetch(`/api/accounting/stock/movements?warehouseId=${item.warehouseId}&itemId=${item.itemId}`);
                const data = await res.json();

                if (data.data) {
                    setHistoryCache(prev => ({ ...prev, [item._id]: data.data }));
                }
            } catch (e) {
                console.error("Error fetching history:", e);
            } finally {
                setLoadingHistory(null);
            }
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('uk-UA', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            'sale': 'Продаж',
            'supply': 'Постачання',
            'writeoff': 'Списання',
            'move': 'Переміщення',
            'inventory': 'Інвентаризація'
        };
        return map[type] || type;
    };

    const getWarehouseName = (id: string) => {
        const wh = warehouses.find(w => w._id === id);
        return wh ? wh.name : 'Unknown';
    };

    // Filter balances by search term
    const filteredBalances = balances.filter(item => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        return item.itemName.toLowerCase().includes(search) ||
            getWarehouseName(item.warehouseId).toLowerCase().includes(search);
    });

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>Залишки на складах</h2>
                </div>
                <div className={styles.toolbarRight}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <input
                            type="text"
                            placeholder="Пошук за назвою або складом..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.input}
                            style={{
                                minWidth: '280px',
                                marginRight: '10px',
                                padding: '8px 32px 8px 12px',
                                fontSize: '14px'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '15px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    color: '#9ca3af',
                                    padding: '2px 5px'
                                }}
                                title="Очистити пошук"
                            >
                                ✕
                            </button>
                        )}
                    </div>
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
                    <button className={styles.toolbarButton} onClick={fetchBalances} disabled={isLoading}>
                        {isLoading ? '⏳ ...' : '🔄 Оновити'}
                    </button>
                </div>
            </div>

            {searchTerm && (
                <div style={{
                    padding: '8px 20px',
                    background: '#f0f9ff',
                    borderBottom: '1px solid #bfdbfe',
                    fontSize: '13px',
                    color: '#1e40af'
                }}>
                    🔍 Знайдено: <b>{filteredBalances.length}</b> з {balances.length} записів
                </div>
            )}

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Найменування</th>
                            <th>Склад</th>
                            <th>Кількість</th>
                            <th>Од. вим.</th>
                            <th>Остання ціна</th>
                            <th>Вартість залишку</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBalances.length > 0 ? (
                            filteredBalances.map((item) => (
                                <React.Fragment key={item._id}>
                                    <tr
                                        onClick={() => toggleExpand(item)}
                                        style={{ cursor: 'pointer', background: expandedItemId === item._id ? '#f3f4f6' : 'transparent' }}
                                    >
                                        <td style={{ textAlign: 'center', color: '#6b7280' }}>
                                            {expandedItemId === item._id ? '▼' : '▶'}
                                        </td>
                                        <td>{item.itemName}</td>
                                        <td><span className={styles.categoryBadge}>{getWarehouseName(item.warehouseId)}</span></td>
                                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.lastCost?.toFixed(2)} ₴</td>
                                        <td>{(item.quantity * (item.lastCost || 0)).toFixed(2)} ₴</td>
                                    </tr>
                                    {expandedItemId === item._id && (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '0', background: '#f9fafb' }}>
                                                <div style={{ padding: '15px' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
                                                        Історія руху: {item.itemName} ({getWarehouseName(item.warehouseId)})
                                                    </h4>

                                                    {loadingHistory === item._id ? (
                                                        <div style={{ padding: '10px', color: '#6b7280' }}>Завантаження історії...</div>
                                                    ) : (
                                                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left' }}>
                                                                    <th style={{ padding: '8px' }}>Дата</th>
                                                                    <th style={{ padding: '8px' }}>Тип</th>
                                                                    <th style={{ padding: '8px' }}>Опис</th>
                                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Кількість</th>
                                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Підсумок</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(historyCache[item._id] || []).map((move: any, idx: number) => {
                                                                    const moveItem = move.items.find((i: any) => i.itemId === item.itemId) || {};
                                                                    const qty = parseFloat(moveItem.qty || 0);
                                                                    const isNegative = ['sale', 'writeoff', 'move'].includes(move.type) && move.warehouseId === item.warehouseId;

                                                                    return (
                                                                        <tr key={move._id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                            <td style={{ padding: '8px' }}>{formatDate(move.date)}</td>
                                                                            <td style={{ padding: '8px' }}>
                                                                                <span style={{
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '11px',
                                                                                    background: move.type === 'sale' ? '#fee2e2' : move.type === 'supply' ? '#dcfce7' : '#f3f4f6',
                                                                                    color: move.type === 'sale' ? '#991b1b' : move.type === 'supply' ? '#166534' : '#374151'
                                                                                }}>
                                                                                    {getTypeLabel(move.type)}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ padding: '8px', color: '#4b5563' }}>{move.description || '-'}</td>
                                                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: isNegative ? '#dc2626' : '#16a34a' }}>
                                                                                {isNegative ? '-' : '+'}{qty} {moveItem.unit}
                                                                            </td>
                                                                            <td style={{ padding: '8px', textAlign: 'right', color: '#9ca3af' }}>--</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                                {(historyCache[item._id] || []).length === 0 && (
                                                                    <tr><td colSpan={5} style={{ padding: '10px', textAlign: 'center', color: '#9ca3af' }}>Немає рухів</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className={styles.noData}>
                                    {searchTerm ? 'Нічого не знайдено за вашим запитом' : 'Записів не знайдено'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
