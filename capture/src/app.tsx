import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

type CategoryKey = "unsorted" | "now" | "later" | "never";

type Note = {
  id: string;
  text: string;
  category: CategoryKey;
  createdAt: number;
};

const STORAGE_KEY = "adhd-quick-notes";
const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: "unsorted", label: "Unsorted" },
  { key: "now", label: "Now" },
  { key: "later", label: "Later" },
  { key: "never", label: "Never" },
];

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((note) => ({
      ...note,
      id: note.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

function createNote(text: string, category: CategoryKey): Note {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    category,
    createdAt: Date.now(),
  };
}

type NoteCardProps = {
  note: Note;
  onDelete: (id: string) => void;
  onMove: (id: string, category: CategoryKey) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>, noteId: string) => void;
};

function NoteCard({ note, onDelete, onMove, onUpdate, onDragStart }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(note.text);
    }
  }, [isEditing, note.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onDelete(note.id);
    } else {
      onUpdate(note.id, { text: trimmed });
    }
    setIsEditing(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      setDraft(note.text);
      setIsEditing(false);
    }
  };

  return (
    <article
      className={`note note--${note.category}`}
      draggable
      onDragStart={(event) => onDragStart(event, note.id)}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          rows={3}
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0.65rem 0.75rem",
            fontFamily: "var(--font-hand)",
            fontSize: "1rem",
            background: "var(--surface)",
            color: "var(--card-ink)",
          }}
        />
      ) : (
        <div onDoubleClick={() => setIsEditing(true)}>{note.text}</div>
      )}

      <div className="note__actions">
        {note.category !== "never" && (
          <button
            type="button"
            onClick={() => onMove(note.id, "never")}
            aria-label="Move to trash"
          >
            Trash
          </button>
        )}
        {note.category !== "now" && (
          <button type="button" onClick={() => onMove(note.id, "now")}>Now</button>
        )}
        {note.category !== "later" && (
          <button type="button" onClick={() => onMove(note.id, "later")}>Later</button>
        )}
        {note.category !== "unsorted" && (
          <button type="button" onClick={() => onMove(note.id, "unsorted")}>Unsorted</button>
        )}
        <button type="button" onClick={() => onDelete(note.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

type ThemeKey = "system" | "light" | "dark" | "browntown";

const THEME_KEY = "adhd-quick-notes-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeKey) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark", "theme-browntown");

  // Support old stored values (mixed -> dark) while removing mixed mode.
  const resolved =
    theme === "system"
      ? getSystemTheme()
      : theme;
  root.classList.add(`theme-${resolved}`);
}

