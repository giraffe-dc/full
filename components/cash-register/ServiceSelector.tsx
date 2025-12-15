import React, { useState } from 'react';
import { Service, ServiceCategory } from '../../types/cash-register';
import styles from './ServiceSelector.module.css';

interface ServiceSelectorProps {
  services: Service[];
  onSelectService: (service: Service) => void;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bowling: '🎳 Боулінг',
  billiards: '🎱 Більярд',
  karaoke: '🎤 Караоке',
  games: '🕹️ Ігри',
  bar: '🍹 Бар',
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  bowling: '#3b82f6',
  billiards: '#8b5cf6',
  karaoke: '#ec4899',
  games: '#f59e0b',
  bar: '#10b981',
  
};

export function ServiceSelector({ services, onSelectService }: ServiceSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('bowling');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: ServiceCategory[] = ['bowling', 'billiards', 'karaoke', 'games', 'bar'];
  
  let filteredServices = services;
  
  // Якщо є пошуковий запит, шукаємо по всім розділам
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredServices = filteredServices.filter((s) =>
      s.name.toLowerCase().includes(query)
    );
  } else {
    // Якщо немає пошуку, фільтруємо по вибраній категорії
    filteredServices = filteredServices.filter((s) => s.category === selectedCategory);
  }

  return (
    <div className={styles.container}>
      <div className={styles.categoryTabs}>
        {categories.map((category) => (
          <button
            key={category}
            className={`${styles.categoryTab} ${
              selectedCategory === category ? styles.categoryTabActive : ''
            }`}
            onClick={() => setSelectedCategory(category)}
            style={
              selectedCategory === category
                ? { borderBottomColor: CATEGORY_COLORS[category] }
                : {}
            }
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Пошук послуг..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.servicesList}>
        {filteredServices.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Послуг не знайдено</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <button
              key={service.id}
              className={styles.serviceListItem}
              onClick={() => onSelectService(service)}
              style={{
                borderLeftColor: service.category,
              }}
            >
              <div className={styles.serviceInfo}>
                <div className={styles.serviceName}>{service.name}</div>
                {service.description && (
                  <div className={styles.serviceDescription}>{service.description}</div>
                )}
              </div>
              <div className={styles.servicePrice}>{service.price} ₴</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
