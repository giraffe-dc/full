
import React, { useState, useEffect } from "react";
import styles from "./ClientFormModal.module.css"; // Reuse existing styles
import { StaffRow } from "./StaffSection";

interface StaffFormModalProps {
    onClose: () => void;
    onSave: (staff: Partial<StaffRow>) => Promise<void>;
    staff?: StaffRow;
}

export function StaffFormModal({ onClose, onSave, staff }: StaffFormModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        position: "Офіціант",
        salary: 0
    });

    useEffect(() => {
        if (staff) {
            setFormData({
                name: staff.name || "",
                phone: staff.phone || "",
                email: staff.email || "",
                position: staff.position || "Офіціант",
                salary: staff.salary || 0
            });
        }
    }, [staff]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{staff ? "Редагувати працівника" : "Новий працівник"}</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>ПІБ</label>
                        <input
                            className={styles.input}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Петренко Петро"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Посада</label>
                        <select
                            className={styles.input}
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        >
                            <option value="Офіціант">Офіціант</option>
                            <option value="Бармен">Бармен</option>
                            <option value="Кухар">Кухар</option>
                            <option value="Адміністратор">Адміністратор</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Телефон</label>
                        <input
                            className={styles.input}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+380..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="staff@mail.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Ставка / Зарплата</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
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
