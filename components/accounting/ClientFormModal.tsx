
import React, { useState, useEffect } from "react";
import styles from "./ClientFormModal.module.css";
import { ClientRow } from "./ClientsSection";

interface ClientFormModalProps {
    onClose: () => void;
    onSave: (client: Partial<ClientRow>) => Promise<boolean>;
    client?: ClientRow;
}

export function ClientFormModal({ onClose, onSave, client }: ClientFormModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        comment: ""
    });

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || "",
                phone: client.phone || "",
                email: client.email || "",
                address: client.address || "",
                comment: client.comment || ""
            });
        }
    }, [client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await onSave(formData);
        // Закриваємо модалку тільки якщо збереження успішне
        if (success) {
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{client ? "Редагувати клієнта" : "Новий клієнт"}</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Ім'я / Назва *</label>
                        <input
                            className={styles.input}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Іван Іваненко"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Телефон *</label>
                        <input
                            className={styles.input}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+380..."
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="example@mail.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Адреса</label>
                        <input
                            className={styles.input}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="м. Київ, вул..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Коментар</label>
                        <textarea
                            className={styles.textarea}
                            value={formData.comment}
                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            placeholder="Додаткова інформація про клієнта..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Скасувати
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            Зберегти
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
