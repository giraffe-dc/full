import React, { useState, useEffect } from 'react';
import { Certificate } from '../../types/cash-register';
import { useToast } from '../ui/ToastContext';
import styles from './ClientsSection.module.css'; // Reuse some styles
import { IssueCertificateModal } from '../certificates/IssueCertificateModal';

interface ClientCertificatesProps {
  clientId: string;
  clientName?: string;
}

export function ClientCertificates({ clientId, clientName }: ClientCertificatesProps) {
  const toast = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchCertificates();
    }
  }, [clientId]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      // Fetch all certificates for the client
      const res = await fetch(`/api/certificates/client/${clientId}?status=`); // no status = all
      const data = await res.json();
      if (data.success) {
        setCertificates(data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Помилка завантаження сертифікатів клієнта");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '10px 0', color: '#6b7280' }}>Завантаження сертифікатів...</div>;
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>Сертифікати</h3>
        <button 
          onClick={() => setIsModalOpen(true)} 
          style={{ 
            background: '#dbeafe', color: '#1e40af', border: 'none', 
            padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem'
          }}
        >
          ➕ Видати
        </button>
      </div>

      <IssueCertificateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCertificates}
        clientId={clientId}
        clientName={clientName}
      />

      {certificates.length === 0 ? (
        <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}>
          У клієнта немає сертифікатів
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {certificates.map(cert => (
            <div key={cert.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '10px 15px', border: '1px solid #e5e7eb', borderRadius: '6px',
              background: cert.status === 'active' ? '#fff' : '#f9fafb'
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827' }}>
                  {cert.type === 'amount' && `На суму ${cert.amount} ₴`}
                  {cert.type === 'visits' && `На ${cert.visitsTotal} відвідувань`}
                  {cert.type === 'service' && `Послуга: ${cert.serviceName}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                  Код: {cert.code} • 
                  {cert.status === 'active' ? (
                    <span style={{ color: '#059669', marginLeft: '4px', fontWeight: 500 }}>
                      Активний 
                      {cert.type === 'amount' && ` (Залишок: ${cert.balance} ₴)`}
                      {cert.type === 'visits' && ` (Залишок: ${(cert.visitsTotal || 0) - (cert.visitsUsed || 0)} шт)`}
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', marginLeft: '4px' }}>
                      {cert.status === 'used' ? 'Використаний' : 'Анульований'}
                    </span>
                  )}
                </div>
              </div>
              
              {cert.expiresAt && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right' }}>
                  Діє до:<br/>
                  {new Date(cert.expiresAt).toLocaleDateString('uk-UA')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
