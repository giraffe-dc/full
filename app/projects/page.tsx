"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Project = {
  _id: string;
  name: string;
  description?: string;
  url: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    status: "active",
    type: "interactive",
  });

  async function fetchProjects() {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.data || []);
  }

  useEffect(() => {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setUserRole(data.user.role);
          }
        })
        .catch(() => setUserRole(null));
    }, []);

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      url: "",
      status: "active",
      type: "interactive",
    });
    setEditingProject(null);
    setShowForm(false);
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      url: project.url,
      status: project.status,
      type: project.type,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingProject ? `/api/projects/${editingProject._id}` : "/api/projects";
    const method = editingProject ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      fetchProjects();
      resetForm();
    } else {
      alert("Помилка збереження");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Видалити проект?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchProjects();
    } else {
      alert("Помилка видалення");
    }
  }

  return (
    <div className={styles.container}>
      <h1>Проекти</h1>
      <p className={styles.lead}>Управління інтерактивними сайтами та додатковими проектами центру.</p>

      <div className={styles.filters}>
        <input
          placeholder="Пошук проектів..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.statusSelect}
        >
          <option value="">Всі статуси</option>
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
          <option value="development">В розробці</option>
        </select>
        {userRole === "admin" && (<button onClick={() => setShowForm(true)} className={styles.addBtn}>
          + Створити проект
        </button>)}
      </div>

      {showForm && (
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h3>{editingProject ? "Редагувати проект" : "Створити проект"}</h3>
            <input
              placeholder="Назва проекту *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              placeholder="URL *"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
            <textarea
              placeholder="Опис"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <div className={styles.formRow}>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Активний</option>
                <option value="inactive">Неактивний</option>
                <option value="development">В розробці</option>
              </select>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="interactive">Інтерактивний сайт</option>
                <option value="landing">Лендінг</option>
                <option value="app">Додаток</option>
                <option value="other">Інше</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                {editingProject ? "Оновити" : "Створити"}
              </button>
              <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.grid}>
        {projects.length === 0 ? (
          <div className={styles.empty}>Проектів не знайдено</div>
        ) : (
          projects.map((project) => (
            <div key={project._id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{project.name}</h3>
                <span className={`${styles.statusBadge} ${styles[project.status]}`}>
                  {project.status === "active" ? "Активний" : project.status === "inactive" ? "Неактивний" : "В розробці"}
                </span>
              </div>
              {project.description && (
                <p className={styles.description}>{project.description}</p>
              )}
              <div className={styles.cardMeta}>
                <div className={styles.typeBadge}>{project.type}</div>
                <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                  {project.url}
                </a>
              </div>
              {userRole === "admin" && (<div className={styles.cardFooter}>
                <div className={styles.date}>
                  Створено {new Date(project.createdAt).toLocaleDateString("uk-UA")}
                </div>
                <div className={styles.actions}>
                  <button onClick={() => handleEdit(project)} className={styles.editBtn}>
                    Редагувати
                  </button>
                  <button onClick={() => handleDelete(project._id)} className={styles.deleteBtn}>
                    Видалити
                  </button>
                </div>
              </div>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

