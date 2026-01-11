import React, { useState, useEffect } from 'react';
import styles from './StaffSchedulerModal.module.css';
import { Preloader } from '../ui/Preloader';

interface Staff {
    id: string;
    name: string;
    position: string;
}

interface StaffSchedulerModalProps {
    currentActiveIds: string[];
    onSave: (activeIds: string[]) => void;
    onClose: () => void;
    shiftId: string;
    activeStaffIds: string[];
}

export function StaffSchedulerModal({ currentActiveIds, onSave, onClose, shiftId, activeStaffIds }: StaffSchedulerModalProps) {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentActiveIds));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/staff');
            const data = await res.json();
            if (data.data) {
                const mapped = data.data.map((c: any) => ({
                    id: c.id || c._id,
                    name: c.name,
                    position: c.position
                }));
                setStaffList(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch staff");
        } finally {
            setLoading(false);
        }
    };

    const toggleStaff = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSave = () => {
        onSave(Array.from(selectedIds));
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h2 className={styles.title}>Хто на зміні?</h2>

                {loading ? (
                    <Preloader fullScreen={false} variant="dark" message="Завантаження персоналу..." />
                ) : (
                    <div className={styles.staffList}>
                        {staffList.map(staff => (
                            <div
                                key={staff.id}
                                className={styles.staffItem}
                                onClick={() => toggleStaff(staff.id)}
                            >
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={selectedIds.has(staff.id)}
                                    readOnly
                                />
                                <span className={styles.staffName}>{staff.name}</span>
                                <span className={styles.staffPosition}>{staff.position}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.footer}>
                    <button className={`${styles.button} ${styles.cancelButton}`} onClick={onClose}>
                        Скасувати
                    </button>
                    <button className={`${styles.button} ${styles.saveButton}`} onClick={handleSave}>
                        Зберегти
                    </button>
                </div>
            </div>
        </div>
    );
}
