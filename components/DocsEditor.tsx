"use client";

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import styles from './DocsEditor.module.css';

type Document = {
  _id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
};

export default function DocsEditor({
  document,
  onSave,
  onCancel,
}: {
  document?: Document | null;
  onSave?: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Введіть текст документа...' }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
    ],
    content: '',
  });

  // Завантаження даних документа або чернетки для нового документа
  useEffect(() => {
    if (!editor) return;

    if (document) {
      setTitle(document.title);
      setCategory(document.category || 'general');
      editor.commands.setContent(document.content);
      return;
    }

    // Новий документ: пробуємо підвантажити чернетку з localStorage (тільки в браузері)
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('giraffe_docs_draft');
        if (raw) {
          const draft = JSON.parse(raw) as {
            title?: string;
            category?: string;
            content?: string;
          };
          setTitle(draft.title || '');
          setCategory(draft.category || 'general');
          editor.commands.setContent(draft.content || '');
          return;
        }
      } catch {
        // ignore corrupted draft
      }
    }

    setTitle('');
    setCategory('general');
    editor.commands.setContent('');
  }, [document, editor]);

  // Autosave чернетки для нового документа
  const unsubscribeRef = useRef<{ destroy: () => void }|null>(null);
  useEffect(() => {
    if (!editor) return;
    if (document) return; // редагування існуючого документа – без autosave у localStorage

    if (typeof window === 'undefined') return;

    const handler = () => {
      const content = editor.getHTML();
      const payload = {
        title,
        category,
        content,
      };
      try {
        window.localStorage.setItem('giraffe_docs_draft', JSON.stringify(payload));
      } catch {
        // ignore quota / storage errors
      }
    };

    // Store the unsubscribe function
    const unsubscribe = editor.on('update', handler);
    unsubscribeRef.current = unsubscribe;

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current.destroy();
      }
    };
  }, [editor, document, title, category]);

  async function save() {
    if (!title.trim()) {
      alert('Введіть заголовок');
      return;
    }
    if (!editor) return;

    const content = editor.getHTML();
    if (!content.trim()) {
      alert('Введіть текст документа');
      return;
    }

    setSaving(true);
    try {
      const url = document ? `/api/docs/${document._id}` : '/api/docs';
      const method = document ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });

      if (!res.ok) {
        throw new Error('Помилка збереження');
      }

      // Після успішного збереження очищаємо чернетку для нового документа
      if (!document && typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('giraffe_docs_draft');
        } catch {
          // ignore
        }
      }

      if (onSave) onSave();
    } catch (err) {
      alert('Помилка збереження документа');
    } finally {
      setSaving(false);
    }
  }

  if (!editor) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3>{document ? 'Редагувати документ' : 'Створити документ'}</h3>
        {onCancel && (
          <button onClick={onCancel} className={styles.cancelBtn}>
            ×
          </button>
        )}
      </div>
      <input
        placeholder="Заголовок"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={styles.titleInput}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={styles.categorySelect}
      >
        <option value="general">Загальне</option>
        <option value="instruction">Інструкції</option>
        <option value="scenario">Сценарії</option>
        <option value="checklist">Чеклисти</option>
        <option value="other">Інше</option>
      </select>
      <div className={styles.toolbar}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.active : ''}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.active : ''}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? styles.active : ''}
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? styles.active : ''}
        >
          1.
        </button>
        <button
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href as string | undefined;
            // eslint-disable-next-line no-alert
            const url = window.prompt('Введіть URL посилання', previousUrl || 'https://');
            if (url === null) return;
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run();
          }}
          className={editor.isActive('link') ? styles.active : ''}
        >
          🔗
        </button>
      </div>
      <div className={styles.editable}>
        <EditorContent editor={editor} />
      </div>
      <div className={styles.saveWrap}>
        <button
          className={styles.saveBtn}
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Збереження...' : document ? 'Оновити' : 'Зберегти документ'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className={styles.cancelBtn}>
            Скасувати
          </button>
        )}
      </div>
    </div>
  );
}
