import React from 'react';
import styles from './WaiterSelectorModal.module.css';
import modalStyles from './StaffSchedulerModal.module.css'; // Reuse modal styles

interface Staff {
    id: string;
    name: string;
}

interface WaiterSelectorModalProps {
    activeStaff?: Staff[]; // Passed from parent (filtered list of who is on shift)
    onSelect: (waiter: Staff) => void;
    onClose: () => void;
}

export function WaiterSelectorModal({ activeStaff = [], onSelect, onClose }: WaiterSelectorModalProps) {

    return (
        <div className={modalStyles.modalOverlay} onClick={onClose}>
            <div className={modalStyles.modalContent} onClick={e => e.stopPropagation()}>
                <h2 className={modalStyles.title}>Хто відкриває чек?</h2>

                {activeStaff.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>
                        Нікого немає на зміні!<br />Спочатку додайте співробітників.
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {activeStaff.map(staff => (
                            <div
                                key={staff.id}
                                className={styles.card}
                                onClick={() => onSelect(staff)}
                            >
                                <div className={styles.avatar}>
                                    {staff.name[0]}
                                </div>
                                <div className={styles.name}>{staff.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={modalStyles.footer}>
                    <button className={`${modalStyles.button} ${modalStyles.cancelButton}`} onClick={onClose}>
                        Скасувати
                    </button>
                    {activeStaff.length === 0 && (
                        <button className={`${modalStyles.button} ${modalStyles.saveButton}`} onClick={onClose}>
                            Зрозуміло
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
