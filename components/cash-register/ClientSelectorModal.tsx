"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Preloader } from '@/components/ui';
import { ClientFormModal } from '../accounting/ClientFormModal';
import { ClientRow } from '../accounting/ClientsSection';
import styles from './ClientSelectorModal.module.css';

interface ClientSelectorModalProps {
    onClose: () => void;
    onSelect: (client: ClientRow) => void;
    onSave?: (client: Partial<ClientRow>) => Promise<boolean>;
    selectedClientId?: string;
}

export function ClientSelectorModal({
    onClose,
    onSelect,
    onSave,
    selectedClientId
}: ClientSelectorModalProps) {
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [search, setSearch] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/accounting/clients');
            const data = await res.json();
            if (data.data) {
                const mapped = data.data.map((c: any) => ({
                    ...c,
                    id: c.id || c._id
                }));
                setClients(mapped);
            }
        } catch (e) {
            console.error("Failed to fetch clients");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (clientData: Partial<ClientRow>): Promise<boolean> => {
        try {
            const res = await fetch('/api/accounting/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });
            const data = await res.json();

            if (data.success) {
                fetchClients();
                return true;
            } else {
                if (data.error === 'duplicate_phone') {
                    alert(`❌ Помилка: ${data.message}`);
                } else {
                    alert("❌ Помилка збереження клієнта");
                }
                return false;
            }
        } catch (e) {
            alert("Помилка сервера");
            return false;
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (showCreateModal) {
        return (
            <ClientFormModal
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateClient}
            />
        );
    }

    return (
        <Modal
            isOpen={true}
            title="👥 Оберіть клієнта"
            onClose={onClose}
            size="lg"
        >
            <div className={styles.modalContent}>
                {/* Search */}
                <div className={styles.searchBar}>
                    <input
                        className={styles.searchInput}
                        placeholder="🔍 Пошук (ім'я або телефон)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Client List */}
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <Preloader fullScreen={false} variant="yellow" showText={false} />
                        <p className={styles.loadingText}>Отримуємо список клієнтів...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>👥</div>
                        <p className={styles.emptyText}>Клієнтів не знайдено</p>
                    </div>
                ) : (
                    <div className={styles.clientList}>
                        {filteredClients.map(client => {
                            const isSelected = selectedClientId && client.id === selectedClientId;

                            return (
                                <div
                                    key={client.id}
                                    className={`${styles.clientCard} ${isSelected ? styles.selected : ''}`}
                                    onClick={() => onSelect(client)}
                                >
                                    <div className={styles.clientAvatar}>
                                        {getInitials(client.name)}
                                    </div>
                                    <div className={styles.clientInfo}>
                                        <div className={styles.clientName}>{client.name}</div>
                                        {client.phone && (
                                            <div className={styles.clientPhone}>📞 {client.phone}</div>
                                        )}
                                        {client.email && (
                                            <div className={styles.clientEmail}>📧 {client.email}</div>
                                        )}
                                    </div>
                                    {client.discount && (
                                        <Badge variant="success" size="sm">
                                            -{client.discount}%
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                    <div className={styles.leftButtons}>
                        <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                            + Новий клієнт
                        </Button>
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Закрити
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
