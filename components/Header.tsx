"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";
import type { Notification, NotificationStats } from "@/types/accounting";

export default function Header() {
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Fetch notifications every 5 minutes
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            setIsLoadingNotifications(true);
            try {
                const res = await fetch('/api/notifications?limit=20&unread=false');
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.data || []);
                    setStats(data.stats);
                }
            } catch (e) {
                console.error("Failed to fetch notifications:", e);
            } finally {
                setIsLoadingNotifications(false);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Poll every 5 minutes (300000 ms)
        const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [user]);

    // Close notifications dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        }

        if (isNotificationsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isNotificationsOpen]);

    // Mark notification as read
    const markAsRead = async (id: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
            });
            if (res.ok) {
                // Update local state
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
                );
                if (stats) {
                    setStats(prev => prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null);
                }
            }
        } catch (e) {
            console.error("Failed to mark as read:", e);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllAsRead: true }),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
                setStats(prev => prev ? { ...prev, unread: 0 } : null);
            }
        } catch (e) {
            console.error("Failed to mark all as read:", e);
        }
    };

    // Get notification icon by type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'system': return '⚙️';
            default: return 'ℹ️';
        }
    };

    // Get notification color by type
    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'success': return styles.notificationSuccess;
            case 'warning': return styles.notificationWarning;
            case 'error': return styles.notificationError;
            case 'system': return styles.notificationSystem;
            default: return styles.notificationInfo;
        }
    };

    // Format time ago
    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'щойно';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} хв тому`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} год тому`;
        return date.toLocaleDateString('uk-UA');
    };

    useEffect(() => {
        function checkAuth() {
            fetch("/api/auth/me")
                .then((res) => res.json())
                .then((data) => {
                    if (data.authenticated) {
                        setUser(data.user);
                    } else {
                        setUser(null);
                    }
                })
                .catch(() => setUser(null));
        }

        checkAuth();
        // Перевіряємо авторизацію при зміні фокусу вікна
        window.addEventListener('focus', checkAuth);
        return () => window.removeEventListener('focus', checkAuth);
    }, []);

    function handleLogout() {
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                setUser(null);
                router.push('/login');
            })
            .catch(() => {
                document.cookie = "token=; path=/; max-age=0";
                setUser(null);
                router.push('/login');
            });
    }

    const navItems = [
        { href: '/', label: 'Головна', icon: '🏠' },
        { href: '/cash-register', label: 'Каса', icon: '💰' },
        { href: '/supply', label: 'Постачання', icon: '📦' },
        { href: '/accounting', label: 'Бухгалтерія', icon: '📊' },
        { href: '/visits', label: 'Відвідування', icon: '🕒' },
        { href: '/staff', label: 'Персонал', icon: '👥' },
        // { href: '/projects', label: 'Проекти', icon: '📁' },
    ];

    const unreadCount = stats?.unread || notifications.filter(n => !n.isRead).length;

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🦒</span>
                    <span className={styles.logoText}>Giraffe</span>
                </Link>

                {/* Navigation */}
                {user && (
                    <nav className={styles.nav}>
                        {navItems.filter(item => {
                            if (user.role === 'user') {
                                return ['/', '/cash-register', '/projects', '/supply', '/visits', '/staff'].includes(item.href);
                            }
                            return true;
                        }).map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    <span className={styles.navLabel}>{item.label}</span>
                                    {isActive && <span className={styles.activeIndicator} />}
                                </Link>
                            );
                        })}
                    </nav>
                )}

                {/* Right Section */}
                <div className={styles.rightSection}>
                    {user ? (
                        <>
                            {/* Notifications */}
                            <div className={styles.notificationsWrapper} ref={notificationsRef}>
                                <button
                                    className={`${styles.iconButton} ${unreadCount > 0 ? styles.hasNotifications : ''}`}
                                    aria-label="Notifications"
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                >
                                    <span className={styles.notificationIcon}>🔔</span>
                                    {unreadCount > 0 && (
                                        <span className={styles.notificationBadge}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {isNotificationsOpen && (
                                    <div className={styles.notificationsDropdown}>
                                        <div className={styles.notificationsHeader}>
                                            <h3 className={styles.notificationsTitle}>Сповіщення</h3>
                                            {unreadCount > 0 && (
                                                <button
                                                    className={styles.markAllReadBtn}
                                                    onClick={markAllAsRead}
                                                >
                                                    Відмітити всі як прочитані
                                                </button>
                                            )}
                                        </div>

                                        <div className={styles.notificationsList}>
                                            {isLoadingNotifications ? (
                                                <div className={styles.notificationsLoading}>Завантаження...</div>
                                            ) : notifications.length === 0 ? (
                                                <div className={styles.notificationsEmpty}>
                                                    Немає сповіщень
                                                </div>
                                            ) : (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''} ${getNotificationColor(notification.type)}`}
                                                        onClick={() => notification.id && markAsRead(notification.id)}
                                                    >
                                                        <div className={styles.notificationIconWrapper}>
                                                            <span className={styles.notificationTypeIcon}>
                                                                {getNotificationIcon(notification.type)}
                                                            </span>
                                                        </div>
                                                        <div className={styles.notificationContent}>
                                                            <div className={styles.notificationTitle}>
                                                                {notification.title}
                                                            </div>
                                                            <div className={styles.notificationMessage}>
                                                                {notification.message}
                                                            </div>
                                                            <div className={styles.notificationMeta}>
                                                                <span className={styles.notificationTime}>
                                                                    {timeAgo(notification.createdAt)}
                                                                </span>
                                                                <span className={styles.notificationSource}>
                                                                    {notification.source}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {!notification.isRead && (
                                                            <div className={styles.unreadDot} />
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className={styles.notificationsFooter}>
                                            <Link
                                                href="/notifications"
                                                className={styles.viewAllLink}
                                            >
                                                Переглянути всі
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.userMenu}>
                                <div className={styles.userAvatar}>👤</div>
                                <span className={styles.userName}>{user.email}</span>
                            </div>

                            <button onClick={handleLogout} className={styles.logoutBtn}>
                                Вийти
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className={styles.loginLink}>
                            Увійти
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
