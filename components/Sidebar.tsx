"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";

export interface SidebarItem {
    href: string;
    label: string;
    icon: string;
    roles?: string[];
}

interface SidebarProps {
    items: SidebarItem[];
    userRole?: string;
}

export function Sidebar({ items, userRole }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Filter items by role
    const filteredItems = items.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        if (!userRole) return true;
        return item.roles.includes(userRole);
    });

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    // Toggle collapse
    const handleToggle = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
        // Dispatch custom event for main content to update
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: newState } }));
    };

    // Handle keyboard toggle (Ctrl/Cmd + B)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleToggle();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isCollapsed]);

    if (!isMounted) {
        return null;
    }

    return (
        <aside
            className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded} ${isHovered ? styles.hovered : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-collapsed={isCollapsed}
        >
            {/* Toggle Button */}
            <button
                className={`${styles.toggleBtn} ${isCollapsed ? styles.collapsed : ''}`}
                onClick={handleToggle}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title="Сховати/показати меню (⌘/Ctrl + B)"
            >
                {isCollapsed ? '›' : '‹'}
            </button>

            {/* Logo */}
            <Link href="/" className={styles.logo}>
                <span className={styles.logoIcon}>🦒</span>
                {!isCollapsed && <span className={styles.logoText}>Giraffe</span>}
            </Link>

            {/* Navigation */}
            <nav className={styles.nav}>
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                            {isActive && !isCollapsed && (
                                <span className={styles.activeIndicator} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Actions */}
            {!isCollapsed && (
                <div className={styles.quickActions}>
                    <h4 className={styles.quickActionsTitle}>Швидкі дії</h4>
                    <button className={styles.quickActionBtn}>
                        <span className={styles.quickActionIcon}>💰</span>
                        Новий продаж
                    </button>
                    <button className={styles.quickActionBtn}>
                        <span className={styles.quickActionIcon}>🎉</span>
                        Нове бронювання
                    </button>
                    <button className={styles.quickActionBtn}>
                        <span className={styles.quickActionIcon}>👥</span>
                        Новий клієнт
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className={styles.footer}>
                {!isCollapsed ? (
                    <div className={styles.footerContent}>
                        <span className={styles.footerText}>Giraffe v1.0</span>
                        <span className={styles.footerText}>© 2026</span>
                    </div>
                ) : (
                    <span className={styles.footerIcon}>🦒</span>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
