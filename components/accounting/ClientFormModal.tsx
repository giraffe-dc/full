
import React, { useState, useEffect } from "react";
import styles from "./ClientFormModal.module.css";
import { ClientRow } from "./ClientsSection";
import { Child } from "@/types/accounting";
import { ChildrenEditor } from "./ChildrenEditor";

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
        comment: "",
        birthday: "",
        children: [] as Child[],
        telegramChatId: "",
        telegramOptOut: false
    });

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || "",
                phone: client.phone || "",
                email: client.email || "",
                address: client.address || "",
                comment: client.comment || "",
                birthday: client.birthday || "",
                children: client.children || [],
                telegramChatId: client.telegramChatId || "",
                telegramOptOut: !!client.telegramOptOut
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

                    {/* Children Editor */}
                    <div className={styles.formGroup}>
                        <ChildrenEditor
                            children={formData.children}
                            onChange={(children) => setFormData({ ...formData, children })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Telegram Chat ID</label>
                        <input
                            className={styles.input}
                            value={formData.telegramChatId}
                            onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                            placeholder="Отримується автоматично або введіть вручну"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.telegramOptOut}
                                onChange={(e) => setFormData({ ...formData, telegramOptOut: e.target.checked })}
                                style={{ width: '18px', height: '18px' }}
                            />
                            Відмовився(лася) від сповіщень у Telegram
                        </label>
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
