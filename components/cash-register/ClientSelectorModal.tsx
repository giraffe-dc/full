import React, { useState, useEffect } from 'react';
import styles from './ClientSelectorModal.module.css';
import { ClientFormModal } from '../accounting/ClientFormModal';

interface Client {
    id: string;
    name: string;
    phone: string;
    email?: string;
    discount?: number;
}

interface ClientSelectorModalProps {
    onClose: () => void;
    onSelect: (client: Client) => void;
}

export function ClientSelectorModal({ onClose, onSelect }: ClientSelectorModalProps) {
    const [clients, setClients] = useState<Client[]>([]);
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
                // Ensure ID is string
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

    const handleCreateClient = async (clientData: any) => {
        try {
            const res = await fetch('/api/accounting/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });
            const data = await res.json();

            if (data.success) {
                // Select the new client immediately
                const newClient = { ...clientData, id: data.id };
                onSelect(newClient);
                onClose(); // Close both modals effectively
            } else {
                alert("Помилка створення: " + data.error);
            }
        } catch (e) {
            alert("Помилка сервера");
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    if (showCreateModal) {
        return (
            <ClientFormModal
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateClient}
            />
        );
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Оберіть клієнта</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.searchContainer}>
                    <input
                        className={styles.searchInput}
                        placeholder="Пошук (ім'я або телефон)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className={styles.list}>
                    {loading ? (
                        <div style={{ padding: 16, textAlign: 'center' }}>Завантаження...</div>
                    ) : filteredClients.length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Клієнтів не знайдено</div>
                    ) : (
                        filteredClients.map(client => (
                            <div
                                key={client.id}
                                className={styles.clientItem}
                                onClick={() => onSelect(client)}
                            >
                                <div className={styles.clientName}>{client.name}</div>
                                {client.phone && <div className={styles.clientInfo}>{client.phone}</div>}
                            </div>
                        ))
                    )}
                </div>

                <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                    + Створити нового клієнта
                </button>
            </div>
        </div>
    );
}
