"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import SocialPlannerPreview from "@/components/social-planner/SocialPlannerPreview";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

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
    visitorsTrend: number;
    activeEvents: number;
    eventsTrend: number;
    revenue: number;
    revenueTrend: number;
    staffOnDuty: number;
    pendingTasks: number;
}

export default function Dashboard() {
    const router = useRouter();
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
        { href: '/staff', icon: '👨‍👩‍👧‍👦', title: 'Персонал', description: 'Графіки, зарплати', color: 'orange', roles: ['admin', 'user'] },
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
                        <Button variant="primary" size="md" onClick={() => router.push('/cash-register')}>
                            💰 Новий продаж
                        </Button>
                        <Button variant="secondary" size="md" onClick={() => router.push('/events')}>
                            🎉 Бронювання
                        </Button>
                        <Button variant="outline" size="md" onClick={() => router.push('/clients')}>
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
                        trend={{ value: Math.abs(stats.visitorsTrend), isPositive: stats.visitorsTrend >= 0 }}
                        color="blue"
                    />
                    <StatCard
                        title="Активні події"
                        value={stats.activeEvents}
                        icon="🎉"
                        trend={{ value: Math.abs(stats.eventsTrend), isPositive: stats.eventsTrend >= 0 }}
                        color="purple"
                    />
                    <StatCard
                        title="Прибуток за день"
                        value={`₴${Math.round(stats.revenue).toLocaleString()}`}
                        icon="💰"
                        trend={{ value: Math.abs(stats.revenueTrend), isPositive: stats.revenueTrend >= 0 }}
                        color="green"
                    />
                    <StatCard
                        title="Персонал на зміні"
                        value={stats.staffOnDuty}
                        icon="👨‍👩‍👧‍👦"
                        color="orange"
                    />
                    <StatCard
                        title="Відкриті чеки"
                        value={stats.pendingTasks}
                        icon="📋"
                        color="pink"
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
