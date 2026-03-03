
import styles from './StockSection.module.css';
import { useToast } from '../../ui/ToastContext';
import { useEffect, useState } from 'react';

interface Warehouse { _id: string; name: string; }
interface Supplier { _id: string; name: string; }
interface SupplyItem {
    id: string;
    itemId: string;
    itemName: string;
    qty: number;
    cost: number;
    unit: string;
}

interface SupplyRecord {
    _id: string;
    date: string;
    warehouseId: string;
    supplierId: string;
    totalCost: number;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    paidAmount: number;
    description: string;
    items: any[];
    isDeleted?: boolean;
}

export function StockSupply() {
    const toast = useToast();
    const [mode, setMode] = useState<'list' | 'trash'>('list');
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [supplies, setSupplies] = useState<SupplyRecord[]>([]);
    const [deletedSupplies, setDeletedSupplies] = useState<SupplyRecord[]>([]);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouseForSearch, setSelectedWarehouseForSearch] = useState<string>('');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        warehouseId: '',
        supplierId: '',
        description: '',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        paymentMethod: 'cash', // Added
        moneyAccountId: '' // Added
    });

    const [items, setItems] = useState<SupplyItem[]>([]);
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [lastPrices, setLastPrices] = useState<Record<string, { cost: number; date: string; supplierName: string }>>({});
    const [previousWarehouseId, setPreviousWarehouseId] = useState<string>('');

    useEffect(() => {
        fetchUserRole();
        fetchWarehouses();
        fetchSuppliers();
        fetchIngredients();
        fetchProducts();
        fetchSupplies();
        fetchAccounts();
    }, []);

    // Fetch current user role
    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.authenticated && data.user) {
                setUserRole(data.user.role);
            }
        } catch (e) {
            console.error('Failed to fetch user role:', e);
        }
    };

    useEffect(() => {
        if (!ingredientSearch.trim()) {
            setSearchResults([]);
            return;
        }
        const lower = ingredientSearch.toLowerCase();

        // Get all searchable items (EXCLUDE RECIPES - they are made from ingredients)
        let availableItems = [
            ...ingredients.map(i => ({ ...i, type: 'ingredient' })),
            ...products.map(p => ({ ...p, type: 'product' }))
        ];

        // FILTER by selected warehouse based on business logic:
        if (formData.warehouseId) {
            const selectedWarehouse = warehouses.find(w => w._id === formData.warehouseId);
            const warehouseName = selectedWarehouse?.name.toLowerCase() || '';

            // Check if this is an "Ingredients" warehouse
            const isIngredientsWarehouse = warehouseName.includes('інгредієнт') || 
                                          warehouseName.includes('ingredient') ||
                                          warehouseName.includes('склад') && warehouseName.includes('інгред');

            // Check if this is an "Entertainment" warehouse
            const isEntertainmentWarehouse = warehouseName.includes('розваж') || 
                                            warehouseName.includes('entertainment') ||
                                            warehouseName.includes('послуг');

            availableItems = availableItems.filter(item => {
                // For Ingredients warehouse: show only ingredients
                if (isIngredientsWarehouse) {
                    return item.type === 'ingredient';
                }

                // For Entertainment warehouse: show only products with "Розважальні послуги" category
                if (isEntertainmentWarehouse) {
                    return item.type === 'product' && 
                           (item.category === 'Розважальні послуги' || 
                            item.category?.toLowerCase().includes('розваж') ||
                            item.category?.toLowerCase().includes('entertainment'));
                }

                // For other warehouses: show products (excluding entertainment)
                return item.type === 'product' && 
                       item.category !== 'Розважальні послуги' &&
                       !item.category?.toLowerCase().includes('розваж');
            });
        }

        const filtered = availableItems.filter(item =>
            item.name.toLowerCase().includes(lower) ||
            (item.code && item.code.toLowerCase().includes(lower))
        );
        setSearchResults(filtered.slice(0, 20)); // Limit results
    }, [ingredientSearch, ingredients, products, formData.warehouseId, warehouses]);

    // Data Fetching
    const fetchSupplies = async () => {
        const res = await fetch('/api/accounting/stock/movements?type=supply');
        const data = await res.json();
        if (data.data) setSupplies(data.data);
    };

    const fetchDeletedSupplies = async () => {
        const res = await fetch('/api/accounting/stock/movements?type=supply&isDeleted=true');
        const data = await res.json();
        if (data.data) setDeletedSupplies(data.data);
    };

    const fetchWarehouses = async () => {
        const res = await fetch('/api/accounting/stock/warehouses');
        const data = await res.json();
        if (data.data) setWarehouses(data.data);
    };

    const fetchSuppliers = async () => {
        const res = await fetch('/api/accounting/stock/suppliers');
        const data = await res.json();
        if (data.data) setSuppliers(data.data);
    };

    const fetchIngredients = async () => {
        const res = await fetch('/api/accounting/ingredients');
        const data = await res.json();
        if (data.data) setIngredients(data.data);
    };

    const fetchProducts = async () => {
        const res = await fetch('/api/accounting/products');
        const data = await res.json();
        if (data.data) setProducts(data.data);
    };

    const fetchAccounts = async () => {
        const res = await fetch('/api/accounting/accounts');
        const data = await res.json();
        if (data.data) setAccounts(data.data);
    };

    const fetchLastPrices = async () => {
        try {
            const res = await fetch('/api/accounting/stock/last-prices');
            const data = await res.json();
            if (data.data) setLastPrices(data.data);
        } catch (e) { console.error('Failed to fetch last prices:', e); }
    };

    const getName = (list: any[], id: string) => list.find(i => i._id === id)?.name || 'Unknown';

    // --- Form Logic ---
    const openCreateModal = () => {
        resetForm();
        fetchLastPrices();
        setShowModal(true);
    };

    const openEditModal = (sup: SupplyRecord) => {
        // Для користувачів 'user' завжди встановлюємо готівку
        const cashAccount = userRole === 'user' ? accounts.find(acc => acc.type === 'cash') : null;

        setFormData({
            date: new Date(sup.date).toISOString().split('T')[0],
            warehouseId: sup.warehouseId,
            supplierId: sup.supplierId,
            description: sup.description,
            paymentStatus: sup.paymentStatus,
            paidAmount: sup.paidAmount,
            // @ts-ignore
            paymentMethod: userRole === 'user' ? 'cash' : (sup.paymentMethod || 'cash'),
            // @ts-ignore
            moneyAccountId: userRole === 'user' && cashAccount ? cashAccount.id : (sup.moneyAccountId || '')
        });
        setItems(sup.items.map((i: any) => ({
            id: Math.random().toString(36),
            itemId: i.itemId,
            itemName: i.itemName,
            qty: i.qty,
            cost: i.cost || 0,
            unit: i.unit
        })));
        setEditingId(sup._id);
        fetchLastPrices();
        setShowModal(true);
    };

    const addItem = (item: any) => {
        const itemId = item._id || item.id;
        const lastPrice = lastPrices[itemId];
        setItems([...items, {
            id: Math.random().toString(36),
            itemId,
            itemName: item.name,
            qty: 0,
            cost: lastPrice ? lastPrice.cost : (item.costPerUnit || 0),
            unit: item.unit || item.yieldUnit || 'шт'
        }]);
        setIngredientSearch('');
        setSearchResults([]);
    };

    const updateItem = (id: string, field: keyof SupplyItem | 'total', value: any) => {
        setItems(items.map(i => {
            if (i.id !== id) return i;

            if (field === 'total') {
                const total = parseFloat(value) || 0;
                const cost = i.qty > 0 ? total / i.qty : 0;
                return { ...i, cost };
            }

            const updated = { ...i, [field]: value };
            return updated;
        }));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const totalSum = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.cost)), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.warehouseId || !formData.supplierId || items.length === 0) {
            toast.error("Заповніть всі обов'язкові поля та додайте товари");
            return;
        }

        const body = {
            type: 'supply',
            date: formData.date,
            warehouseId: formData.warehouseId,
            supplierId: formData.supplierId,
            items: items.map(i => ({
                itemId: i.itemId,
                itemName: i.itemName,
                qty: Number(i.qty),
                cost: Number(i.cost),
                unit: i.unit
            })),
            totalCost: totalSum,
            description: formData.description,
            paymentStatus: formData.paymentStatus,
            paidAmount: formData.paymentStatus === 'paid' ? totalSum : Number(formData.paidAmount),
            paymentMethod: formData.paymentMethod, // Send to API
            moneyAccountId: formData.moneyAccountId // Send to API
        };

        try {
            const url = editingId
                ? `/api/accounting/stock/movements?id=${editingId}`
                : '/api/accounting/stock/movements';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(editingId ? 'Постачання оновлено!' : 'Постачання збережено!');
                resetForm();
                setShowModal(false);
                fetchSupplies();
            } else {
                const err = await res.json();
                toast.error('Помилка: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            toast.error('Помилка збереження');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Ви впевнені, що хочете видалити це постачання? Товари будуть списані.')) return;
        try {
            const res = await fetch(`/api/accounting/stock/movements?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchSupplies();
            }
        } catch (e) { console.error(e); }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Відновити це постачання? Товари будуть знову зараховані.')) return;
        try {
            const res = await fetch(`/api/accounting/stock/movements?id=${id}&restore=true`, { method: 'DELETE' });
            if (res.ok) {
                fetchDeletedSupplies();
            }
        } catch (e) { console.error(e); }
    };

    const resetForm = () => {
        setItems([]);

        // Для користувачів 'user' автоматично встановлюємо готівковий рахунок
        const cashAccount = userRole === 'user' ? accounts.find(acc => acc.type === 'cash') : null;

        setFormData({
            date: new Date().toISOString().split('T')[0],
            warehouseId: '',
            supplierId: '',
            description: '',
            paymentStatus: 'unpaid',
            paidAmount: 0,
            paymentMethod: 'cash',
            moneyAccountId: cashAccount?.id || ''
        });
        setEditingId(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ background: '#d4edda', color: '#155724' }}>Оплачено</span>;
            case 'partial': return <span className={styles.badge} style={{ background: '#fff3cd', color: '#856404' }}>Частково</span>;
            default: return <span className={styles.badge} style={{ background: '#f8d7da', color: '#721c24' }}>Не оплачено</span>;
        }
    };

    const filterList = (list: SupplyRecord[]) => {
        if (!searchTerm) return list;
        const lower = searchTerm.toLowerCase();
        return list.filter(s => {
            const supplierName = getName(suppliers, s.supplierId).toLowerCase();
            const itemName = s.items.map((i: any) => i.itemName.toLowerCase()).join(' ');
            const desc = s.description.toLowerCase();
            return supplierName.includes(lower) || itemName.includes(lower) || desc.includes(lower);
        });
    };

    const displayedSupplies = filterList(mode === 'list' ? supplies : deletedSupplies);

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>{mode === 'list' ? 'Постачання' : 'Кошик видалених постачань'}</h2>
                </div>
                <div className={styles.toolbarRight}>
                    <div className={styles.searchContainer} style={{ width: '250px', marginRight: '10px' }}>
                        <input
                            className={styles.input}
                            placeholder="Пошук..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {mode === 'list' ? (
                        <>
                            <button
                                className={styles.buttonSecondary}
                                onClick={() => setMode('trash')}
                                title="Кошик"
                            >
                                🗑️ Кошик
                            </button>
                            <button
                                className={styles.buttonPrimary}
                                onClick={openCreateModal}
                            >
                                + Нове постачання
                            </button>
                        </>
                    ) : (
                        <button
                            className={styles.buttonSecondary}
                            onClick={() => setMode('list')}
                        >
                            ← До списку
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Постачальник</th>
                            <th>Склад</th>
                            <th>Сума</th>
                            <th>Оплата</th>
                            <th>Коментар</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedSupplies.length > 0 ? displayedSupplies.map(sup => (
                            <tr key={sup._id} style={{ opacity: mode === 'trash' ? 0.7 : 1 }}>
                                <td>{new Date(sup.date).toLocaleDateString()}</td>
                                <td>{getName(suppliers, sup.supplierId)}</td>
                                <td>{getName(warehouses, sup.warehouseId)}</td>
                                <td>{sup.totalCost.toFixed(2)} ₴</td>
                                <td>{getStatusBadge(sup.paymentStatus)}</td>
                                <td>{sup.description}</td>
                                <td>
                                    {mode === 'list' ? (
                                        <>
                                            <button onClick={() => openEditModal(sup)} className={styles.actionButton} title="Редагувати">✏️</button>
                                            <button onClick={() => handleDelete(sup._id)} className={styles.actionDelete} title="Видалити" style={{ marginLeft: '8px' }}>🗑️</button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleRestore(sup._id)} className={styles.actionButton} title="Відновити">♻️ Відновити</button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className={styles.noData}>{mode === 'list' ? 'Немає записів' : 'Кошик порожній'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>{editingId ? 'Редагування постачання' : 'Нове постачання'}</h3>
                            <button onClick={() => setShowModal(false)} className={styles.closeButton}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <form onSubmit={handleSubmit}>
                                <div className={styles.formRow4}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Дата</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className={styles.input}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Склад (куди)</label>
                                        <select
                                            value={formData.warehouseId}
                                            onChange={e => {
                                                const newWarehouseId = e.target.value;
                                                
                                                // If warehouse changed and items already added, warn user
                                                if (formData.warehouseId && newWarehouseId && 
                                                    formData.warehouseId !== newWarehouseId && 
                                                    items.length > 0) {
                                                    const confirmed = confirm(
                                                        `⚠️ Увага! У вас є ${items.length} доданих позицій з іншого складу.\\n\\n` +
                                                        `При зміні складу всі додані товари будуть видалені.\\n\\n` +
                                                        `Продовжити?`
                                                    );
                                                    
                                                    if (!confirmed) {
                                                        return; // Cancel warehouse change
                                                    }
                                                    
                                                    // Clear items if user confirms
                                                    setItems([]);
                                                    toast.success('Позиції видалено через зміну складу');
                                                }
                                                
                                                setFormData({ ...formData, warehouseId: newWarehouseId });
                                                setPreviousWarehouseId(formData.warehouseId);
                                            }}
                                            className={styles.select}
                                            required
                                        >
                                            <option value="">Оберіть склад</option>
                                            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                        </select>
                                        {/* {items.length > 0 && (
                                            <div style={{
                                                fontSize: '11px',
                                                color: '#f59e0b',
                                                marginTop: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <span>⚠️</span>
                                                <span>Додано {items.length} поз. Зміна складу видалить їх</span>
                                            </div>
                                        )} */}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Постачальник</label>
                                        <select
                                            value={formData.supplierId}
                                            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                            className={styles.select}
                                            required
                                        >
                                            <option value="">Оберіть постачальника</option>
                                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Коментар</label>
                                        <input
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className={styles.input}
                                            placeholder="Номер накладної"
                                        />
                                    </div>
                                </div>

                                {/* Payment Control */}
                                <div className={styles.paymentSection}>
                                    <div className={styles.paymentHeader}>Оплата постачання</div>
                                    {userRole === 'user' && (
                                        <div style={{
                                            background: '#fef3c7',
                                            border: '1px solid #fbbf24',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            marginBottom: '12px',
                                            fontSize: '13px',
                                            color: '#92400e',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ fontSize: '16px' }}>ℹ️</span>
                                            <span>Доступна лише оплата готівкою з готівкового рахунку</span>
                                        </div>
                                    )}
                                    <div className={styles.formRow3} style={{ alignItems: 'flex-end', gap: '15px' }}>
                                        <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                            <label className={styles.label}>Статус оплати</label>
                                            <select
                                                value={formData.paymentStatus}
                                                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                                                className={styles.select}
                                            >
                                                <option value="unpaid">Не оплачено</option>
                                                <option value="paid">Оплачено повністю</option>
                                                <option value="partial">Часткова оплата</option>
                                            </select>
                                        </div>
                                        {formData.paymentStatus !== 'unpaid' && (
                                            <>
                                                {formData.paymentStatus === 'partial' && (
                                                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                                        <label className={styles.label}>Сплачена сума</label>
                                                        <input
                                                            type="number"
                                                            value={formData.paidAmount}
                                                            onChange={e => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) })}
                                                            className={styles.input}
                                                        />
                                                    </div>
                                                )}
                                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                                    <label className={styles.label}>Метод оплати</label>
                                                    <select
                                                        value={formData.paymentMethod}
                                                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                                        className={styles.select}
                                                        disabled={userRole === 'user'}
                                                    >
                                                        <option value="cash">Готівка</option>
                                                        {userRole !== 'user' && (
                                                            <>
                                                                <option value="card">Карта</option>
                                                                <option value="bank">Банк</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                                    <label className={styles.label}>З рахунку (опційно)</label>
                                                    <select
                                                        value={formData.moneyAccountId}
                                                        onChange={e => setFormData({ ...formData, moneyAccountId: e.target.value })}
                                                        className={styles.select}
                                                        disabled={userRole === 'user'}
                                                    >
                                                        <option value="">Авто-вибір (Налаштування)</option>
                                                        {accounts
                                                            .filter(acc => {
                                                                // Для user role - лише готівкові рахунки
                                                                if (userRole === 'user') {
                                                                    return acc.id === '6962aee8bc8c74cda983c828';
                                                                }
                                                                return true;
                                                            })
                                                            .map(acc => (
                                                                <option key={acc.id} value={acc.id}>
                                                                    {acc.name} ({acc.currency})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.searchContainer}>
                                    <label className={styles.label}> Додати товар</label>
                                    {formData.warehouseId && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#059669',
                                            background: '#d1fae5',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span>✅</span>
                                            <span>
                                                Склад: <strong>{warehouses.find(w => w._id === formData.warehouseId)?.name}</strong>
                                                {(() => {
                                                    const whName = warehouses.find(w => w._id === formData.warehouseId)?.name.toLowerCase() || '';
                                                    if (whName.includes('інгред') || whName.includes('ingredient')) {
                                                        return <span> • Тільки інгредієнти</span>;
                                                    } else if (whName.includes('розваж') || whName.includes('entertainment')) {
                                                        return <span> • Тільки розважальні послуги</span>;
                                                    } else {
                                                        return <span> • Тільки товари</span>;
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                    )}
                                    {!formData.warehouseId && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#dc2626',
                                            background: '#fee2e2',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span>⚠️</span>
                                            <span>Оберіть склад для фільтрації товарів</span>
                                        </div>
                                    )}
                                    <input
                                        value={ingredientSearch}
                                        onChange={e => setIngredientSearch(e.target.value)}
                                        className={styles.input}
                                        placeholder="Почніть вводити назву або код..."
                                        autoComplete="off"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className={styles.searchResults}>
                                            {searchResults.map(item => (
                                                <div
                                                    key={item._id || item.id}
                                                    onClick={() => addItem(item)}
                                                    className={styles.searchItem}
                                                    style={{ display: 'flex', justifyContent: 'space-between' }}
                                                >
                                                    <span>{item.name} <small style={{ color: '#666' }}>({item.unit || item.yieldUnit || 'шт'})</small></span>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        background: '#eee',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {item.type === 'product' ? 'Товар' : item.type === 'recipe' ? 'ТК' : 'Інгредієнт'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.tableContainer} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table className={styles.table}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                                            <tr>
                                                <th>Товар</th>
                                                <th style={{ width: '120px' }}>К-сть</th>
                                                <th style={{ width: '60px' }}>Од.</th>
                                                <th style={{ width: '120px' }}>Ціна</th>
                                                <th style={{ width: '120px' }}>Сума</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.length > 0 ? items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.itemName}</td>
                                                    <td>
                                                        <input
                                                            type="number" step="0.001"
                                                            value={item.qty}
                                                            onChange={e => updateItem(item.id, 'qty', e.target.value)}
                                                            className={styles.input}
                                                            style={{ padding: '4px' }}
                                                        />
                                                    </td>
                                                    <td>{item.unit}</td>
                                                    <td>
                                                        <input
                                                            type="number" step="0.01"
                                                            value={item.cost}
                                                            onChange={e => updateItem(item.id, 'cost', e.target.value)}
                                                            className={styles.input}
                                                            style={{ padding: '4px' }}
                                                        />
                                                        {lastPrices[item.itemId] && (() => {
                                                            const last = lastPrices[item.itemId];
                                                            const currentCost = Number(item.cost);
                                                            const diff = currentCost - last.cost;
                                                            const isSame = Math.abs(diff) < 0.01;
                                                            const color = isSame ? '#22c55e' : diff > 0 ? '#ef4444' : '#f59e0b';
                                                            const arrow = isSame ? '' : diff > 0 ? '↑' : '↓';
                                                            return (
                                                                <div style={{ fontSize: '11px', color, marginTop: '2px', lineHeight: 1.2 }}>
                                                                    {arrow} Остання: {last.cost.toFixed(2)} ₴
                                                                    {last.supplierName && <span style={{ color: '#9ca3af', marginLeft: '4px' }}>({last.supplierName})</span>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number" step="0.01"
                                                            value={(Number(item.qty) * Number(item.cost)).toFixed(2)}
                                                            onChange={e => updateItem(item.id, 'total', e.target.value)}
                                                            className={styles.input}
                                                            style={{ padding: '4px' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button type="button" onClick={() => removeItem(item.id)} className={styles.actionDelete}>✕</button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={6} className={styles.noData} style={{ padding: '20px' }}>Товари не додано</td></tr>
                                            )}
                                            <tr className={styles.totalRow}>
                                                <td colSpan={4} className={styles.totalLabel}>Разом:</td>
                                                <td>{totalSum.toFixed(2)} ₴</td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className={styles.bottomActions}>
                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                                        Загальна сума: <span style={{ color: '#3b82f6' }}>{totalSum.toFixed(2)} ₴</span>
                                    </div>
                                    <button type="submit" className={styles.buttonPrimary}>
                                        {editingId ? '⚡ Оновити' : '✅ Зберегти'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
