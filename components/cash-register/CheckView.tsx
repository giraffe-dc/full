import React, { useState, useMemo } from 'react';
import { Service, Check, CartItem, ServiceCategory } from '../../types/cash-register';
import styles from './CheckView.module.css';
import { ClientSelectorModal } from './ClientSelectorModal';

interface CheckViewProps {
    check: Check;
    products: Service[];
    onUpdateCheck: (check: Check) => void;
    onBack: () => void;
    onPay: () => void;
}

export function CheckView({ check, products, onUpdateCheck, onBack, onPay }: CheckViewProps) {
    const [selectedGuestId, setSelectedGuestId] = useState<string>('guest-1');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showClientModal, setShowClientModal] = useState(false);

    // --- Logic ---

    const guests = useMemo(() => {
        // Extract unique guest IDs from items, plus "guest-1" default
        const uniqueGuests = new Set(check.items.map(i => i.guestId || 'guest-1'));
        uniqueGuests.add('guest-1');
        return Array.from(uniqueGuests).sort();
    }, [check.items]);

    const addToCart = (product: Service) => {
        const existingItem = check.items.find(
            item => item.productId === product.id && (item.guestId || 'guest-1') === selectedGuestId
        );

        let newItems: CartItem[];

        if (existingItem) {
            newItems = check.items.map(item =>
                item === existingItem
                    ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
                    : item
            );
        } else {
            newItems = [...check.items, {
                serviceId: `item-${Date.now()}`,
                productId: product.id,
                serviceName: product.name,
                category: product.category,
                price: product.price,
                quantity: 1,
                subtotal: product.price,
                guestId: selectedGuestId
            }];
        }

        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = 0;
        const total = subtotal + tax;

        onUpdateCheck({ ...check, items: newItems, subtotal, tax, total });
    };

    const updateQuantity = (itemToUpdate: CartItem, delta: number) => {
        const newItems = check.items.map(item => {
            if (item.serviceId === itemToUpdate.serviceId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return null;
                return { ...item, quantity: newQty, subtotal: newQty * item.price };
            }
            return item;
        }).filter(Boolean) as CartItem[];

        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = 0;
        const total = subtotal + tax;

        onUpdateCheck({ ...check, items: newItems, subtotal, tax, total });
    };

    // const addGuest = () => {
    //     const nextGuestNum = guests.length + 1;
    //     const newGuestId = `guest-${nextGuestNum}`;
    //     setSelectedGuestId(newGuestId);
    // };

    const handleSelectClient = (client: any) => {
        onUpdateCheck({
            ...check,
            customerId: client.id,
            customerName: client.name
        });
        setShowClientModal(false);
    };

    const filteredProducts = useMemo(() => {
        let result = products;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p => p.name.toLowerCase().includes(query));
        }
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }
        return result;
    }, [products, searchQuery, selectedCategory]);

    const handleAddComment = () => {
        const comment = prompt("Коментар до чеку:", check.comment || "");
        if (comment !== null) {
            onUpdateCheck({ ...check, comment });
        }
    };

    const handlePrintCheck = () => {
        // Mock print functionality
        alert(`Друк чеку #${check.id.slice(-4)}...\n\nСума: ${check.total} ₴`);
    };

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className={styles.container}>
            {/* LEFT PANEL: ORDER DETAILS */}
            <div className={styles.leftPanel}>
                <div className={styles.headerRow}>
                    <button onClick={onBack} className={styles.backButton}>←</button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 className={styles.checkTitle}>Чек #{check.id.slice(-4)}</h2>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className={styles.tableName}>{check.tableName}</span>
                            {check.waiterName && (
                                <span style={{ fontSize: '0.8rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                                    🤵 {check.waiterName}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        className={`${styles.clientButton} ${check.customerName ? styles.active : ''}`}
                        onClick={() => setShowClientModal(true)}
                    >
                        {check.customerName ? (
                            <>👤 {check.customerName}</>
                        ) : (
                            <>+ Клієнт</>
                        )}
                    </button>
                </div>

                <div className={styles.orderList}>
                    {guests.map((guestId, index) => {
                        const guestItems = check.items.filter(i => (i.guestId || 'guest-1') === guestId);
                        const isSelected = selectedGuestId === guestId;

                        return (
                            <div
                                key={guestId}
                                className={`${styles.guestSection} ${isSelected ? styles.activeGuest : ''}`}
                                onClick={() => setSelectedGuestId(guestId)}
                            >
                                <div className={styles.guestHeader}>
                                    <span>Гість {index + 1}</span>
                                    {/* Delete Guest Logic could go here */}
                                </div>

                                {guestItems.length === 0 ? (
                                    <div className={styles.emptyGuest}>Пусто</div>
                                ) : (
                                    guestItems.map(item => (
                                        <div key={item.serviceId} className={styles.orderItem}>
                                            <div className={styles.itemInfo}>
                                                <div className={styles.itemName}>{item.serviceName}</div>
                                            </div>
                                            <div className={styles.itemControls}>
                                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(item, -1); }}>-</button>
                                                <span>{item.quantity}</span>
                                                <button onClick={(e) => { e.stopPropagation(); updateQuantity(item, 1); }}>+</button>
                                            </div>
                                            <div className={styles.itemPrice}>
                                                {item.subtotal.toFixed(2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        );
                    })}

                    {/* <button className={styles.addGuestButton} onClick={addGuest}>
                        + Додати гостя
                    </button> */}
                </div>

                <div className={styles.totalSection}>
                    {check.comment && (
                        <div className={styles.commentSection}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#b45309', marginBottom: '4px' }}>Коментар:</div>
                            <div>{check.comment}</div>
                        </div>
                    )}

                    <div className={styles.totalRow}>
                        <span>До сплати</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={styles.totalAmount} style={{ marginRight: '10px' }}>{check.total.toFixed(2)} ₴</span>

                            <div className={styles.optionsContainer}>
                                <button className={styles.burgerButton} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                    ⋮
                                </button>
                                {isMenuOpen && (
                                    <div className={styles.optionsMenu}>
                                        <button className={styles.menuItem} onClick={() => { setIsMenuOpen(false); handleAddComment(); }}>
                                            📝 Коментар
                                        </button>
                                        <button className={styles.menuItem} onClick={() => { setIsMenuOpen(false); handlePrintCheck(); }}>
                                            🖨️ Друк чеку
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className={styles.payButton} onClick={onPay}>
                        Оплатити
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL: MENU */}
            <div className={styles.rightPanel}>
                <div className={styles.menuHeader}>
                    <input
                        className={styles.searchInput}
                        placeholder="🔍 Пошук..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {/* Category Tabs could go here if needed */}
                </div>

                <div className={styles.productGrid}>
                    {filteredProducts.map(product => (
                        <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
                            <div className={styles.productImage}>
                                {product.imageUrl ? <img src={product.imageUrl} /> : <div className={styles.placeholderImg}>{product.name[0]}</div>}
                            </div>
                            <div className={styles.productName}>{product.name}</div>
                            <div className={styles.productPrice}>{product.price} ₴</div>
                        </div>
                    ))}
                </div>
            </div>

            {showClientModal && (
                <ClientSelectorModal
                    onClose={() => setShowClientModal(false)}
                    onSelect={handleSelectClient}
                />
            )}
        </div>
    );
}
