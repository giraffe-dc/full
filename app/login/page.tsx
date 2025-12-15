"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.replace("/");
      } else {
        setError(data.error || "Помилка входу. Перевірте email та пароль.");
        setLoading(false);
      }
    } catch (err) {
      setError("Помилка з'єднання. Спробуйте ще раз.");
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🦒</div>
          <h1 className={styles.title}>Giraffe</h1>
          <p className={styles.subtitle}>Вхід до системи</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={submit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              placeholder="your@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Пароль</label>
            <input
              className={styles.input}
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>

        <div className={styles.footer}>
          Система управління розважальним центром
        </div>
      </div>
    </div>
  );
}
