
import styles from './StockSection.module.css';
import { useToast } from '../../ui/ToastContext';
import { useEffect, useState } from 'react';

interface Warehouse { _id: string; name: string; }
interface MoveItem {
    id: string;
    itemId: string;
    itemName: string;
    qty: number;
    unit: string;
}

interface MoveRecord {
    _id: string;
    date: string;
    warehouseId: string;
    toWarehouseId: string;
    description: string;
    items: any[];
    isDeleted?: boolean;
}

export function StockMovements() {
    const toast = useToast();
    const [mode, setMode] = useState<'list' | 'trash'>('list');
    const [showModal, setShowModal] = useState(false);

    const [movements, setMovements] = useState<MoveRecord[]>([]);
    const [deletedMovements, setDeletedMovements] = useState<MoveRecord[]>([]);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Form
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: '',
        toWarehouseId: '',
        description: ''
    });

    const [items, setItems] = useState<MoveItem[]>([]);
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        fetchWarehouses();
        fetchIngredients();
        fetchMovements();
    }, []);

    useEffect(() => {
        if (mode === 'trash') {
            fetchDeletedMovements();
        } else {
            fetchMovements();
        }
    }, [mode]);

    useEffect(() => {
        if (ingredientSearch.length > 1) {
            const results = ingredients.filter(i =>
                i.name.toLowerCase().includes(ingredientSearch.toLowerCase())
            );
            setSearchResults(results.slice(0, 10));
        } else {
            setSearchResults([]);
        }
    }, [ingredientSearch, ingredients]);

    // Fetching
    const fetchMovements = async () => {
        const res = await fetch('/api/accounting/stock/movements?type=move');
        const data = await res.json();
        if (data.data) setMovements(data.data);
    };

    const fetchDeletedMovements = async () => {
        const res = await fetch('/api/accounting/stock/movements?type=move&isDeleted=true');
        const data = await res.json();
        if (data.data) setDeletedMovements(data.data);
    };

    const fetchWarehouses = async () => {
        const res = await fetch('/api/accounting/stock/warehouses');
        const data = await res.json();
        if (data.data) setWarehouses(data.data);
    };

    const fetchIngredients = async () => {
        const res = await fetch('/api/accounting/ingredients');
        const data = await res.json();
        if (data.data) setIngredients(data.data);
    };

    const getName = (list: any[], id: string) => list.find(i => i._id === id)?.name || 'Unknown';

    // Actions
    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (rec: MoveRecord) => {
        setFormData({
            date: new Date(rec.date).toISOString().split('T')[0],
            fromWarehouseId: rec.warehouseId,
            toWarehouseId: rec.toWarehouseId,
            description: rec.description
        });
        setItems(rec.items.map((i: any) => ({
            id: Math.random().toString(36),
            itemId: i.itemId,
            itemName: i.itemName,
            qty: i.qty,
            unit: i.unit
        })));
        setEditingId(rec._id);
        setShowModal(true);
    };

    const addItem = (ingredient: any) => {
        setItems([...items, {
            id: Math.random().toString(36),
            itemId: ingredient._id,
            itemName: ingredient.name,
            qty: 0,
            unit: ingredient.unit
        }]);
        setIngredientSearch('');
        setSearchResults([]);
    };

    const updateItem = (id: string, field: keyof MoveItem, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fromWarehouseId || !formData.toWarehouseId || items.length === 0) {
            toast.error("Заповніть склади та додайте товари");
            return;
        }
        if (formData.fromWarehouseId === formData.toWarehouseId) {
            toast.error("Склади повинні бути різними");
            return;
        }

        const body = {
            type: 'move',
            date: formData.date,
            warehouseId: formData.fromWarehouseId,
            toWarehouseId: formData.toWarehouseId,
            items: items.map(i => ({
                itemId: i.itemId,
                itemName: i.itemName,
                qty: Number(i.qty),
                cost: 0,
                unit: i.unit
            })),
            totalCost: 0,
            description: formData.description
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
                toast.success(editingId ? 'Переміщення оновлено!' : 'Переміщення виконано!');
                resetForm();
                setShowModal(false);
                fetchMovements();
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
        if (!confirm('Видалити це переміщення? Залишки будуть повернуті.')) return;
        try {
            const res = await fetch(`/api/accounting/stock/movements?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchMovements();
        } catch (e) { console.error(e); }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Відновити це переміщення?')) return;
        try {
            const res = await fetch(`/api/accounting/stock/movements?id=${id}&restore=true`, { method: 'DELETE' });
            if (res.ok) fetchDeletedMovements();
        } catch (e) { console.error(e); }
    };

    const resetForm = () => {
        setItems([]);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            fromWarehouseId: '',
            toWarehouseId: '',
            description: ''
        });
        setEditingId(null);
    };

    // Filtering
    const filterList = (list: MoveRecord[]) => {
        if (!searchTerm) return list;
        const lower = searchTerm.toLowerCase();
        return list.filter(s => {
            const fromName = getName(warehouses, s.warehouseId).toLowerCase();
            const toName = getName(warehouses, s.toWarehouseId).toLowerCase();
            const itemName = s.items.map((i: any) => i.itemName.toLowerCase()).join(' ');
            return fromName.includes(lower) || toName.includes(lower) || itemName.includes(lower);
        });
    };

    const displayedList = filterList(mode === 'list' ? movements : deletedMovements);

    return (
        <section className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>{mode === 'list' ? 'Внутрішнє переміщення' : 'Кошик переміщень'}</h2>
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
                            >
                                🗑️ Кошик
                            </button>
                            <button
                                className={styles.buttonPrimary}
                                onClick={openCreateModal}
                            >
                                + Нове переміщення
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
                            <th>Звідки</th>
                            <th>Куди</th>
                            <th>Товари</th>
                            <th>Коментар</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedList.length > 0 ? displayedList.map(rec => (
                            <tr key={rec._id} style={{ opacity: mode === 'trash' ? 0.7 : 1 }}>
                                <td>{new Date(rec.date).toLocaleDateString()}</td>
                                <td>{getName(warehouses, rec.warehouseId)}</td>
                                <td>{getName(warehouses, rec.toWarehouseId)}</td>
                                <td>
                                    <div style={{ fontSize: '12px', color: '#555' }}>
                                        {rec.items.length > 0 ? `${rec.items[0].itemName} ${rec.items.length > 1 ? `(+${rec.items.length - 1})` : ''}` : '-'}
                                    </div>
                                </td>
                                <td>{rec.description}</td>
                                <td>
                                    {mode === 'list' ? (
                                        <>
                                            <button onClick={() => openEditModal(rec)} className={styles.actionButton}>✏️</button>
                                            <button onClick={() => handleDelete(rec._id)} className={styles.actionDelete} style={{ marginLeft: '8px' }}>🗑️</button>
                                        </>
                                    ) : (
                                        <button onClick={() => handleRestore(rec._id)} className={styles.actionButton}>♻️ Відновити</button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className={styles.noData}>{mode === 'list' ? 'Немає записів' : 'Кошик порожній'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '900px', width: '95%' }}>
                        <div className={styles.modalHeader}>
                            <h3>{editingId ? 'Редагування переміщення' : 'Нове переміщення'}</h3>
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
                                        <label className={styles.label}>Зі складу</label>
                                        <select
                                            value={formData.fromWarehouseId}
                                            onChange={e => setFormData({ ...formData, fromWarehouseId: e.target.value })}
                                            className={styles.select}
                                            required
                                        >
                                            <option value="">Оберіть склад</option>
                                            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>На склад</label>
                                        <select
                                            value={formData.toWarehouseId}
                                            onChange={e => setFormData({ ...formData, toWarehouseId: e.target.value })}
                                            className={styles.select}
                                            required
                                        >
                                            <option value="">Оберіть склад</option>
                                            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Коментар</label>
                                        <input
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <div className={styles.searchContainer}>
                                    <label className={styles.label}>Додати товар</label>
                                    <input
                                        value={ingredientSearch}
                                        onChange={e => setIngredientSearch(e.target.value)}
                                        className={styles.input}
                                        placeholder="Почніть вводити назву..."
                                    />
                                    {searchResults.length > 0 && (
                                        <div className={styles.searchResults}>
                                            {searchResults.map(item => (
                                                <div
                                                    key={item._id}
                                                    onClick={() => addItem(item)}
                                                    className={styles.searchItem}
                                                >
                                                    <span className={styles.searchItemName}>{item.name}</span>
                                                    <span className={styles.searchItemMeta}>{item.unit}</span>
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
                                                <th style={{ width: '150px' }}>Кількість</th>
                                                <th style={{ width: '100px' }}>Од.</th>
                                                <th style={{ width: '50px' }}></th>
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
                                                            style={{ padding: '6px' }}
                                                        />
                                                    </td>
                                                    <td>{item.unit}</td>
                                                    <td>
                                                        <button type="button" onClick={() => removeItem(item.id)} className={styles.actionDelete}>✕</button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className={styles.noData}>Товари не додано</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className={styles.bottomActions} style={{ marginTop: '20px' }}>
                                    <button type="submit" className={styles.buttonPrimary}>
                                        {editingId ? 'Оновити' : 'Зберегти'}
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
