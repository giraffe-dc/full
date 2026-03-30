"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";
import type { Notification, NotificationStats } from "@/types/accounting";
import { AdminChatOverlay } from "./admin/AdminChatOverlay";
import { useChatAdmin } from "@/lib/use-chat-admin";

export default function Header() {
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasPlayedSound, setHasPlayedSound] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const notificationsRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
    const [showScrollGradient, setShowScrollGradient] = useState(false);
    const prevUnreadChatsCount = useRef(0);

    // Background chat polling
    const { chats: adminChats } = useChatAdmin({
        pollingInterval: 60000,
        autoStart: !!user,
        adminModeOnly: true,
    });

    const unreadChatsCount = adminChats.filter(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        return lastMsg?.role === "user";
    }).length;

    // Chat sound notification
    useEffect(() => {
        if (unreadChatsCount > prevUnreadChatsCount.current) {
            playNotificationSound(true);
        }
        prevUnreadChatsCount.current = unreadChatsCount;
    }, [unreadChatsCount]);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('/single-snorting-giraffe.mp3');
        audioRef.current.volume = 0.5;
        audioRef.current.preload = 'auto';
        return () => { if (audioRef.current) audioRef.current = null; };
    }, []);

    // Play notification sound
    const playNotificationSound = (force = false) => {
        if (!force && (hasPlayedSound || !audioRef.current)) return;
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log('Sound blocked:', e));
        if (!force) setHasPlayedSound(true);
    };

    useEffect(() => {
        if (isNotificationsOpen) setHasPlayedSound(false);
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
                    const previousUnreadCount = stats?.unread || 0;
                    const newUnreadCount = newStats?.unread || 0;
                    if (newUnreadCount > previousUnreadCount) {
                        setHasNewNotifications(true);
                        if (!isNotificationsOpen) playNotificationSound();
                    }
                    setNotifications(newNotifications);
                    setStats(newStats);
                }
            } catch (e) {
                console.error("Failed to fetch notifications:", e);
            } finally {
                setIsLoadingNotifications(false);
            }
        };
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [user]);

    // Handle nav scroll gradient
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const checkScroll = () => {
            setShowScrollGradient(nav.scrollLeft > 20);
        };
        nav.addEventListener('scroll', checkScroll);
        checkScroll();
        return () => nav.removeEventListener('scroll', checkScroll);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest(`.${styles.mobileMenuButton}`)) {
                setIsMobileMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    // Mark notification as read
    const markAsRead = async (id: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
                if (stats) setStats(prev => prev ? { ...prev, unread: Math.max(0, prev.unread - 1) } : null);
                setHasNewNotifications(false);
                if (selectedNotification?.id === id) {
                    setSelectedNotification(prev => prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : null);
                }
            }
        } catch (e) {
            console.error("Failed to mark as read:", e);
        }
    };

    const openNotificationModal = (notification: Notification) => {
        setSelectedNotification(notification);
        setIsModalOpen(true);
        if (!notification.isRead && notification.id) markAsRead(notification.id);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedNotification(null);
    };

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

    const toggleNotifications = () => {
        const newState = !isNotificationsOpen;
        setIsNotificationsOpen(newState);
        if (newState) setHasNewNotifications(false);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'system': return '⚙️';
            default: return 'ℹ️';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'success': return styles.notificationSuccess;
            case 'warning': return styles.notificationWarning;
            case 'error': return styles.notificationError;
            case 'system': return styles.notificationSystem;
            default: return styles.notificationInfo;
        }
    };

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
                .then((data) => setUser(data.authenticated ? data.user : null))
                .catch(() => setUser(null));
        }
        checkAuth();
        window.addEventListener('focus', checkAuth);
        return () => window.removeEventListener('focus', checkAuth);
    }, []);

    function handleLogout() {
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => { setUser(null); router.push('/login'); })
            .catch(() => {
                document.cookie = "token=; path=/; max-age=0";
                setUser(null);
                router.push('/login');
            });
    }

    const navItems = [
        { href: '/cash-register', label: 'Каса', icon: '💰' },
        // { href: '/clients', label: 'Клієнти', icon: '👥' },
        // { href: '/supply', label: 'Постачання', icon: '📦' },
        { href: '/accounting', label: 'Бухгалтерія', icon: '📊' },
        { href: '/visits', label: 'Відвідування', icon: '🕒' },
        { href: '/events', label: 'Бронювання', icon: '🎉' },
        { href: '/telegram', label: 'Telegram', icon: '📱' },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (user?.role === 'user') {
            return ['/cash-register', '/supply', '/visits', '/events', '/telegram', '/clients'].includes(item.href);
        }
        return true;
    });

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
                    <>
                        <button
                            className={`${styles.navScrollBtn} ${styles.visible} `}
                            onClick={() => navRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                            aria-label="Scroll left"
                        >
                            ‹
                        </button>

                        <nav className={`${styles.nav} ${styles.navDesktop}`} ref={navRef}>
                            {filteredNavItems.map((item) => {
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

                        <button
                            className={`${styles.navScrollBtn} ${styles.visible}`}
                            onClick={() => navRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                            aria-label="Scroll right"
                        >
                            ›
                        </button>
                    </>
                )}

                {/* Right Section */}
                <div className={styles.rightSection}>
                    {user ? (
                        <>
                            {/* Mobile Menu Button */}
                            <button
                                className={`${styles.mobileMenuButton} ${styles.mobileOnly} ${isMobileMenuOpen ? styles.active : ''}`}
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                aria-label="Toggle menu"
                            >
                                <span className={styles.hamburger}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </span>
                            </button>

                            {/* Admin Chat */}
                            <div className={styles.notificationsWrapper}>
                                <button
                                    className={`${styles.iconButton} ${isAdminChatOpen ? styles.navItemActive : ''}`}
                                    onClick={() => setIsAdminChatOpen(!isAdminChatOpen)}
                                    aria-label="Chat Support"
                                >
                                    <span className={styles.notificationIcon}>💬</span>
                                    {unreadChatsCount > 0 && (
                                        <span className={styles.notificationBadge}>
                                            {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Notifications */}
                            <div className={styles.notificationsWrapper} ref={notificationsRef}>
                                <button
                                    className={`${styles.iconButton} ${unreadCount > 0 ? styles.hasNotifications : ''} ${hasNewNotifications ? styles.hasNewNotifications : ''}`}
                                    onClick={toggleNotifications}
                                    aria-label="Notifications"
                                >
                                    <span className={styles.notificationIcon}>🔔</span>
                                    {hasNewNotifications && <span className={styles.newNotificationDot} />}
                                    {unreadCount > 0 && (
                                        <span className={styles.notificationBadge}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {isNotificationsOpen && (
                                    <div className={styles.notificationsDropdown}>
                                        <div className={styles.notificationsHeader}>
                                            <h3 className={styles.notificationsTitle}>Сповіщення</h3>
                                            {unreadCount > 0 && (
                                                <button className={styles.markAllReadBtn} onClick={markAllAsRead}>
                                                    Відмітити всі як прочитані
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.notificationsList}>
                                            {isLoadingNotifications ? (
                                                <div className={styles.notificationsLoading}>Завантаження...</div>
                                            ) : notifications.length === 0 ? (
                                                <div className={styles.notificationsEmpty}>Немає сповіщень</div>
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
                                                            <div className={styles.notificationTitle}>{notification.title}</div>
                                                            <div className={styles.notificationMessage}>{notification.message}</div>
                                                            <div className={styles.notificationMeta}>
                                                                <span className={styles.notificationTime}>{timeAgo(notification.createdAt)}</span>
                                                                <span className={styles.notificationSource}>{notification.source}</span>
                                                            </div>
                                                        </div>
                                                        {!notification.isRead && <div className={styles.unreadDot} />}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className={styles.notificationsFooter}>
                                            <Link href="/notifications" className={styles.viewAllLink}>Переглянути всі</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className={styles.userMenu}>
                                <div className={styles.userAvatar}>👤</div>
                                {/* <span className={styles.userName}>{user.email}</span> */}
                            </div>

                            <button onClick={handleLogout} className={styles.logoutBtn}>Вийти</button>
                        </>
                    ) : (
                        <Link href="/login" className={styles.loginLink}>Увійти</Link>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && user && (
                <>
                    <div className={styles.mobileMenuOverlay} />
                    <div className={styles.mobileMenu} ref={mobileMenuRef}>
                        <div className={styles.mobileMenuHeader}>
                            <div className={styles.mobileUserInfo}>
                                <div className={styles.userAvatar}>👤</div>
                                <span className={styles.userName}>{user.email}</span>
                            </div>
                            <button className={styles.closeMenuButton} onClick={() => setIsMobileMenuOpen(false)}>✕</button>
                        </div>
                        <nav className={styles.mobileNav}>
                            {filteredNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                return (
                                    <Link key={item.href} href={item.href} className={`${styles.mobileNavItem} ${isActive ? styles.active : ''}`}>
                                        <span className={styles.navIcon}>{item.icon}</span>
                                        <span className={styles.navLabel}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className={styles.mobileMenuFooter}>
                            <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
                                <span className={styles.navIcon}>🚪</span> Вийти
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Notification Modal */}
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
                            <div className={styles.modalMessage}>{selectedNotification.message}</div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.modalCloseButton} onClick={closeModal}>Закрити</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Chat Overlay */}
            <AdminChatOverlay isOpen={isAdminChatOpen} onClose={() => setIsAdminChatOpen(false)} />
        </header>
    );
}
