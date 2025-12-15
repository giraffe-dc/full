"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);
    const router = useRouter();
    const pathname = usePathname();

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
        { href: '/accounting', label: 'Бухгалтерія', icon: '📊' },
        { href: '/staff', label: 'Персонал', icon: '👥' },
        { href: '/projects', label: 'Проекти', icon: '📁' },
    ];

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
                        {navItems.map((item) => {
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
                            <button className={styles.iconButton} aria-label="Notifications">
                                <span className={styles.notificationIcon}>🔔</span>
                                <span className={styles.notificationBadge}>3</span>
                            </button>

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
