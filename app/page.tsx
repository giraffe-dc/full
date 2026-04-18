"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import SocialPlannerPreview from "@/components/social-planner/SocialPlannerPreview";
import styles from "./page.module.css";

interface Module {
    href: string;
    icon: string;
    title: string;
    description: string;
    color: string;
    roles: string[];
}

interface DashboardStats {
    todayVisitors: number;
    activeEvents: number;
    revenue: number;
    pendingTasks: number;
}

export default function Dashboard() {
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch user data
        fetch("/api/auth/me")
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) {
                    setUser(data.user);
                }
            })
            .catch(console.error);

        // Fetch dashboard stats
        fetch("/api/dashboard/stats")
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data) {
                    setStats(data.data);
                }
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const modules: Module[] = [
        { href: '/cash-register', icon: '💰', title: 'Каса', description: 'Продажі, чеки, звіти', color: 'yellow', roles: ['user', 'admin'] },
        { href: '/clients', icon: '👥', title: 'Клієнти', description: 'База клієнтів, Telegram', color: 'blue', roles: ['user', 'admin'] },
        { href: '/supply', icon: '📦', title: 'Постачання', description: 'Товари та інгредієнти', color: 'pink', roles: ['user', 'admin'] },
        { href: '/accounting', icon: '📊', title: 'Бухгалтерія', description: 'Фінанси, аналітика', color: 'green', roles: ['admin'] },
        { href: '/visits', icon: '🕒', title: 'Відвідування', description: 'Реєстрація відвідувачів', color: 'purple', roles: ['user', 'admin'] },
        { href: '/events', icon: '🎉', title: 'Бронювання', description: 'Святкові події', color: 'purple', roles: ['user', 'admin'] },
        { href: '/telegram', icon: '📱', title: 'Telegram', description: 'Інтеграція з Telegram', color: 'blue', roles: ['user', 'admin'] },
        { href: '/social-planner', icon: '📅', title: 'Соцмережі', description: 'Планувальник постів', color: 'purple', roles: ['user', 'admin'] },
        { href: '/staff', icon: '👨‍👩‍👧‍👦', title: 'Персонал', description: 'Графіки, зарплати', color: 'orange', roles: ['admin'] },
    ];

    const visibleModules = modules.filter(m => {
        if (!user) return false;
        if (user.role === 'user') {
            return m.roles.includes('user');
        }
        return true;
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 6) return 'Доброї ночі';
        if (hour < 12) return 'Доброго ранку';
        if (hour < 18) return 'Доброго дня';
        return 'Доброго вечора';
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}>⏳</div>
                <p>Завантаження...</p>
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            {/* Hero Section */}
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={`${styles.title} animate-bounce-in`}>
                        {getGreeting()}, {user?.email?.split('@')[0]}! 👋
                    </h1>
                    <p className={styles.subtitle}>
                        Система управління розважальним центром Жирафик
                    </p>
                    <div className={styles.quickActions}>
                        <Button variant="primary" size="md">
                            💰 Новий продаж
                        </Button>
                        <Button variant="secondary" size="md">
                            🎉 Бронювання
                        </Button>
                        <Button variant="outline" size="md">
                            👥 Клієнт
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            {stats && (
                <div className={styles.statsGrid}>
                    <StatCard
                        title="Відвідувачів сьогодні"
                        value={stats.todayVisitors}
                        icon="👥"
                        trend={{ value: 12.5, isPositive: true }}
                        color="blue"
                    />
                    <StatCard
                        title="Активні події"
                        value={stats.activeEvents}
                        icon="🎉"
                        color="purple"
                    />
                    <StatCard
                        title="Прибуток за день"
                        value={`₴${stats.revenue.toLocaleString()}`}
                        icon="💰"
                        trend={{ value: 8.2, isPositive: true }}
                        color="green"
                    />
                    <StatCard
                        title="Відкриті чеки"
                        value={stats.pendingTasks}
                        icon="📋"
                        trend={{ value: 3.1, isPositive: false }}
                        color="orange"
                    />
                </div>
            )}

            <SocialPlannerPreview />

            {/* Modules Grid */}
            <div className={styles.modulesSection}>
                <h2 className={styles.sectionTitle}>Модулі</h2>
                <div className={styles.modulesGrid}>
                    {visibleModules.map((module, index) => (
                        <Link
                            key={module.href}
                            href={module.href}
                            className={`${styles.moduleCard} animate-bounce-in`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <Card
                                variant="hover"
                                color={module.color as any}
                                padding="md"
                                className={styles.cardInner}
                            >
                                <div className={`${styles.moduleIcon} animate-float`}>
                                    {module.icon}
                                </div>
                                <h3 className={styles.moduleTitle}>{module.title}</h3>
                                <p className={styles.moduleDescription}>{module.description}</p>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className={styles.recentSection}>
                <h2 className={styles.sectionTitle}>Остання активність</h2>
                <Card padding="md" className={styles.recentCard}>
                    <div className={styles.recentEmpty}>
                        <span className={styles.recentIcon}>📊</span>
                        <p>Тут буде відображатись остання активність</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
