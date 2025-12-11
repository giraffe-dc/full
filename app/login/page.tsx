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
        // Даємо час cookie встановитися перед редиректом
        await new Promise(resolve => setTimeout(resolve, 100));
        // Використовуємо window.location для надійного редиректу
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
    <div className={styles.root}>
      <h1>Увійти</h1>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={submit} className={styles.form}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <input
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </form>
    </div>
  );
}
