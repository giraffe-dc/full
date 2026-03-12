'use client';

import React, { useState, useEffect } from 'react';
import { ClientsSection, ClientRow } from '@/components/clients/ClientsSection';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import styles from './page.module.css';

interface ClientsTotals {
  noDiscount: number;
  cash: number;
  card: number;
  profit: number;
  receipts: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [totals, setTotals] = useState<ClientsTotals>({
    noDiscount: 0,
    cash: 0,
    card: 0,
    profit: 0,
    receipts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRow | undefined>();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/accounting/clients');
      const data = await res.json();
      setClients(data.data || []);
      setTotals(data.totals || {
        noDiscount: 0,
        cash: 0,
        card: 0,
        profit: 0,
        receipts: 0
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (client: Partial<ClientRow>): Promise<boolean> => {
    try {
      const res = await fetch('/api/accounting/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...client,
          id: editingClient?.id
        })
      });

      const data = await res.json();

      if (res.ok) {
        await fetchClients();
        return true;
      } else {
        console.error('Error saving client:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving client:', error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Завантаження клієнтів...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>👥 Клієнти</h1>
          <span className={styles.subtitle}>База клієнтів РЦ "Жирафик"</span>
        </div>
      </header>

      <ClientsSection
        rows={clients}
        totals={totals}
      />

      {showModal && (
        <ClientFormModal
          client={editingClient}
          onClose={() => {
            setShowModal(false);
            setEditingClient(undefined);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
