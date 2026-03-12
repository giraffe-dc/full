import React from "react";
import styles from "./ClientFormModal.module.css";
import { Child } from "@/types/accounting";

interface ChildrenEditorProps {
    children: Child[];
    onChange: (children: Child[]) => void;
}

export function ChildrenEditor({ children, onChange }: ChildrenEditorProps) {
    const handleAddChild = () => {
        onChange([...children, { name: "", birthday: "" }]);
    };

    const handleRemoveChild = (index: number) => {
        onChange(children.filter((_, i) => i !== index));
    };

    const handleUpdateChild = (index: number, field: keyof Child, value: string) => {
        const updated = children.map((child, i) =>
            i === index ? { ...child, [field]: value } : child
        );
        onChange(updated);
    };

    // Format date for display (YYYY-MM-DD to DD.MM.YYYY)
    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}.${month}.${year}`;
    };

    return (
        <div className={styles.childrenEditor}>
            <div className={styles.childrenHeader}>
                <label className={styles.label}>Діти клієнта</label>
                <button
                    type="button"
                    className={styles.addChildBtn}
                    onClick={handleAddChild}
                >
                    + Додати дитину
                </button>
            </div>

            {children.length === 0 ? (
                <div className={styles.emptyChildren}>
                    Немає доданих дітей. Натисніть "Додати дитину", щоб додати.
                </div>
            ) : (
                <div className={styles.childrenList}>
                    {children.map((child, index) => (
                        <div key={index} className={styles.childItem}>
                            <div className={styles.childInfo}>
                                <span className={styles.childNumber}>{index + 1}.</span>
                                <input
                                    type="text"
                                    className={styles.childNameInput}
                                    placeholder="Ім'я дитини"
                                    value={child.name}
                                    onChange={(e) => handleUpdateChild(index, "name", e.target.value)}
                                />
                                <input
                                    type="date"
                                    className={styles.childBirthdayInput}
                                    value={child.birthday}
                                    onChange={(e) => handleUpdateChild(index, "birthday", e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className={styles.removeChildBtn}
                                onClick={() => handleRemoveChild(index)}
                                title="Видалити дитину"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <span className={styles.helperText}>
                Додайте всіх дітей клієнта для отримання персоналізованих привітань та нагадувань.
            </span>
        </div>
    );
}
