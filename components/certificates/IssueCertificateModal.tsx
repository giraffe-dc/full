import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { useToast } from '../ui/ToastContext';
import styles from './IssueCertificateModal.module.css';

interface IssueCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientId?: string;
    clientName?: string;
}

export function IssueCertificateModal({ isOpen, onClose, onSuccess, clientId, clientName }: IssueCertificateModalProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        code: `CERT-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        type: 'amount',
        typeId: '',
        templateId: '',
        amount: 0,
        visitsTotal: 1,
        serviceId: '',
        serviceName: '',
        pricePaid: 0,
        expiresAt: '', // YYYY-MM-DD
        applicableCategories: [] as string[],
        maxCoveragePerVisit: 0,
    });
    
    const [products, setProducts] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [certTypes, setCertTypes] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/accounting/products?status=active')
                .then(r => r.json())
                .then(d => {
                    if (d.success) setProducts(d.data);
                })
                .catch(err => console.error("Failed to load products", err));

            fetch('/api/certificates/templates')
                .then(r => r.json())
                .then(d => {
                    if (d.success) setTemplates(d.data.filter((t: any) => t.status === 'active'));
                });

            fetch('/api/certificates/types')
                .then(r => r.json())
                .then(d => {
                    if (d.success) setCertTypes(d.data.filter((t: any) => t.status === 'active'));
                });
        }
    }, [isOpen]);

    const handleTemplateChange = (id: string) => {
        setSelectedTemplateId(id);
        const template = templates.find(t => t.id === id);
        if (template) {
            const expiresAt = template.expirationDays 
                ? new Date(Date.now() + template.expirationDays * 86400000).toISOString().split('T')[0]
                : '';
            
            setFormData({
                ...formData,
                type: template.type,
                typeId: template.typeId,
                templateId: template.id,
                amount: template.amount || 0,
                visitsTotal: template.visitsTotal || 1,
                serviceId: template.serviceId || '',
                serviceName: template.serviceName || '',
                pricePaid: template.pricePaid,
                expiresAt: expiresAt,
                applicableCategories: template.applicableCategories || [],
                maxCoveragePerVisit: template.maxCoveragePerVisit || 0,
            });
            if (template.serviceName) setSearchTerm(template.serviceName);
        }
    };

    const handleTypeChange = (typeId: string) => {
        const typeDef = certTypes.find(t => t.id === typeId);
        if (typeDef) {
            setFormData({
                ...formData,
                typeId: typeId,
                type: typeDef.baseLogic
            });
        } else {
            setFormData({ ...formData, typeId: '' });
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                clientId: clientId || null,
                clientName: clientName || null,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
            };

            const res = await fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Сертифікат успішно видано!');
                onSuccess();
                onClose();
            } else {
                toast.error(data.error || 'Помилка збереження');
            }
        } catch (error) {
            console.error(error);
            toast.error('Сталася помилка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Видача нового сертифікату" size="md">
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Оберіть шаблон (необов'язково)</label>
                    <select 
                        className={styles.select}
                        value={selectedTemplateId}
                        onChange={e => handleTemplateChange(e.target.value)}
                    >
                        <option value="">-- Власний сертифікат --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label>Унікальний код сертифікату</label>
                    <Input 
                        value={formData.code} 
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        required 
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Вид сертифіката (Сутність)</label>
                    <select 
                        className={styles.select}
                        value={formData.typeId} 
                        onChange={e => handleTypeChange(e.target.value)}
                        required={!selectedTemplateId}
                    >
                        <option value="">-- Оберіть вид --</option>
                        {certTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.baseLogic === 'amount' ? '₴' : t.baseLogic === 'visits' ? '🕒' : '🛠️'})</option>
                        ))}
                    </select>
                </div>

                {formData.type === 'amount' && (
                    <div className={styles.formGroup}>
                        <label>Номінал (Сума ₴)</label>
                        <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            value={formData.amount} 
                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                            required 
                        />
                    </div>
                )}

                {formData.type === 'visits' && (
                    <div className={styles.formGroup}>
                        <label>Кількість відвідувань</label>
                        <Input 
                            type="number" 
                            min="1" 
                            value={formData.visitsTotal} 
                            onChange={e => setFormData({ ...formData, visitsTotal: Number(e.target.value) })}
                            required 
                        />
                    </div>
                )}

                {formData.type === 'service' && (
                    <div className={styles.formGroup} style={{ position: 'relative' }}>
                        <label>Оберіть послугу</label>
                        <Input 
                            value={searchTerm} 
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                                setFormData({ ...formData, serviceId: '', serviceName: '' });
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                            placeholder="Почніть вводити назву..."
                            required={!formData.serviceId}
                        />
                        {isDropdownOpen && (
                            <div style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                background: 'white', border: '1px solid #d1d5db', 
                                borderRadius: '6px', zIndex: 10, maxHeight: '200px', 
                                overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                            }}>
                                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                    <div style={{ padding: '10px', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}>
                                        Нічого не знайдено
                                    </div>
                                ) : (
                                    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                        <div 
                                            key={p._id} 
                                            style={{ 
                                                padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                                                fontSize: '0.9rem', color: '#111827', transition: 'background 0.2s'
                                            }}
                                            onMouseDown={(e) => {
                                                // use onMouseDown instead of onClick to fire before onBlur
                                                e.preventDefault();
                                                setFormData({ ...formData, serviceId: p._id, serviceName: p.name });
                                                setSearchTerm(p.name);
                                                setIsDropdownOpen(false);
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            {p.name} <span style={{ color: '#6b7280', float: 'right' }}>{p.sellingPrice} ₴</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label>Вартість продажу (₴)</label>
                    <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={formData.pricePaid} 
                        onChange={e => setFormData({ ...formData, pricePaid: Number(e.target.value) })}
                        required 
                    />
                    <small style={{ color: '#6b7280' }}>За скільки клієнт купив цей сертифікат</small>
                </div>

                <div className={styles.formGroup}>
                    <label>Термін дії (до)</label>
                    <Input 
                        type="date" 
                        value={formData.expiresAt} 
                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                    <small style={{ color: '#6b7280' }}>Залиште порожнім, якщо безстроковий</small>
                </div>

                {clientName && (
                    <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '15px' }}>
                        <strong>Клієнт:</strong> {clientName}
                    </div>
                )}

                <div className={styles.actions}>
                    <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Скасувати</Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Збереження...' : 'Видати сертифікат'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
