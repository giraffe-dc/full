import React, { useState } from 'react';
import styles from './Modal.module.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
    type: 'products' | 'recipes' | 'ingredients';
    title: string;
}

export function ImportModal({ isOpen, onClose, onImportSuccess, type, title }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: boolean;
        createdCount: number;
        updatedCount: number;
        updatedItems: string[];
        message?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Legacy simple message state if needed fallback
    // const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Будь ласка, оберіть файл');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/accounting/import?type=${type}`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setResult({
                    success: true,
                    createdCount: data.createdCount,
                    updatedCount: data.updatedCount,
                    updatedItems: data.updatedItems,
                    message: data.message
                });

                // Allow user to see result before closing
                if (onImportSuccess) {
                    onImportSuccess();
                }
            } else {
                setError(data.error || 'Помилка імпорту');
            }
        } catch (err) {
            setError('Помилка з\'єднання');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Імпорт: {title}</h3>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                <p style={{ marginBottom: '1rem', color: '#666' }}>
                    Завантажте Excel файл (.xlsx, .xls). Перший рядок має містити заголовки стовпців.
                </p>

                <div className={styles.infoBox} style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '4px', fontSize: '13px' }}>
                    <strong>Необхідні стовпці:</strong>
                    <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                        {type === 'products' && (
                            <>
                                <li><code>name</code> (Назва) - обов'язково</li>
                                <li><code>category</code> (Категорія) - обов'язково</li>
                                <li><code>code</code> (Код)</li>
                                <li><code>costPerUnit</code> (Собівартість)</li>
                                <li><code>sellingPrice</code> (Ціна)</li>
                            </>
                        )}
                        {type === 'recipes' && (
                            <>
                                <li><code>name</code> (Назва) - в кожному рядку</li>
                                <li><code>ingredients</code> (Складники) - в окремих рядках</li>
                                <li><code>gross</code> (Брутто: "100 г")</li>
                                <li><code>net</code> (Нетто: "90 г")</li>
                                <li><code>sellingPrice</code> (Ціна) - у першому рядку</li>
                            </>
                        )}
                        {type === 'ingredients' && (
                            <>
                                <li><code>name</code> (Назва) - обов'язково</li>
                                <li><code>category</code> (Категорія) - обов'язково</li>
                                <li><code>unit</code> (Од. вим.)</li>
                                <li><code>costPerUnit</code> (Ціна за од.)</li>
                            </>
                        )}
                    </ul>
                </div>

                <div className={styles.formRow}>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className={styles.fileInput}
                    />
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                {result && (
                    <div className={styles.successMessage}>
                        <p><strong>Успішно оброблено!</strong></p>
                        <p>✅ Створено нових: {result.createdCount}</p>
                        <p>⚠️ Оновлено (дублікатів): {result.updatedCount}</p>

                        {result.updatedCount > 0 && result.updatedItems && (
                            <div style={{ marginTop: '10px', textAlign: 'left', maxHeight: '100px', overflowY: 'auto', fontSize: '0.9em', border: '1px solid #c3e6cb', padding: '5px' }}>
                                <strong>Оновлені товари:</strong>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                    {result.updatedItems.map((item, idx) => (
                                        <li key={idx}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.formActions}>
                    <button
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className={styles.saveBtn}
                    >
                        {loading ? 'Завантаження...' : 'Імпортувати'}
                    </button>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={loading}>
                        Скасувати
                    </button>
                </div>
            </div>
        </div>
    );
}
