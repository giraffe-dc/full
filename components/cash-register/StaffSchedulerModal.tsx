"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Preloader, Badge } from '@/components/ui';
import styles from './StaffSchedulerModal.module.css';

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

export function StaffSchedulerModal({
    currentActiveIds,
    onSave,
    onClose,
    shiftId,
    activeStaffIds
}: StaffSchedulerModalProps) {
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
        <Modal
            isOpen={true}
            title="👥 Хто на зміні?"
            onClose={onClose}
            size="lg"
        >
            <div className={styles.modalContent}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <Preloader fullScreen={false} variant="yellow" showText={false} />
                        <p className={styles.loadingText}>Завантаження персоналу...</p>
                    </div>
                ) : (
                    <div className={styles.staffList}>
                        {staffList.map(staff => {
                            const isSelected = selectedIds.has(staff.id);
                            const isOnDuty = activeStaffIds.includes(staff.id);

                            return (
                                <div
                                    key={staff.id}
                                    className={`${styles.staffItem} ${isSelected ? styles.selected : ''}`}
                                    onClick={() => toggleStaff(staff.id)}
                                >
                                    <div className={styles.checkboxWrapper} />
                                    <div className={styles.staffInfo}>
                                        <div className={styles.staffName}>{staff.name}</div>
                                        <div className={styles.staffPosition}>{staff.position}</div>
                                    </div>
                                    {isOnDuty && !isSelected && (
                                        <Badge variant="success" size="sm">На зміні</Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={styles.actionButtons}>
                    <Button variant="outline" onClick={onClose}>
                        Скасувати
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Зберегти ({selectedIds.size})
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
