"use client";

import React from 'react';
import { Modal, Button, Avatar } from '@/components/ui';
import styles from './WaiterSelectorModal.module.css';

interface Staff {
    id: string;
    name: string;
    role?: string;
}

interface WaiterSelectorModalProps {
    activeStaff?: Staff[];
    onSelect: (waiter: Staff) => void;
    onClose: () => void;
}

export function WaiterSelectorModal({ activeStaff = [], onSelect, onClose }: WaiterSelectorModalProps) {
    return (
        <Modal
            isOpen={true}
            title="👤 Хто відкриває чек?"
            onClose={onClose}
            size="md"
        >
            <div className={styles.modalContent}>
                {activeStaff.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>⚠️</div>
                        <p className={styles.emptyText}>Нікого немає на зміні!</p>
                        <p className={styles.emptySubtext}>Спочатку додайте співробітників</p>
                    </div>
                ) : (
                    <div className={styles.staffGrid}>
                        {activeStaff.map(staff => (
                            <div
                                key={staff.id}
                                className={styles.staffCard}
                                onClick={() => onSelect(staff)}
                            >
                                <div className={styles.staffAvatar}>
                                    {staff.name[0].toUpperCase()}
                                </div>
                                <div className={styles.staffName}>{staff.name}</div>
                                {staff.role && (
                                    <div className={styles.staffRole}>{staff.role}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.actionButtons}>
                    <Button variant="outline" onClick={onClose}>
                        {activeStaff.length === 0 ? 'Зрозуміло' : 'Скасувати'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
