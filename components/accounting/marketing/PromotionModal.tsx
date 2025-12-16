import React, { useState, useEffect } from 'react';
import styles from './PromotionModal.module.css';
import { Promotion, PromotionCondition, PromotionResult } from '../../../types/marketing';

interface PromotionModalProps {
    promotion?: Promotion;
    onClose: () => void;
    onSave: (promotion: Promotion) => void;
}

const defaultCondition: PromotionCondition = {
    type: 'category', // Default, will change on selection
    value: 1,
    operator: 'gte',
    unit: 'qty',
    targetIds: [],
    targetNames: []
};

// Simple types for search
interface SearchItem {
    id: string;
    name: string;
    type: 'product' | 'category';
}

export function PromotionModal({ promotion, onClose, onSave }: PromotionModalProps) {
    const [name, setName] = useState(promotion?.name || '');
    const [startDate, setStartDate] = useState(promotion?.startDate || '');
    const [endDate, setEndDate] = useState(promotion?.endDate || '');
    const [venuesMode, setVenuesMode] = useState<'all' | 'selected'>(promotion?.venues === 'all' ? 'all' : 'selected');

    // Settings
    const [earnBonuses, setEarnBonuses] = useState(promotion?.earnBonuses || false);
    const [autoApply, setAutoApply] = useState(promotion?.autoApply || false);

    // Conditions
    const [conditions, setConditions] = useState<PromotionCondition[]>(promotion?.conditions || [defaultCondition]);

    // Schedule
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(promotion?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]);
    const [timeStart, setTimeStart] = useState(promotion?.timeStart || '00:00');
    const [timeEnd, setTimeEnd] = useState(promotion?.timeEnd || '23:59');

    // Audience
    const [audience, setAudience] = useState<'all' | 'registered'>(promotion?.audience === 'all' ? 'all' : 'all'); // Defaulting to all for now

    // Result
    const [resultType, setResultType] = useState<PromotionResult['type']>(promotion?.result?.type || 'percent_discount');
    const [resultValue, setResultValue] = useState(promotion?.result?.value || 10);

    // Search Data
    const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // UI State for dropdowns
    // activeSearchIndex: which condition row is currently searching
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [catsRes, prodsRes] = await Promise.all([
                fetch('/api/accounting/categories'),
                fetch('/api/accounting/products')
            ]);
            const catsData = await catsRes.json();
            const prodsData = await prodsRes.json();

            const items: SearchItem[] = [];
            if (catsData.success) {
                items.push(...catsData.data.map((c: any) => ({ id: c._id || c.id, name: c.name, type: 'category' })));
            }
            if (prodsData.success) {
                items.push(...prodsData.data.map((p: any) => ({ id: p._id || p.id, name: p.name, type: 'product' })));
            }
            setSearchItems(items);
        } catch (e) {
            console.error("Failed to fetch search data", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSave = () => {
        const newPromotion: Promotion = {
            ...promotion,
            name,
            startDate,
            endDate,
            venues: venuesMode === 'all' ? 'all' : [], // TODO: Venue selection
            earnBonuses,
            autoApply,
            conditions,
            daysOfWeek,
            timeStart,
            timeEnd,
            audience,
            result: {
                type: resultType,
                value: Number(resultValue)
            },
            isActive: true
        };
        onSave(newPromotion);
    };

    const toggleDay = (day: number) => {
        if (daysOfWeek.includes(day)) {
            setDaysOfWeek(daysOfWeek.filter(d => d !== day));
        } else {
            setDaysOfWeek([...daysOfWeek, day]);
        }
    };

    const days = [
        { id: 1, label: 'Пн' },
        { id: 2, label: 'Вт' },
        { id: 3, label: 'Ср' },
        { id: 4, label: 'Чт' },
        { id: 5, label: 'Пт' },
        { id: 6, label: 'Сб' },
        { id: 0, label: 'Нд' },
    ];

    // Filter items based on query
    const filteredItems = searchItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectItem = (index: number, item: SearchItem) => {
        const newConds = [...conditions];
        newConds[index].type = item.type; // 'product' or 'category'
        newConds[index].targetIds = [item.id];
        newConds[index].targetNames = [item.name];
        setConditions(newConds);
        setActiveSearchIndex(null);
        setSearchQuery('');
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{promotion ? 'Редагування акції' : 'Створення акції'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.row}>
                            <label className={styles.label}>Назва</label>
                            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Наприклад: Знижка -10%" />
                        </div>
                        <div className={styles.row}>
                            <label className={styles.label}>Дата початку акції</label>
                            <input className={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className={styles.row}>
                            <label className={styles.label}>Дата закінчення акції</label>
                            <input className={styles.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className={styles.row}>
                            <label className={styles.label}>Спрацьовує в закладах</label>
                            <div className={styles.venueButtons}>
                                <button className={`${styles.venueBtn} ${venuesMode === 'all' ? styles.active : ''}`} onClick={() => setVenuesMode('all')}>у всіх закладах</button>
                                <button className={`${styles.venueBtn} ${venuesMode === 'selected' ? styles.active : ''}`} onClick={() => setVenuesMode('selected')}>в обраних закладах</button>
                            </div>
                        </div>

                        <div className={styles.checkboxRow}>
                            <label>
                                <input type="checkbox" checked={earnBonuses} onChange={e => setEarnBonuses(e.target.checked)} />
                                Нараховувати бонуси на товари з умов акції
                            </label>
                        </div>
                        <div className={styles.checkboxRow}>
                            <label>
                                <input type="checkbox" checked={autoApply} onChange={e => setAutoApply(e.target.checked)} />
                                Застосовувати акцію автоматично
                            </label>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Умови акції</h3>

                        <div className={styles.row} style={{ alignItems: 'flex-start' }}>
                            <label className={styles.label} style={{ paddingTop: '8px' }}>Категорії та товари</label>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 30px', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                    <div>Що потрібно замовити?</div>
                                    <div>умова</div>
                                    <div>скільки?</div>
                                    <div>од. вим.</div>
                                    <div></div>
                                </div>
                                {conditions.map((cond, idx) => (
                                    <div key={idx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 30px', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>

                                        {/* Search / Input Area */}
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className={styles.input}
                                                placeholder={activeSearchIndex === idx ? "Пошук..." : "Всі товари / Категорія..."}
                                                value={activeSearchIndex === idx ? searchQuery : (cond.targetNames?.[0] || '')}
                                                onFocus={() => {
                                                    setActiveSearchIndex(idx);
                                                    setSearchQuery('');
                                                }}
                                                onChange={(e) => {
                                                    if (activeSearchIndex === idx) {
                                                        setSearchQuery(e.target.value);
                                                    }
                                                }}
                                            />
                                            {/* Dropdown */}
                                            {activeSearchIndex === idx && (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                                    background: 'white', border: '1px solid #d1d5db', borderRadius: '4px',
                                                    maxHeight: '200px', overflowY: 'auto', zIndex: 10,
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}>
                                                    {filteredItems.length > 0 ? filteredItems.map(item => (
                                                        <div
                                                            key={item.id + item.type}
                                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '0.9rem' }}
                                                            onMouseDown={() => handleSelectItem(idx, item)}
                                                            className={styles.dropdownItem}
                                                        >
                                                            <span style={{ fontWeight: 600, color: item.type === 'category' ? '#3b82f6' : '#10b981', marginRight: '8px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                                                {item.type === 'category' ? 'Кат' : 'Тов'}
                                                            </span>
                                                            {item.name}
                                                        </div>
                                                    )) : (
                                                        <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '0.9rem' }}>Нічого не знайдено</div>
                                                    )}
                                                    {/* Close dropdown overlay logic handled by blur, or explicit close? 
                                                        Blur is tricky with click. Using onMouseDown on item helps. 
                                                        Clicking outside is simpler with a global listener or backdrop, but strict focus is okay for now.
                                                    */}
                                                </div>
                                            )}
                                            {activeSearchIndex === idx && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setActiveSearchIndex(null)} />}
                                        </div>

                                        <select className={styles.select}>
                                            <option>не менше</option>
                                            <option>дорівнює</option>
                                        </select>
                                        <input className={styles.input} type="number" value={cond.value} onChange={(e) => {
                                            const newConds = [...conditions];
                                            newConds[idx].value = Number(e.target.value);
                                            setConditions(newConds);
                                        }} />
                                        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                                            <button style={{ padding: '0.5rem', border: 'none', background: cond.unit === 'qty' ? '#e5e7eb' : 'white', cursor: 'pointer' }} onClick={() => {
                                                const newConds = [...conditions];
                                                newConds[idx].unit = 'qty';
                                                setConditions(newConds);
                                            }}>шт.</button>
                                            <button style={{ padding: '0.5rem', border: 'none', background: cond.unit === 'uah' ? '#e5e7eb' : 'white', cursor: 'pointer' }} onClick={() => {
                                                const newConds = [...conditions];
                                                newConds[idx].unit = 'uah';
                                                setConditions(newConds);
                                            }}>₴</button>
                                        </div>
                                        <button className={styles.removeBtn} onClick={() => {
                                            setConditions(conditions.filter((_, i) => i !== idx));
                                        }}>×</button>
                                    </div>
                                ))}
                                <button style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => setConditions([...conditions, defaultCondition])}>
                                    + Додати умову
                                </button>
                            </div>
                        </div>

                        <div className={styles.row}>
                            <label className={styles.label}>Дні роботи акції</label>
                            <div className={styles.daysRow}>
                                {days.map(d => (
                                    <label key={d.id} className={styles.dayCheckbox}>
                                        <input type="checkbox" checked={daysOfWeek.includes(d.id)} onChange={() => toggleDay(d.id)} />
                                        {d.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={styles.row}>
                            <label className={styles.label}>Час роботи акції</label>
                            <div className={styles.timeRange}>
                                <input type="time" className={styles.input} value={timeStart} onChange={e => setTimeStart(e.target.value)} style={{ width: '100px', flex: 'none' }} />
                                <span>—</span>
                                <input type="time" className={styles.input} value={timeEnd} onChange={e => setTimeEnd(e.target.value)} style={{ width: '100px', flex: 'none' }} />
                            </div>
                        </div>

                        <div className={styles.row}>
                            <label className={styles.label}>Учасники акції</label>
                            <select className={styles.select} value={audience} onChange={e => setAudience(e.target.value as any)}>
                                <option value="all">усі відвідувачі</option>
                                <option value="registered">зареєстровані клієнти</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Результат акції</h3>
                        <div className={styles.row}>
                            <label className={styles.label}>Що у результаті отримує клієнт?</label>
                            <select className={styles.select} value={resultType} onChange={e => setResultType(e.target.value as any)}>
                                <option value="percent_discount">відсоток знижки на акційні товари</option>
                                <option value="fixed_discount">фіксована знижка на чек</option>
                                <option value="bonus">бонуси на рахунок</option>
                            </select>
                        </div>
                        <div className={styles.row}>
                            <label className={styles.label}>
                                {resultType === 'percent_discount' ? 'Відсоток знижки' : resultType === 'fixed_discount' ? 'Сума знижки' : 'Кількість бонусів'}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', width: '200px' }}>
                                <input className={styles.input} type="number" value={resultValue} onChange={e => setResultValue(Number(e.target.value))} />
                                <span style={{ marginLeft: '10px', color: '#6b7280' }}>
                                    {resultType === 'percent_discount' ? '%' : '₴'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.saveButton} onClick={handleSave}>Зберегти</button>
                </div>
            </div>
        </div>
    );
}
