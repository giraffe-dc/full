"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useToast } from "@/components/ui/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Preloader } from "@/components/ui/Preloader";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { StaffDetailsModal } from "@/components/accounting/StaffDetailsModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  status: string;
  hireDate: string;
  salary?: number;
  createdAt: string;
};

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Confirm Modal state
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    status: "active",
    hireDate: new Date().toISOString().split("T")[0],
    salary: "",
  });

  const positions = ["manager", "instructor", "admin", "security", "maintenance", "other"];
  const positionLabels: Record<string, string> = {
    manager: "Менеджер",
    instructor: "Інструктор",
    admin: "Адміністратор",
    security: "Охорона",
    maintenance: "Обслуговування",
    other: "Інше",
  };

  const statusLabels: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'outline' }> = {
    active: { label: "Активний", variant: 'success' },
    inactive: { label: "Неактивний", variant: 'outline' },
    on_leave: { label: "У відпустці", variant: 'warning' },
  };

  async function fetchStaff() {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (positionFilter) params.append("position", positionFilter);
    if (statusFilter) params.append("status", statusFilter);
    const res = await fetch(`/api/staff?${params.toString()}`);
    const data = await res.json();
    setStaff(data.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUserRole(data.user.role);
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
        setUserRole(null);
      });
  }, [router]);

  useEffect(() => {
    fetchStaff();
  }, [search, positionFilter, statusFilter]);

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      status: "active",
      hireDate: new Date().toISOString().split("T")[0],
      salary: "",
    });
    setEditingStaff(null);
    setShowForm(false);
  }

  function handleEdit(member: StaffMember) {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      position: member.position || "",
      status: member.status,
      hireDate: new Date(member.hireDate).toISOString().split("T")[0],
      salary: member.salary ? String(member.salary) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editingStaff ? `/api/staff/${editingStaff._id}` : "/api/staff";
    const method = editingStaff ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success(editingStaff ? "Дані оновлено" : "Співробітника додано");
      fetchStaff();
      resetForm();
    } else {
      toast.error("Помилка збереження");
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete({ isOpen: true, id });
  }

  async function executeDelete() {
    if (!confirmDelete.id) return;
    const res = await fetch(`/api/staff/${confirmDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Співробітника видалено");
      fetchStaff();
    } else {
      toast.error("Помилка видалення");
    }
    setConfirmDelete({ isOpen: false, id: null });
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) return <Preloader message="Завантаження списку персоналу..." />;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              <span className={styles.pageTitleIcon}>🧑‍💼</span>
              Персонал
            </h1>
            <p className={styles.pageSubtitle}>Управління співробітниками, графіками роботи та відпустками</p>
          </div>
          <div className={styles.headerActions}>
            <button onClick={() => router.push('/staff/schedule')} className={styles.btnSecondary}>
              📅 Графік
            </button>
            {userRole === "admin" && (
              <button onClick={() => setShowForm(true)} className={styles.btnAdd}>
                + Додати співробітника
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <input
            placeholder="🔍 Пошук співробітників..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Всі посади</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {positionLabels[pos]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Всі статуси</option>
            {Object.entries(statusLabels).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(s, e) => setDateRange({ startDate: s, endDate: e })}
          />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className={styles.formOverlay}>
            <div className={styles.formModal}>
              <div className={styles.formHeader}>
                <h2>{editingStaff ? "Редагувати співробітника" : "Додати співробітника"}</h2>
                <button onClick={resetForm} className={styles.closeBtn}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Ім'я *</label>
                    <input
                      placeholder="Іван Петренко"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email *</label>
                    <input
                      type="email"
                      placeholder="ivan@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Телефон</label>
                    <input
                      type="tel"
                      placeholder="+380XXYYYZZZZ"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Дата найму</label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Посада</label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className={styles.select}
                    >
                      <option value="">Оберіть посаду</option>
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>
                          {positionLabels[pos]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Статус</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={styles.select}
                    >
                      <option value="active">Активний</option>
                      <option value="inactive">Неактивний</option>
                      <option value="on_leave">У відпустці</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Зарплата (₴)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className={styles.input}
                    />
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button type="button" onClick={resetForm} className={styles.btnCancel}>
                    Скасувати
                  </button>
                  <button type="submit" className={styles.btnSubmit}>
                    {editingStaff ? "Оновити" : "Додати"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Staff Grid */}
        <div className={styles.staffGrid}>
          {staff.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <h3 className={styles.emptyTitle}>Співробітників не знайдено</h3>
              <p className={styles.emptyText}>Додайте першого співробітника</p>
            </div>
          ) : (
            staff.map((member) => {
              const statusConfig = statusLabels[member.status] || { label: member.status, variant: 'outline' as const };
              return (
                <div key={member._id} className={styles.staffCard} onClick={() => setSelectedStaffId(member._id)}>
                  <div className={styles.staffCardHeader}>
                    <Avatar name={member.name} size="lg" variant="gradient" />
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className={styles.staffCardContent}>
                    <h3 className={styles.staffName}>{member.name}</h3>
                    {member.position && (
                      <p className={styles.staffPosition}>{positionLabels[member.position] || member.position}</p>
                    )}
                    <div className={styles.staffInfo}>
                      {member.email && (
                        <div className={styles.staffInfoRow}>
                          <span className={styles.staffInfoIcon}>📧</span>
                          <span>{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className={styles.staffInfoRow}>
                          <span className={styles.staffInfoIcon}>📱</span>
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.salary && (
                        <div className={styles.staffInfoRow}>
                          <span className={styles.staffInfoIcon}>💰</span>
                          <span>{member.salary.toFixed(2)} ₴</span>
                        </div>
                      )}
                      <div className={styles.staffInfoRow}>
                        <span className={styles.staffInfoIcon}>📅</span>
                        <span>{new Date(member.hireDate).toLocaleDateString('uk-UA')}</span>
                      </div>
                    </div>
                  </div>
                  {userRole === "admin" && (
                    <div className={styles.staffCardFooter}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                        className={styles.btnEdit}
                      >
                        ✏️ Редагувати
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(member._id); }}
                        className={styles.btnDelete}
                      >
                        🗑️ Видалити
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <ConfirmModal
          isOpen={confirmDelete.isOpen}
          title="Видалення співробітника"
          message="Ви впевнені, що хочете видалити цього співробітника? Ця дія незворотна."
          onConfirm={executeDelete}
          onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        />

        {selectedStaffId && (
          <StaffDetailsModal
            staffId={selectedStaffId}
            dateRange={dateRange}
            onClose={() => setSelectedStaffId(null)}
          />
        )}
      </div>
    </div>
  );
}

