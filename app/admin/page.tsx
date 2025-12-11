"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.data || []);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function createUser(e: any) {
    e.preventDefault();
    await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role }) });
    setName(""); setEmail(""); setPassword(""); setRole("staff");
    fetchUsers();
  }

  return (
    <div className={styles.root}>
      <section className={styles.main}>
        <h1>Адмін панель</h1>
        <h2>Користувачі</h2>
        <ul className={styles.list}>
          {users.map((u) => (
            <li key={u._id}>{u.name} — {u.email} — {u.role}</li>
          ))}
        </ul>
      </section>

      <aside className={styles.aside}>
        <h2>Створити користувача</h2>
        <form onSubmit={createUser} className={styles.form}>
          <input placeholder="Ім'я" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit">Створити</button>
        </form>
      </aside>
    </div>
  );
}
