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
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
    const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Initialize audio
    useEffect(() => {
        // Create audio element for notification sound
        audioRef.current = new Audio('/single-snorting-giraffe.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.preload = 'auto';

        return () => {
            if (audioRef.current) {
                audioRef.current = null;
            }
        };
    }, []);

    // Play notification sound from MP3 file
    const playNotificationSound = () => {
        if (hasPlayedSound || !audioRef.current) return;

        // Reset audio to start
        audioRef.current.currentTime = 0;

        audioRef.current.play().catch(e => {
            console.log('Sound play blocked by browser:', e);
        });

        setHasPlayedSound(true);
    };

    // Reset sound flag when dropdown is opened
    useEffect(() => {
        if (isNotificationsOpen) {
            setHasPlayedSound(false);
        }
    }, [isNotificationsOpen]);

    // Fetch notifications every 5 minutes
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            setIsLoadingNotifications(true);
            try {
                const res = await fetch('/api/notifications?limit=20&unread=false');
                if (res.ok) {
                    const data = await res.json();
                    const newNotifications = data.data || [];
                    const newStats = data.stats;

                    // Check if there are new notifications since last check
                    const previousUnreadCount = stats?.unread || 0;
                    const newUnreadCount = newStats?.unread || 0;

                    if (newUnreadCount > previousUnreadCount) {
                        setHasNewNotifications(true);
                        // Play sound only if dropdown is not open (user is not already looking at notifications)
                        if (!isNotificationsOpen) {
                            playNotificationSound();
                        }
                    }

                    setNotifications(newNotifications);
                    setStats(newStats);
                    setLastCheckTime(new Date());
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
                // Clear new notification indicator when user interacts
                setHasNewNotifications(false);
                // Update selected notification if it's open
                if (selectedNotification?.id === id) {
                    setSelectedNotification(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
                }
            }
        } catch (e) {
            console.error("Failed to mark as read:", e);
        }
    };

    // Open notification details modal
    const openNotificationModal = (notification: Notification) => {
        setSelectedNotification(notification);
        setIsModalOpen(true);
        // Mark as read when opening modal
        if (!notification.isRead && notification.id) {
            markAsRead(notification.id);
        }
    };

    // Close modal
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedNotification(null);
    };

    // Close notifications dropdown and clear new indicator
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
                setHasNewNotifications(false);
            }
        } catch (e) {
            console.error("Failed to mark all as read:", e);
        }
    };

    // Close notifications dropdown and clear new indicator
    const toggleNotifications = () => {
        const newState = !isNotificationsOpen;
        setIsNotificationsOpen(newState);
        // Clear new indicator when opening dropdown
        if (newState) {
            setHasNewNotifications(false);
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
                                    className={`${styles.iconButton} ${unreadCount > 0 ? styles.hasNotifications : ''} ${hasNewNotifications ? styles.hasNewNotifications : ''}`}
                                    aria-label="Notifications"
                                    onClick={toggleNotifications}
                                >
                                    <span className={styles.notificationIcon}>🔔</span>
                                    {hasNewNotifications && (
                                        <span className={styles.newNotificationDot} />
                                    )}
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
                                                        onClick={() => openNotificationModal(notification)}
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

            {/* Notification Details Modal */}
            {isModalOpen && selectedNotification && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={styles.modalTitleRow}>
                                <span className={styles.modalTypeIcon}>{getNotificationIcon(selectedNotification.type)}</span>
                                <h3 className={styles.modalTitle}>{selectedNotification.title}</h3>
                            </div>
                            <button className={styles.modalCloseBtn} onClick={closeModal}>×</button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.modalMessage}>
                                {selectedNotification.message}
                            </div>

                            {/* Metadata */}
                            {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                                <div className={styles.modalMetadata}>
                                    <h4 className={styles.metadataTitle}>Деталі</h4>
                                    <div className={styles.metadataGrid}>
                                        {selectedNotification.metadata.customerName && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Клієнт:</span>
                                                <span className={styles.metadataValue}>{selectedNotification.metadata.customerName}</span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.phone && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Телефон:</span>
                                                <span className={styles.metadataValue}>
                                                    <a href={`tel:${selectedNotification.metadata.phone}`}>
                                                        {selectedNotification.metadata.phone}
                                                    </a>
                                                </span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.date && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Дата:</span>
                                                <span className={styles.metadataValue}>
                                                    {new Date(selectedNotification.metadata.date).toLocaleDateString('uk-UA')}
                                                </span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.time && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Час:</span>
                                                <span className={styles.metadataValue}>{selectedNotification.metadata.time}</span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.status && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Статус:</span>
                                                <span className={`${styles.metadataValue} ${styles[`status${selectedNotification.metadata.status}`]}`}>
                                                    {selectedNotification.metadata.status}
                                                </span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.notes && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Нотатки:</span>
                                                <span className={styles.metadataValue}>{selectedNotification.metadata.notes}</span>
                                            </div>
                                        )}
                                        {selectedNotification.metadata.createdAt && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>Створено:</span>
                                                <span className={styles.metadataValue}>
                                                    {new Date(selectedNotification.metadata.createdAt).toLocaleString('uk-UA')}
                                                </span>
                                            </div>
                                        )}
                                        {/* {selectedNotification.metadata._id && (
                                            <div className={styles.metadataItem}>
                                                <span className={styles.metadataLabel}>ID:</span>
                                                <span className={styles.metadataValue}>{selectedNotification.metadata._id}</span>
                                            </div>
                                        )} */}
                                    </div>
                                </div>
                            )}

                            {/* Additional info */}
                            <div className={styles.modalFooter}>
                                <div className={styles.modalInfo}>
                                    <span>Джерело: <strong>{selectedNotification.source}</strong></span>
                                    <span> • </span>
                                    <span>Отримано: <strong>{timeAgo(selectedNotification.createdAt)}</strong></span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            {!selectedNotification.isRead && (
                                <button className={styles.markReadBtn} onClick={() => selectedNotification.id && markAsRead(selectedNotification.id)}>
                                    ✅ Відмітити як прочитане
                                </button>
                            )}
                            <button className={styles.closeModalBtn} onClick={closeModal}>
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
