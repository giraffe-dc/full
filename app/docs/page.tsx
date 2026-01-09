"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import DocsEditor from "../../components/DocsEditor";

type Document = {
  _id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
};

export default function DocsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const categories = ["general", "instruction", "scenario", "checklist", "other"];

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

  async function fetchDocs() {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    const res = await fetch(`/api/docs?${params.toString()}`);
    const data = await res.json();
    setDocs(data.data || []);
  }

  useEffect(() => {
    fetchDocs();
  }, [search, category]);

  async function handleDelete(id: string) {
    if (!confirm("Видалити документ?")) return;
    const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchDocs();
    } else {
      alert("Помилка видалення");
    }
  }

  function handleEdit(doc: Document) {
    setEditingDoc(doc);
    setShowEditor(true);
  }

  function handleEditorClose() {
    setEditingDoc(null);
    setShowEditor(false);
  }

  function handleDownload(doc: Document) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #f9fafb;
    }
    h1, h2, h3 {
      color: #111827;
      margin-top: 1.5em;
    }
    h1 { border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
    .meta {
      color: #6b7280;
      font-size: 0.9em;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    ul, ol { margin-left: 20px; }
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "Monaco", "Courier New", monospace;
    }
    pre {
      background-color: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #f59e0b;
      padding-left: 20px;
      color: #6b7280;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>${doc.title}</h1>
  <div class="meta">
    <strong>Категорія:</strong> ${doc.category || "Не вказано"}<br>
    <strong>Створено:</strong> ${new Date(doc.createdAt).toLocaleDateString("uk-UA")}
    ${doc.updatedAt && doc.updatedAt !== doc.createdAt ? `<br><strong>Оновлено:</strong> ${new Date(doc.updatedAt).toLocaleDateString("uk-UA")}` : ""}
  </div>
  <hr>
  <div>
    ${doc.content}
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.title.replace(/[\/\\:*?"<>|]/g, "_")}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Документація центру</h1>
        <p className={styles.lead}>Сценарії, чеклисти, інструкції та інші документи.</p>
      </div>

      <div className={styles.filters}>
        <input
          placeholder="Пошук документів..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.categorySelect}
        >
          <option value="">Всі категорії</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "general" ? "Загальне" : cat === "instruction" ? "Інструкції" : cat === "scenario" ? "Сценарії" : cat === "checklist" ? "Чеклисти" : "Інше"}
            </option>
          ))}
        </select>
        {userRole === "admin" && (
          <button onClick={() => setShowEditor(true)} className={styles.addBtn}>
            + Створити документ
          </button>
        )}
      </div>

      {showEditor && (
        <div className={styles.editorSection}>
          <DocsEditor
            document={editingDoc}
            onSave={() => {
              fetchDocs();
              handleEditorClose();
            }}
            onCancel={handleEditorClose}
          />
        </div>
      )}

      <ul className={styles.list}>
        {docs.length === 0 ? (
          <li className={styles.empty}>Документів не знайдено</li>
        ) : (
          docs.map((d) => (
            <li key={d._id} className={styles.docItem}>
              <div className={styles.docHeader}>
                <strong
                  className={styles.docTitle}
                  onClick={() => setViewingDoc(d)}
                  style={{ cursor: "pointer" }}
                >
                  {d.title}
                </strong>
                {userRole === "admin" && (
                  <div className={styles.docActions}>
                    <button onClick={() => handleEdit(d)} className={styles.editBtn}>
                      Редагувати
                    </button>
                    <button onClick={() => handleDelete(d._id)} className={styles.deleteBtn}>
                      Видалити
                    </button>
                  </div>
                )}
              </div>
              {d.category && (
                <span className={styles.categoryBadge}>{d.category}</span>
              )}
              <div
                className={styles.preview}
                dangerouslySetInnerHTML={{ __html: d.content.substring(0, 200) + (d.content.length > 200 ? "..." : "") }}
              />
              <div className={styles.meta}>
                Створено {new Date(d.createdAt).toLocaleDateString("uk-UA")}
                {d.updatedAt && d.updatedAt !== d.createdAt && (
                  <> • Оновлено {new Date(d.updatedAt).toLocaleDateString("uk-UA")}</>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {viewingDoc && (
        <div className={styles.modalOverlay} onClick={() => setViewingDoc(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{viewingDoc.title}</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setViewingDoc(null)}
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            {viewingDoc.category && (
              <div className={styles.modalMeta}>
                <span className={styles.badge}>{viewingDoc.category}</span>
                <span className={styles.date}>
                  Створено {new Date(viewingDoc.createdAt).toLocaleDateString("uk-UA")}
                  {viewingDoc.updatedAt && viewingDoc.updatedAt !== viewingDoc.createdAt && (
                    <> • Оновлено {new Date(viewingDoc.updatedAt).toLocaleDateString("uk-UA")}</>
                  )}
                </span>
              </div>
            )}

            <div className={styles.modalContent}>
              <div
                dangerouslySetInnerHTML={{ __html: viewingDoc.content }}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => handleDownload(viewingDoc)}
                className={styles.downloadBtn}
              >
                ⬇ Скачати HTML
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                className={styles.closeModalBtn}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
