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
    onAddItem: (item: CartItem) => void;
    onVoid: () => void;
}

export function CheckView({ check, products, onUpdateCheck, onBack, onPay, onAddItem, onVoid }: CheckViewProps) {
    const [selectedGuestId, setSelectedGuestId] = useState<string>('guest-1');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showClientModal, setShowClientModal] = useState(false);

    // --- Logic ---
    // console.log(products);
    const guests = useMemo(() => {
        // Extract unique guest IDs from items, plus "guest-1" default
        const uniqueGuests = new Set(check.items.map(i => i.guestId || 'guest-1'));
        uniqueGuests.add('guest-1');
        return Array.from(uniqueGuests).sort();
    }, [check.items]);

    const addToCart = (product: Service) => {
        const newItem: CartItem = {
            serviceId: `item-${Date.now()}`,
            productId: product.id,
            serviceName: product.name,
            category: product.category,
            price: product.price,
            quantity: 1,
            subtotal: product.price,
            guestId: selectedGuestId
        };
        onAddItem(newItem);
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
        // Basic recalculation: Total = Subtotal - Discount
        // Note: Ideally, promotion eligibility should be re-evaluated when cart changes.
        // For MVP, we preserve the discount AMOUNT (check.discount) or reset it?
        // Let's preserve the existing global discount amount for now, 
        // as re-calculating per-item discount without promotion context is hard.
        // But if item.discount exists, we should probably re-sum it?

        // Detect if we are using item-based discounts (Percent) or global (Fixed)
        // If the *original* check had item discounts, we stick to item discount summation (even if it becomes 0).
        // If original check had NO item discounts but had a global discount, we preserve global.
        const hadItemDiscounts = check.items.some(i => (i.discount || 0) > 0);

        const totalDiscount = newItems.reduce((sum, i) => sum + (i.discount || 0), 0);

        const effectiveDiscount = hadItemDiscounts ? totalDiscount : (check.discount || 0);

        const total = Math.max(0, subtotal + tax - effectiveDiscount);

        onUpdateCheck({
            ...check,
            items: newItems,
            subtotal,
            tax,
            total,
            discount: effectiveDiscount
        });
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
        console.log("Filtering products", products.length, searchQuery, selectedCategory);
        if (!products) return [];
        let result = products;

        // Debug check
        // if (process.env.NODE_ENV === 'development') console.log("Filtering products", products.length, searchQuery, selectedCategory);

        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p => p.name.toLowerCase().includes(query));
        }

        if (selectedCategory && selectedCategory !== 'all') {
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
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;

        const dateStr = new Date().toLocaleString('uk-UA');
        const itemsHtml = check.items.map(item => `
            <div class="item">
                <div class="item-main">
                    <span class="item-name">${item.serviceName}</span>
                    <span class="item-total">${item.subtotal.toFixed(2)}</span>
                </div>
                <div class="item-details">
                    ${item.quantity} x ${item.price.toFixed(2)}
                    ${item.discount ? `<span class="item-discount">(-${item.discount.toFixed(2)})</span>` : ''}
                </div>
            </div>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Чек #${check.id.slice(-4)}</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        padding: 10px; 
                        width: 300px;
                        margin: 0 auto;
                        color: #000;
                    }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .brand { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .context { font-size: 14px; margin-bottom: 5px; }
                    .item { margin-bottom: 8px; font-size: 14px; }
                    .item-main { display: flex; justify-content: space-between; font-weight: bold; }
                    .item-details { font-size: 12px; color: #333; }
                    .item-discount { color: #000; font-weight: normal; margin-left: 5px; }
                    .totals { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; }
                    .comment-box { 
                        margin-top: 15px; 
                        padding: 8px; 
                        border: 1px solid #000; 
                        font-size: 13px;
                        font-style: italic;
                    }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; }
                    @media print {
                        body { width: 90%; padding: 1rem; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">GIRAFFE</div>
                    <div class="context">Чек #${check.id.slice(-4)}</div>
                    <div class="context">Стіл: ${check.tableName}</div>
                    ${check.waiterName ? `<div class="context">Офіціант: ${check.waiterName}</div>` : ''}
                    <div class="context">${dateStr}</div>
                </div>

                <div class="items">
                    ${itemsHtml}
                </div>

                <div class="totals">
                    <div class="total-row">
                        <span>ВСЬОГО:</span>
                        <span>${check.total.toFixed(2)} ₴</span>
                    </div>
                </div>

                ${check.comment ? `
                    <div class="comment-box">
                        <strong>Коментар:</strong><br/>
                        ${check.comment}
                    </div>
                ` : ''}

                <div class="footer">
                    Дякуємо за візит!<br/>
                    giraffe.pos
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
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
                                                {item.discount ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.85rem' }}>
                                                            {item.subtotal.toFixed(2)}
                                                        </span>
                                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                                            {(item.subtotal - item.discount).toFixed(2)}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                                            (-{item.discount.toFixed(2)})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    item.subtotal.toFixed(2)
                                                )}
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
                                        {/* <button className={styles.menuItem} onClick={() => { setIsMenuOpen(false); (window as any).showPromotions?.(); }} style={{ color: '#d97706' }}>
                                            🏷️ Акції
                                        </button> */}
                                        {Math.abs(check.total) < 0.01 && (
                                            <button className={styles.menuItem} onClick={() => { setIsMenuOpen(false); onVoid(); }} style={{ color: '#ef4444' }}>
                                                🗑️ Анулювати (Помилковий)
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {Math.abs(check.total) < 0.01 ? (
                        <button className={styles.payButton} onClick={onVoid} style={{ backgroundColor: '#ef4444' }}>
                            Закрити (Помилковий)
                        </button>
                    ) : (
                        <button className={styles.payButton} onClick={onPay}>
                            Оплатити
                        </button>
                    )}
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
                    selectedClientId={check.customerId}
                />
            )}
        </div>
    );
}
