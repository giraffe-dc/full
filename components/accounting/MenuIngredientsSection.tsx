'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './MenuIngredientsSection.module.css';
import { MenuIngredient } from '@/types/accounting';
import { IngredientFormModal } from './IngredientFormModal';
import {
    getIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
} from '@/lib/api-client';
import { ImportModal } from './ImportModal';
import { TrashModal } from './TrashModal';

export function MenuIngredientsSection() {
    const [ingredients, setIngredients] = useState<MenuIngredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<MenuIngredient | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof MenuIngredient; direction: 'asc' | 'desc' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    useEffect(() => {
        loadIngredients();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory]);

    const loadIngredients = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getIngredients();

            // Deduplicate by ID
            const uniqueIngredients = Array.from(new Map(data.map((item: any) => [item.id, item])).values()) as MenuIngredient[];

            setIngredients(uniqueIngredients);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при завантаженні інгредієнтів');
            console.error('Error loading ingredients:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = (key: keyof MenuIngredient) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof MenuIngredient) => {
        if (!sortConfig || sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const sortedIngredients = useMemo(() => {
        let sortableIngredients = [...ingredients];
        if (sortConfig !== null) {
            sortableIngredients.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined && bValue === undefined) return 0;
                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableIngredients;
    }, [ingredients, sortConfig]);

    const filteredRows = sortedIngredients.filter((row) => {
        const matchesSearch =
            row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.code.toString().toLowerCase() === searchQuery.trim().toLowerCase();
        const matchesCategory = selectedCategory ? row.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const paginatedRows = filteredRows.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleAddIngredient = async (ingredient: MenuIngredient) => {
        try {
            const newIngredient = await createIngredient(ingredient);
            setIngredients([...ingredients, newIngredient]);
            setIsFormOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при створенні інгредієнта');
        }
    };

    const handleEditIngredient = async (ingredient: MenuIngredient) => {
        try {
            const updatedIngredient = await updateIngredient(ingredient.id, ingredient);
            setIngredients(ingredients.map((p) => (p.id === ingredient.id ? updatedIngredient : p)));
            setIsFormOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оновленні інгредієнта');
        }
    };

    const handleDeleteIngredient = async (id: string) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цей інгредієнт?')) return;
        try {
            await deleteIngredient(id);
            setIngredients(ingredients.filter((p) => p.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при видаленні інгредієнта');
        }
    };

    const handleOpenForm = () => {
        setEditingIngredient(undefined);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (ingredient: MenuIngredient) => {
        setEditingIngredient(ingredient);
        setIsFormOpen(true);
    };

    // Extract unique categories for filter
    const categories = Array.from(new Set(ingredients.map(p => p.category))).filter(Boolean);

    return (
        <>
            <section className={styles.card}>
                <div className={styles.headerRow}>
                    <div className={styles.titleBlock}>
                        <h2 className={styles.title}>Інгредієнти</h2>
                        <span className={styles.count}>{ingredients.length}</span>
                    </div>
                    <div className={styles.toolbarRight}>
                        <button
                            className={styles.toolbarButton}
                            onClick={() => setIsImportModalOpen(true)}
                            title="Імпорт з Excel"
                        >
                            📥 Імпорт
                        </button>
                        <button
                            className={styles.toolbarButton}
                            onClick={() => setIsTrashOpen(true)}
                            title="Відновити видалені"
                        >
                            🗑️ Кошик
                        </button>
                        <button
                            className={`${styles.toolbarButton} ${styles.buttonPrimary}`}
                            onClick={handleOpenForm}
                        >
                            ➕ Додати
                        </button>
                    </div>
                </div>

                <div className={styles.toolbarRow}>
                    <input
                        type="text"
                        placeholder="🔍 Пошук за назвою або кодом"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">Всі категорії</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '80px', cursor: 'pointer' }} onClick={() => handleSort('code')}>
                                    Код {getSortIndicator('code')}
                                </th>
                                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                                    Назва {getSortIndicator('name')}
                                </th>
                                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                                    Категорія {getSortIndicator('category')}
                                </th>
                                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('unit')}>
                                    Од. вим. {getSortIndicator('unit')}
                                </th>
                                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('costPerUnit')}>
                                    Ціна за од. {getSortIndicator('costPerUnit')}
                                </th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Завантаження...</td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Немає даних</td>
                                </tr>
                            ) : (
                                paginatedRows.map((row) => (
                                    <tr key={row.id}>
                                        <td><span className={styles.codeBadge}>{row.code}</span></td>
                                        <td style={{ fontWeight: 500 }}>{row.name}</td>
                                        <td><span className={styles.categoryBadge}>{row.category}</span></td>
                                        <td style={{ textAlign: 'right' }}>{row.unit}</td>
                                        <td style={{ textAlign: 'right' }}>{row.costPerUnit?.toFixed(2)} ₴</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => handleOpenEditForm(row)}
                                                title="Редагувати"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${styles.actionDelete}`}
                                                onClick={() => handleDeleteIngredient(row.id || row._id || '')}
                                                title="Видалити"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className={styles.paginationRow} style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#6b7280' }}>
                        <span>Показати:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>на сторінці</span>
                        <span style={{ marginLeft: '10px' }}>Всього: {filteredRows.length}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={styles.toolbarButton}
                            style={{ padding: '4px 8px', opacity: currentPage === 1 ? 0.5 : 1 }}
                        >
                            ←
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px' }}>
                            Сторінка {currentPage} з {Math.max(totalPages, 1)}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage >= totalPages}
                            className={styles.toolbarButton}
                            style={{ padding: '4px 8px', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                        >
                            →
                        </button>
                    </div>
                </div>
            </section>

            <IngredientFormModal
                isOpen={isFormOpen}
                ingredient={editingIngredient}
                categories={categories}
                onClose={() => setIsFormOpen(false)}
                onSave={(ingredient) => {
                    if (editingIngredient) {
                        handleEditIngredient(ingredient);
                    } else {
                        handleAddIngredient(ingredient);
                    }
                }}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                type="ingredients"
                title="Імпорт інгредієнтів"
                onImportSuccess={() => {
                    loadIngredients();
                    // setIsImportModalOpen(false); // Let user close it manually to see results
                }}
            />

            <TrashModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                type="ingredients"
                title="Інгредієнти"
                onRestore={() => {
                    loadIngredients();
                    // Maybe keep open or separate "refresh" logic
                }}
            />
        </>
    );
}
