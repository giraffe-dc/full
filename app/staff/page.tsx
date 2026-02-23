"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { useToast } from "@/components/ui/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Preloader } from "@/components/ui/Preloader";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { StaffDetailsModal } from "@/components/accounting/StaffDetailsModal";

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

  if (loading) return <Preloader message="Завантаження списку персоналу..." />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Персонал</h1>
        <p className={styles.lead}>Управління співробітниками, графіками роботи та відпустками.</p>
      </div>

      <div className={styles.filters}>
        <input
          placeholder="Пошук співробітників..."
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
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
          <option value="on_leave">У відпустці</option>
        </select>
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={(s, e) => setDateRange({ startDate: s, endDate: e })}
        />
        {userRole === "admin" && (<button onClick={() => setShowForm(true)} className={styles.addBtn}>
          + Додати співробітника
        </button>)}
      </div>

      {showForm && (
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h3>{editingStaff ? "Редагувати співробітника" : "Додати співробітника"}</h3>
            <div className={styles.formRow}>
              <input
                placeholder="Ім'я *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className={styles.formRow}>
              <input
                placeholder="Телефон"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                type="date"
                placeholder="Дата найму"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              >
                <option value="">Оберіть посаду</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {positionLabels[pos]}
                  </option>
                ))}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Активний</option>
                <option value="inactive">Неактивний</option>
                <option value="on_leave">У відпустці</option>
              </select>
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="Зарплата (₴)"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                {editingStaff ? "Оновити" : "Додати"}
              </button>
              <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.grid}>
        {staff.length === 0 ? (
          <div className={styles.empty}>Співробітників не знайдено</div>
        ) : (
          staff.map((member) => (
            <div key={member._id} className={styles.card} onClick={() => setSelectedStaffId(member._id)} style={{ cursor: 'pointer' }}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>{member.name}</h3>
                  <p className={styles.email}>{member.email}</p>
                </div>
                <span className={`${styles.statusBadge} ${styles[member.status]}`}>
                  {member.status === "active" ? "Активний" : member.status === "inactive" ? "Неактивний" : "У відпустці"}
                </span>
              </div>
              <div className={styles.cardBody}>
                {member.position && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Посада:</span>
                    <span>{positionLabels[member.position] || member.position}</span>
                  </div>
                )}
                {member.phone && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Телефон:</span>
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.salary && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Зарплата:</span>
                    <span>{member.salary.toFixed(2)} ₴</span>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span className={styles.label}>Дата найму:</span>
                  <span>{new Date(member.hireDate).toLocaleDateString("uk-UA")}</span>
                </div>
              </div>
              <div className={styles.cardFooter}>
                {userRole === "admin" && (<div className={styles.actions}>
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(member); }} className={styles.editBtn}>
                    Редагувати
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(member._id); }} className={styles.deleteBtn}>
                    Видалити
                  </button>
                </div>)}
              </div>
            </div>
          ))
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
  );
}

