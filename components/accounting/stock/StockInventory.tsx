"use client";

import { useEffect, useState } from 'react';
import styles from './StockSection.module.css';
import { useToast } from '../../ui/ToastContext';
import { ConfirmModal } from '../../ui/ConfirmModal';

interface InventoryItem {
    itemId: string;
    itemName: string;
    unit: string;
    theoreticalQty: number;
    actualQty: number;
    cost: number;
}

export function StockInventory() {
    const toast = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [inventoryType, setInventoryType] = useState('ingredient'); // 'ingredient' | 'product'
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [inventoryDate, setInventoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [histories, setHistories] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(true);
    const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'itemName', direction: 'asc' });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedData = (data: any[]) => {
        if (!sortConfig) return data;
        return [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Special case for history list warehouse name
            if (sortConfig.key === 'warehouseName') {
                aValue = warehouses.find(w => w._id === a.warehouseId)?.name || '';
                bValue = warehouses.find(w => w._id === b.warehouseId)?.name || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return ' ↕';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    useEffect(() => {
        fetchWarehouses();
        fetchHistories();
    }, []);

    useEffect(() => {
        if (!isStarted && !selectedHistory && selectedWarehouse) {
            checkForDraft();
        }
    }, [selectedWarehouse, inventoryType]);

    async function fetchWarehouses() {
        const res = await fetch('/api/accounting/stock/warehouses');
        const data = await res.json();
        setWarehouses(data.data || []);
        if (data.data?.length > 0) setSelectedWarehouse(data.data[0]._id);
    }

    async function fetchHistories() {
        const res = await fetch('/api/accounting/stock/movements?type=inventory');
        const data = await res.json();
        setHistories(data.data || []);
    }

    const handleViewHistory = (h: any) => {
        setSelectedHistory(h);
        setShowHistory(false);
        setIsStarted(false);
    };

    const handleBackToHistory = () => {
        setSelectedHistory(null);
        setShowHistory(true);
        setIsStarted(false);
    };

    async function startInventory() {
        if (!selectedWarehouse) return toast.error('Оберіть склад');
        setSelectedHistory(null);
        setLoading(true);
        try {
            // 1. Fetch theoretical balances for the warehouse
            const res = await fetch(`/api/accounting/stock/balances?warehouseId=${selectedWarehouse}`);
            const balancesData = await res.json();
            const balances = balancesData.data || [];

            // 2. Fetch all items (ingredients or products) to ensure we didn't miss zero-balance items
            const typeUrl = inventoryType === 'ingredient' ? '/api/accounting/ingredients' : '/api/accounting/products';
            const itemsRes = await fetch(typeUrl);
            const itemsData = await itemsRes.json();
            const allSourceItems = itemsData.data || [];

            // 3. Merge with balances and calculate cost
            const merged = allSourceItems.map((si: any) => {
                const bal = balances.find((b: any) => b.itemId === si._id);

                // Priority for cost: balance.lastCost > item.costPerUnit > last purchase price > 0
                let cost = 0;
                if (bal && bal.lastCost) {
                    cost = bal.lastCost;
                } else if (si.costPerUnit) {
                    cost = si.costPerUnit;
                } else {
                    // Try to fetch last purchase price from stock_movements
                    const lastPurchase = balances.find((b: any) => b.itemId === si._id && b.lastPurchaseCost);
                    if (lastPurchase && lastPurchase.lastPurchaseCost) {
                        cost = lastPurchase.lastPurchaseCost;
                    }
                }

                return {
                    itemId: si._id,
                    itemName: si.name,
                    unit: si.unit || si.yieldUnit || 'шт',
                    theoreticalQty: bal ? bal.quantity : 0,
                    actualQty: bal ? bal.quantity : 0, // Default to theoretical
                    cost: cost
                };
            });

            setItems(merged);
            setIsStarted(true);
            setShowHistory(false);
            toast.success('Дані для інвентаризації завантажено');
        } catch (e) {
            console.error(e);
            toast.error('Помилка завантаження даних');
        } finally {
            setLoading(false);
        }
    }

    const updateActualQty = (itemId: string, val: string) => {
        const num = parseFloat(val) || 0;
        setItems(items.map(i => i.itemId === itemId ? { ...i, actualQty: num } : i));
    };

    async function submitInventory() {
        // We now save ALL items from the inventory list to create a full "snapshot".
        // This ensures every item has a reset point in the history-based balance calculation.
        const movementItems = items.map(i => ({
            itemId: i.itemId,
            itemName: i.itemName,
            unit: i.unit,
            qty: i.actualQty - i.theoreticalQty, // Delta for legacy current-state updates
            actualQty: i.actualQty, // THE MOST IMPORTANT FIELD: snapshot of actual count
            theoreticalQty: i.theoreticalQty, // Theoretical count at time of inventory
            cost: i.cost
        }));

        const body = {
            type: 'inventory',
            warehouseId: selectedWarehouse,
            date: inventoryDate,
            items: movementItems,
            description: `Інвентаризація (${inventoryType === 'ingredient' ? 'Інгредієнти' : 'Товари'})`
        };

        const res = await fetch('/api/accounting/stock/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            // Delete draft after success
            await fetch(`/api/accounting/stock/inventory/drafts?warehouseId=${selectedWarehouse}&type=${inventoryType}`, { method: 'DELETE' });

            toast.success('Інвентаризація успішно проведена');
            setIsStarted(false);
            setShowHistory(true);
            fetchHistories();
            setConfirmOpen(false); // Close modal on success
        } else {
            const err = await res.json();
            toast.error(`Помилка: ${err.error || 'Невідома помилка'}`);
        }
    }

    async function saveDraft() {
        setLoading(true);
        try {
            const body = {
                warehouseId: selectedWarehouse,
                inventoryType,
                date: inventoryDate,
                items: items.map(i => ({ itemId: i.itemId, actualQty: i.actualQty }))
            };
            const res = await fetch('/api/accounting/stock/inventory/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                toast.success('Чернетку збережено');
            } else {
                toast.error('Помилка збереження чернетки');
            }
        } catch (e) {
            toast.error('Помилка мережі');
        } finally {
            setLoading(false);
        }
    }

    async function exportToExcel(dataToExport?: any) {
        try {
            let exportData: any = {};

            if (dataToExport) {
                // Exporting from history view
                exportData = {
                    history: {
                        _id: dataToExport._id,
                        date: dataToExport.date,
                        warehouseName: warehouses.find(w => w._id === dataToExport.warehouseId)?.name || 'Склад',
                        description: dataToExport.description,
                        items: dataToExport.items
                    }
                };
            } else if (selectedHistory) {
                // Exporting currently viewed history
                exportData = {
                    history: {
                        _id: selectedHistory._id,
                        date: selectedHistory.date,
                        warehouseName: warehouses.find(w => w._id === selectedHistory.warehouseId)?.name || 'Склад',
                        description: selectedHistory.description,
                        items: selectedHistory.items
                    }
                };
            } else if (isStarted && items.length > 0) {
                // Exporting current inventory in progress
                exportData = {
                    inventory: {
                        warehouseName: warehouses.find(w => w._id === selectedWarehouse)?.name || 'Склад',
                        inventoryType,
                        date: inventoryDate,
                        items: items
                    }
                };
            } else {
                toast.error('Немає даних для експорту');
                return;
            }

            const res = await fetch('/api/accounting/stock/inventory/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exportData)
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                let filename = 'Inventory_Export.xlsx';
                if (selectedHistory) {
                    filename = `Inventory_${new Date(selectedHistory.date).toISOString().split('T')[0]}.xlsx`;
                } else if (isStarted) {
                    filename = `Inventory_${warehouses.find(w => w._id === selectedWarehouse)?.name || 'Warehouse'}_${inventoryDate}.xlsx`;
                }

                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success('Експорт успішно виконано');
            } else {
                const err = await res.json();
                toast.error(`Помилка експорту: ${err.error || 'Невідома помилка'}`);
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка експорту');
        }
    }

    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [draftData, setDraftData] = useState<any>(null);

    async function checkForDraft() {
        if (!selectedWarehouse) return;
        const res = await fetch(`/api/accounting/stock/inventory/drafts?warehouseId=${selectedWarehouse}&type=${inventoryType}`);
        const data = await res.json();
        if (data.data) {
            setDraftData(data.data);
            setRestoreConfirmOpen(true);
        }
    }

    async function restoreDraft() {
        if (!draftData) return;
        // We need to merge draft data with fresh theoretical balances
        setLoading(true);
        try {
            const balRes = await fetch(`/api/accounting/stock/balances?warehouseId=${selectedWarehouse}`);
            const balancesData = await balRes.json();
            const balances = balancesData.data || [];

            const typeUrl = inventoryType === 'ingredient' ? '/api/accounting/ingredients' : '/api/accounting/products';
            const itemsRes = await fetch(typeUrl);
            const itemsData = await itemsRes.json();
            const allSourceItems = itemsData.data || [];

            const merged = allSourceItems.map((si: any) => {
                const bal = balances.find((b: any) => b.itemId === si._id);
                const draftItem = draftData.items.find((di: any) => di.itemId === si._id);

                // Priority for cost: balance.lastCost > item.costPerUnit > last purchase price > 0
                let cost = 0;
                if (bal && bal.lastCost) {
                    cost = bal.lastCost;
                } else if (si.costPerUnit) {
                    cost = si.costPerUnit;
                } else {
                    const lastPurchase = balances.find((b: any) => b.itemId === si._id && b.lastPurchaseCost);
                    if (lastPurchase && lastPurchase.lastPurchaseCost) {
                        cost = lastPurchase.lastPurchaseCost;
                    }
                }

                return {
                    itemId: si._id,
                    itemName: si.name,
                    unit: si.unit || si.yieldUnit || 'шт',
                    theoreticalQty: bal ? bal.quantity : 0,
                    actualQty: draftItem ? draftItem.actualQty : (bal ? bal.quantity : 0),
                    cost: cost
                };
            });

            setItems(merged);
            setIsStarted(true);
            setShowHistory(false);
            toast.success('Чернетку відновлено');
        } catch (e) {
            toast.error('Помилка відновлення');
        } finally {
            setLoading(false);
            setRestoreConfirmOpen(false);
        }
    }

    return (
        <div className={`${styles.card} glass-panel animate-enter`}>
            <ConfirmModal
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={submitInventory}
                title="Завершити інвентаризацію?"
                message="Попередні періоди будуть заблоковані для редагування документів на цьому складі. Бажаєте продовжити?"
            />
            <ConfirmModal
                isOpen={restoreConfirmOpen}
                onClose={() => setRestoreConfirmOpen(false)}
                onConfirm={restoreDraft}
                title="Відновити чернетку?"
                message={`Знайдено збережену чернетку від ${draftData ? new Date(draftData.date).toLocaleDateString() : ''}. Бажаєте продовжити роботу з попереднього місця?`}
                confirmText="Так, відновити"
                cancelText="Ні, почати заново"
            />
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>
                        {selectedHistory ? `Деталі інвентаризації від ${new Date(selectedHistory.date).toLocaleDateString()}` : 'Інвентаризація'}
                    </h2>
                    <span className={styles.badge}>
                        {selectedHistory ? (warehouses.find(w => w._id === selectedHistory.warehouseId)?.name || 'Склад') : 'Перевірка та корегування залишків'}
                    </span>
                </div>
                <div className={styles.toolbarRight}>
                    {selectedHistory ? (
                        <>
                            <button className={styles.buttonSecondary} onClick={() => exportToExcel()}>
                                📊 Експорт Excel
                            </button>
                            <button className={styles.buttonSecondary} onClick={handleBackToHistory}>
                                Назад до списку
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={styles.buttonSecondary} onClick={() => setShowHistory(!showHistory)}>
                                {showHistory ? 'Нова інвентаризація' : 'Історія'}
                            </button>
                            {!showHistory && !isStarted && (
                                <button className={styles.buttonPrimary} onClick={startInventory} disabled={loading}>
                                    {loading ? 'Завантаження...' : 'Почати'}
                                </button>
                            )}
                            {isStarted && (
                                <>
                                    <button className={styles.buttonSecondary} onClick={() => exportToExcel()} disabled={loading} style={{ marginRight: '12px' }}>
                                        📊 Експорт Excel
                                    </button>
                                    <button className={styles.buttonSecondary} onClick={saveDraft} disabled={loading} style={{ marginRight: '12px' }}>
                                        Зберегти чернетку
                                    </button>
                                    <button className={styles.buttonPrimary} onClick={() => setConfirmOpen(true)}>
                                        Провести інвентаризацію
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showHistory ? (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('date')} style={{ cursor: 'pointer' }}>Дата{getSortIndicator('date')}</th>
                                <th onClick={() => requestSort('warehouseName')} style={{ cursor: 'pointer' }}>Склад{getSortIndicator('warehouseName')}</th>
                                <th onClick={() => requestSort('description')} style={{ cursor: 'pointer' }}>Опис{getSortIndicator('description')}</th>
                                <th onClick={() => requestSort('itemsCount')} style={{ cursor: 'pointer' }}>Позицій з відхиленням{getSortIndicator('itemsCount')}</th>
                                <th>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedData(histories.map(h => ({ ...h, itemsCount: h.items?.length || 0 }))).map(h => (
                                <tr key={h._id}>
                                    <td>{new Date(h.date).toLocaleDateString()}</td>
                                    <td>{warehouses.find(w => w._id === h.warehouseId)?.name || h.warehouseId}</td>
                                    <td>{h.description}</td>
                                    <td>{h.items?.length || 0}</td>
                                    <td>
                                        <button
                                            className={styles.actionButton}
                                            title="Переглянути"
                                            onClick={() => handleViewHistory(h)}
                                        >
                                            👁
                                        </button>
                                        <button
                                            className={styles.actionButton}
                                            title="Експорт Excel"
                                            onClick={() => exportToExcel(h)}
                                            style={{ marginLeft: '8px' }}
                                        >
                                            📊
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {histories.length === 0 && (
                                <tr><td colSpan={5} className={styles.noData}>Історія порожня</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : selectedHistory ? (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('itemName')} style={{ cursor: 'pointer' }}>Назва{getSortIndicator('itemName')}</th>
                                <th onClick={() => requestSort('theoreticalQty')} style={{ cursor: 'pointer' }}>Облік{getSortIndicator('theoreticalQty')}</th>
                                <th onClick={() => requestSort('actualQty')} style={{ cursor: 'pointer' }}>Факт{getSortIndicator('actualQty')}</th>
                                <th onClick={() => requestSort('qty')} style={{ cursor: 'pointer' }}>Різниця{getSortIndicator('qty')}</th>
                                <th>Од. вим.</th>
                                <th onClick={() => requestSort('cost')} style={{ cursor: 'pointer' }}>Собівартість (од){getSortIndicator('cost')}</th>
                                <th>Сума розбіжності</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedData(selectedHistory.items).map((item: any) => {
                                const delta = item.qty;
                                const diffSum = delta * item.cost;
                                return (
                                    <tr key={item.itemId}>
                                        <td>{item.itemName}</td>
                                        <td>{item.theoreticalQty?.toFixed(3) || '—'}</td>
                                        <td>{item.actualQty?.toFixed(3) || '—'}</td>
                                        <td style={{
                                            color: delta > 0 ? 'var(--success-text)' : delta < 0 ? 'var(--error-text)' : 'inherit',
                                            fontWeight: '700',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: delta > 0 ? 'var(--success-bg)' : delta < 0 ? 'var(--error-bg)' : 'transparent'
                                        }}>
                                            {delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                                        </td>
                                        <td>{item.unit}</td>
                                        <td>{item.cost?.toFixed(2)}</td>
                                        <td>{diffSum.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className={styles.totalRow}>
                                <td colSpan={6} className={styles.totalLabel}>Загальна сума розбіжностей:</td>
                                <td style={{
                                    color: selectedHistory.items.reduce((s: number, i: any) => s + (i.qty * i.cost), 0) > 0 ? 'green' :
                                        selectedHistory.items.reduce((s: number, i: any) => s + (i.qty * i.cost), 0) < 0 ? 'red' : 'inherit',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedHistory.items.reduce((s: number, i: any) => s + (i.qty * i.cost), 0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : !isStarted ? (
                <div className={styles.formGrid} style={{ maxWidth: '500px' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Склад</label>
                        <select className={styles.select} value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Тип об'єктів</label>
                        <select className={styles.select} value={inventoryType} onChange={e => setInventoryType(e.target.value)}>
                            <option value="ingredient">Інгредієнти</option>
                            <option value="product">Товари</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Дата інвентаризації</label>
                        <input type="date" className={styles.input} value={inventoryDate} onChange={e => setInventoryDate(e.target.value)} />
                    </div>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('itemName')} style={{ cursor: 'pointer' }}>Назва{getSortIndicator('itemName')}</th>
                                <th onClick={() => requestSort('theoreticalQty')} style={{ cursor: 'pointer' }}>Облік{getSortIndicator('theoreticalQty')}</th>
                                <th onClick={() => requestSort('actualQty')} style={{ cursor: 'pointer' }}>Факт{getSortIndicator('actualQty')}</th>
                                <th>Різниця</th>
                                <th>Од. вим.</th>
                                <th onClick={() => requestSort('cost')} style={{ cursor: 'pointer' }}>Собівартість (од){getSortIndicator('cost')}</th>
                                <th>Сума розбіжності</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedData(items).map(item => {
                                const delta = item.actualQty - item.theoreticalQty;
                                const diffSum = delta * item.cost;
                                return (
                                    <tr key={item.itemId} style={Math.abs(delta) > 0 ? { backgroundColor: '#fff5f5' } : {}}>
                                        <td>{item.itemName}</td>
                                        <td>{item.theoreticalQty.toFixed(3)}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                style={{ width: '100px', padding: '4px' }}
                                                value={item.actualQty}
                                                onChange={e => updateActualQty(item.itemId, e.target.value)}
                                            />
                                        </td>
                                        <td style={{ color: delta > 0 ? 'green' : delta < 0 ? 'red' : 'inherit', fontWeight: 'bold' }}>
                                            {delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                                        </td>
                                        <td>{item.unit}</td>
                                        <td>{item.cost.toFixed(2)}</td>
                                        <td>{diffSum.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className={styles.totalRow}>
                                <td colSpan={6} className={styles.totalLabel}>Загальна сума розбіжностей:</td>
                                <td style={{
                                    color: items.reduce((s, i) => s + (i.actualQty - i.theoreticalQty) * i.cost, 0) > 0 ? 'green' :
                                        items.reduce((s, i) => s + (i.actualQty - i.theoreticalQty) * i.cost, 0) < 0 ? 'red' : 'inherit',
                                    fontWeight: 'bold'
                                }}>
                                    {items.reduce((s, i) => s + (i.actualQty - i.theoreticalQty) * i.cost, 0).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
