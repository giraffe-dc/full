"use client";

import { useState } from 'react';
import styles from './page.module.css';
import { CertificateList } from '../../../components/certificates/CertificateList';
import { CertificateTemplates } from '../../../components/certificates/CertificateTemplates';
import { CertificateSettings } from '../../../components/certificates/CertificateSettings';
import { CertificateTypeManager } from '../../../components/certificates/CertificateTypeManager';

type TabType = 'analytics' | 'templates' | 'types' | 'settings';

export default function CertificatesManagerPage() {
    const [activeTab, setActiveTab] = useState<TabType>('analytics');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>🎁 Сертифікати</h1>
            </div>

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'analytics' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    📊 Аналітика
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'types' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('types')}
                >
                    💎 Види
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'templates' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    📋 Шаблони
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    ⚙️ Налаштування
                </button>
            </div>

            <div className={styles.content}>
                {activeTab === 'analytics' && <CertificateList />}
                {activeTab === 'types' && <CertificateTypeManager />}
                {activeTab === 'templates' && <CertificateTemplates />}
                {activeTab === 'settings' && <CertificateSettings />}
            </div>
        </div>
    );
}