function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryKey>("unsorted");
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeKey | null;
    return stored ?? "system";
  });
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dragOverCategory = useRef<CategoryKey | null>(null);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);

    if (theme === "system") {
      const listener = () => applyTheme("system");
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", listener);
      return () => {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", listener);
      };
    }
  }, [theme]);

  const notesByCategory = useMemo(() => {
    const grouping: Record<CategoryKey, Note[]> = {
      unsorted: [],
      now: [],
      later: [],
      never: [],
    };

    notes.forEach((note) => {
      (grouping[note.category] || grouping.unsorted).push(note);
    });

    return grouping;
  }, [notes]);

  const onAdd = () => {
    const text = newText.trim();
    if (!text) return;
    setNotes((prev) => [createNote(text, newCategory), ...prev]);
    setNewText("");
  };

  const onDelete = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const updateNote = (noteId: string, patch: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, ...patch } : note))
    );
  };

  const moveNote = (noteId: string, category: CategoryKey) => {
    updateNote(noteId, { category });
  };

  const clearNever = () => {
    setNotes((prev) => prev.filter((note) => note.category !== "never"));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onAdd();
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLElement>, noteId: string) => {
    event.dataTransfer.setData("text/plain", noteId);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOverColumn = (event: React.DragEvent<HTMLDivElement>, category: CategoryKey) => {
    event.preventDefault();
    dragOverCategory.current = category;
    event.dataTransfer.dropEffect = "move";
  };

  const onDropInColumn = (event: React.DragEvent<HTMLDivElement>, category: CategoryKey) => {
    event.preventDefault();
    const noteId = event.dataTransfer.getData("text/plain");
    if (!noteId) return;
    moveNote(noteId, category);
  };

  const themeOptions: Array<{
    key: ThemeKey;
    label: string;
    emoji: string;
  }> = [
    { key: "system", label: "System", emoji: "🖥️" },
    { key: "light", label: "Light", emoji: "☀️" },
    { key: "dark", label: "Dark", emoji: "🌙" },
    { key: "browntown", label: "Browntown", emoji: "🟤" },
  ];

  const currentThemeOption =
    themeOptions.find((option) => option.key === theme) ?? themeOptions[0];

  const themeDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setThemeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand__dot">•</span>
          <div>
            <div className="brand__name">Capture</div>
            <div className="brand__subtitle">Sort thoughts into now / later / never</div>
          </div>
        </div>

        <div className="topbar__actions">
          <div className="theme-selector" ref={themeDropdownRef}>
            <button
              type="button"
              className="theme-selector__button"
              aria-haspopup="listbox"
              aria-expanded={themeDropdownOpen}
              onClick={() => setThemeDropdownOpen((prev) => !prev)}
            >
              <span className="theme-selector__emoji">
                {currentThemeOption.emoji}
              </span>
              <span className="theme-selector__label">
                {currentThemeOption.label}
              </span>
              <span className="theme-selector__chevron">▾</span>
            </button>

            {themeDropdownOpen && (
              <ul className="theme-selector__menu" role="listbox">
                {themeOptions.map((option) => (
                  <li
                    key={option.key}
                    role="option"
                    aria-selected={option.key === theme}
                    className={`theme-selector__item ${{
                      "theme-selector__item--active": option.key === theme,
                    }}`}
                    onClick={() => {
                      setTheme(option.key);
                      setThemeDropdownOpen(false);
                    }}
                  >
                    <span className="theme-selector__emoji">{option.emoji}</span>
                    <span className="theme-selector__label">
                      {option.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="help">
            <button
              type="button"
              className="help__link"
              onClick={() => setHelpOpen((prev) => !prev)}
            >
              How it works
            </button>
          </div>
        </div>
      </header>

      <main className="app">
        <section className="add-note">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a quick thought..."
            aria-label="New note text"
          />
          <div className="add-note__meta">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as CategoryKey)}
              aria-label="Category for new note"
            >
              {CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
            <button className="button" onClick={onAdd}>
              Add note
            </button>
          </div>
        </section>

        <section className="board" aria-label="Notes board">
          {CATEGORIES.map((category) => {
            const notesForCategory = (notesByCategory[category.key] || []).slice();
            const sortedNotes = notesForCategory.sort((a, b) => b.createdAt - a.createdAt);

            return (
              <div
                key={category.key}
                className="column"
                data-category={category.key}
                onDragOver={(event) => onDragOverColumn(event, category.key)}
                onDrop={(event) => onDropInColumn(event, category.key)}
              >
                <header className="column__header">
                  <h2>{category.label}</h2>
                  <p className="column__hint">
                    {category.key === "unsorted"
                      ? "Quick capture. Move to Now/Later when ready."
                      : category.key === "now"
                      ? "Do these next."
                      : category.key === "later"
                      ? "Save for later, review later."
                      : "Trash bin, can be cleared anytime."}
                  </p>
                </header>

                <div className="column__notes" data-notes={category.key}>
                  {sortedNotes.length === 0 ? (
                    <div
                      style={{
                        padding: "0.8rem 1rem",
                        borderRadius: "14px",
                        background: "var(--surface)",
                        border: "1px dashed var(--border)",
                        color: "var(--muted)",
                        fontSize: "0.9rem",
                      }}
                    >
                      Drag a note here or add one.
                    </div>
                  ) : (
                    sortedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onMove={moveNote}
                        onDelete={onDelete}
                        onUpdate={updateNote}
                        onDragStart={onDragStart}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <aside
        id="help"
        className="help-panel"
        data-visible={helpOpen ? "true" : "false"}
        aria-hidden={!helpOpen}
      >
        <div className="help-panel__card">
          <h2>How to use</h2>
          <ul>
            <li>Write a thought, pick a category, and click "Add note".</li>
            <li>Drag notes between columns to re-categorize them.</li>
            <li>Use the action buttons or double-click to edit a note.</li>
            <li>
              Notes are stored only in this browser. Clear the "Never" column to
              free space.
            </li>
          </ul>
          <button
            className="button button--secondary"
            onClick={() => setHelpOpen(false)}
          >
            Close
          </button>
        </div>
      </aside>

      <footer className="footer">
        <span>Notes are saved locally in your browser.</span>
        <button className="button button--secondary" onClick={clearNever}>
          Clear Never (Trash)
        </button>
      </footer>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
