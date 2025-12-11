"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";

export default function Header() {
    const [user, setUser] = useState<{ email: string; role: string } | null>(null);
    const router = useRouter();

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
        // Перевіряємо авторизацію при зміні фокусу вікна (на випадок, якщо користувач залогінувався в іншій вкладці)
        window.addEventListener('focus', checkAuth);
        return () => window.removeEventListener('focus', checkAuth);
    }, []);

    function handleLogout() {
        // Call server logout to clear HttpOnly cookie
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                setUser(null);
                router.push('/login');
            })
            .catch(() => {
                // fallback: clear cookie client-side and redirect
                document.cookie = "token=; path=/; max-age=0";
                setUser(null);
                router.push('/login');
            });
    }

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>Giraffe Center</Link>
                {user && (
                    <nav className={styles.nav}>
                        <Link href="/docs">Документація</Link>
                        <Link href="/projects">Проекти</Link>
                        <Link href="/accounting">Бухгалтерія</Link>
                        <Link href="/staff">Персонал</Link>
                        <Link href="/cash-register">Каса</Link>
                        {user.role === "admin" && <Link href="/admin">Адмін</Link>}
                    </nav>
                )}
                <div className={styles.auth}>
                    {user ? (
                        <>
                            <span className={styles.userInfo}>{user.email}</span>
                            <button onClick={handleLogout} className={styles.logoutBtn}>Вийти</button>
                        </>
                    ) : (
                        <Link href="/login">Увійти</Link>
                    )}
                </div>
            </div>
        </header>
    );
}
