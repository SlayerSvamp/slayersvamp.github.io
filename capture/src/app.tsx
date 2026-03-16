import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useReducer,
  useState,
} from "react";
import ReactDOM from "react-dom/client";
import { FiClock, FiFileText, FiPlus, FiTrash2, FiZap, FiEdit2 } from "react-icons/fi";

type CategoryKey = "unsorted" | "now" | "later" | "never";

type Note = {
  id: string;
  text: string;
  category: CategoryKey;
  createdAt: number;
};

const STORAGE_KEY = "capture-notes";
const CATEGORIES: Array<{ key: CategoryKey; label: string; icon: React.ReactNode }> = [
  { key: "unsorted", label: "Unsorted", icon: <FiFileText /> },
  { key: "now", label: "Now", icon: <FiZap /> },
  { key: "later", label: "Later", icon: <FiClock /> },
  { key: "never", label: "Never", icon: <FiTrash2 /> },
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
  onDrop?: (
    draggedId: string,
    targetId: string,
    position?: "before" | "after"
  ) => void;
  onDragOver?: (event: React.DragEvent<HTMLElement>, targetId: string) => void;
  onDragLeave?: (targetId: string) => void;
  onDragEnd?: () => void;
  dragHint?: { targetId: string; position: "before" | "after" } | null;
  isDragging?: boolean;
  registerRef?: (id: string, el: HTMLElement | null) => void;
};

function NoteCard({
  note,
  onDelete,
  onMove,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
  onDragEnd,
  dragHint,
  isDragging,
  registerRef,
}: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isDragTarget = dragHint?.targetId === note.id;
  const dragPosition = isDragTarget ? dragHint?.position : undefined;
  const dropClass = dragPosition ? `note--drop-${dragPosition}` : "";
  const dragClass = isDragging ? "note--dragging" : "";

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
      ref={(el) => registerRef?.(note.id, el)}
      className={`note note--${note.category} ${dropClass} ${dragClass}`}
      data-note-id={note.id}
      draggable
      onDragStart={(event) => onDragStart(event, note.id)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(event, note.id);
      }}
      onDragLeave={() => onDragLeave?.(note.id)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const draggedId = event.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === note.id) return;

        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const insertAfter = event.clientY > rect.top + rect.height / 2;
        onDrop?.(draggedId, note.id, insertAfter ? "after" : "before");
      }}
      onDragEnd={onDragEnd}
    >
      <div className="note__topActions">
        <button
          type="button"
          className="note__edit"
          onClick={() => setIsEditing(true)}
          aria-label="Edit note"
        >
          <FiEdit2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className="note__delete"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          rows={3}
          style={{
            marginTop: "0.25rem",
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
        {note.category !== "unsorted" && (
          <button type="button" onClick={() => onMove(note.id, "unsorted")}>Unsorted</button>
        )}
        {note.category !== "now" && (
          <button type="button" onClick={() => onMove(note.id, "now")}>Now</button>
        )}
        {note.category !== "later" && (
          <button type="button" onClick={() => onMove(note.id, "later")}>Later</button>
        )}
        {note.category !== "never" && (
          <button
            type="button"
            onClick={() => onMove(note.id, "never")}
            aria-label="Move to never"
          >
            Never
          </button>
        )}
      </div>
    </article>
  );
}

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type HistoryAction<T> =
  | { type: "SET"; value: T }
  | { type: "UNDO" }
  | { type: "REDO" };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case "SET": {
      if (action.value === state.present) return state;
      const nextPast = [...state.past, state.present];
      // Keep a reasonable history cap
      const cappedPast = nextPast.slice(-50);
      return {
        past: cappedPast,
        present: action.value,
        future: [],
      };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

type ThemeKey = "system" | "light" | "dark" | "browntown";

const THEME_KEY = "capture-notes-theme";

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
  const [history, dispatchHistory] = useReducer(historyReducer<Note[]>, {
    past: [],
    present: loadNotes(),
    future: [],
  });
  const notes = history.present;

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryKey>("unsorted");
  const [helpOpen, setHelpOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeKey | null;
    return stored ?? "system";
  });
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dragOverCategory = useRef<CategoryKey | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragHint, setDragHint] = useState<
    | { targetId: string; position: "before" | "after" }
    | null
  >(null);

  const noteRefs = useRef(new Map<string, HTMLElement>());
  const pendingFlipPositions = useRef<Map<string, DOMRect> | null>(null);

  const registerNoteRef = (id: string, el: HTMLElement | null) => {
    if (el) {
      noteRefs.current.set(id, el);
    } else {
      noteRefs.current.delete(id);
    }
  };

  const captureNotePositions = () => {
    const positions = new Map<string, DOMRect>();
    noteRefs.current.forEach((el, id) => {
      positions.set(id, el.getBoundingClientRect());
    });
    return positions;
  };

  const runFlipAnimation = () => {
    const before = pendingFlipPositions.current;
    if (!before) return;
    const after = captureNotePositions();
    pendingFlipPositions.current = null;

    after.forEach((newRect, id) => {
      const oldRect = before.get(id);
      if (!oldRect) return;

      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (dx === 0 && dy === 0) return;

      const el = noteRefs.current.get(id);
      if (!el) return;

      // Invert the movement then play it back with a springier transition.
      el.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.willChange = "transform";
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        el.style.transform = "";
      });

      const cleanup = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") return;
        el.style.transition = "";
        el.style.willChange = "";
        el.removeEventListener("transitionend", cleanup);
      };

      el.addEventListener("transitionend", cleanup);
    });
  };

  useLayoutEffect(() => {
    if (pendingFlipPositions.current) {
      runFlipAnimation();
    }
  });

  const areNotesEqual = (a: Note[], b: Note[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const n1 = a[i];
      const n2 = b[i];
      if (
        n1.id !== n2.id ||
        n1.text !== n2.text ||
        n1.category !== n2.category ||
        n1.createdAt !== n2.createdAt
      ) {
        return false;
      }
    }
    return true;
  };

  const setNotes = (next: Note[] | ((prev: Note[]) => Note[])) => {
    const nextNotes = typeof next === "function" ? (next as (prev: Note[]) => Note[])(notes) : next;
    if (areNotesEqual(notes, nextNotes)) return;
    dispatchHistory({ type: "SET", value: nextNotes });
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

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
    setNotes((prev) => [...prev, createNote(text, newCategory)]);
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
    pendingFlipPositions.current = captureNotePositions();

    setNotes((prev) => {
      const noteIndex = prev.findIndex((note) => note.id === noteId);
      if (noteIndex === -1) return prev;

      const note = prev[noteIndex];
      const updated = { ...note, category };
      const without = prev.filter((n) => n.id !== noteId);
      const lastIndexInCategory = without.reduce(
        (idx, n, i) => (n.category === category ? i : idx),
        -1
      );
      const insertionIndex = lastIndexInCategory + 1;

      const next = [...without];
      next.splice(insertionIndex, 0, updated);
      return next;
    });

    // Ensure the dragged note returns to visible state.
    setDraggingId(null);
    setDragHint(null);
  };

  const reorderNote = (
    draggedId: string,
    targetId: string,
    position: "before" | "after" = "before"
  ) => {
    pendingFlipPositions.current = captureNotePositions();

    setNotes((prev) => {
      const dragged = prev.find((note) => note.id === draggedId);
      const target = prev.find((note) => note.id === targetId);
      if (!dragged || !target || draggedId === targetId) return prev;

      const updated = { ...dragged, category: target.category };
      const without = prev.filter((note) => note.id !== draggedId);
      const targetIndex = without.findIndex((note) => note.id === targetId);
      if (targetIndex === -1) return prev;

      const insertionIndex = targetIndex + (position === "after" ? 1 : 0);
      const next = [...without];
      next.splice(insertionIndex, 0, updated);
      return next;
    });

    // Ensure the dragged note returns to visible state.
    setDraggingId(null);
    setDragHint(null);
  };

  const clearDragHint = () => setDragHint(null);


  const clearNever = () => {
    setNotes((prev) => prev.filter((note) => note.category !== "never"));
  };

  const undo = () => dispatchHistory({ type: "UNDO" });
  const redo = () => dispatchHistory({ type: "REDO" });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTextField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;
      if (isTextField) return;

      const isUndo =
        event.key.toLowerCase() === "z" &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey;
      const isRedo =
        (event.key.toLowerCase() === "y" && (event.metaKey || event.ctrlKey)) ||
        (event.key.toLowerCase() === "z" &&
          (event.metaKey || event.ctrlKey) &&
          event.shiftKey);

      if (isUndo) {
        event.preventDefault();
        if (canUndo) undo();
      } else if (isRedo) {
        event.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onAdd();
    }
  };

  const dragImageRef = useRef<HTMLElement | null>(null);

  const onDragStart = (event: React.DragEvent<HTMLElement>, noteId: string) => {
    event.dataTransfer.setData("text/plain", noteId);
    event.dataTransfer.effectAllowed = "move";

    const el = event.currentTarget as HTMLElement;

    // Create a visual clone to use as the drag image so the real note can be hidden cleanly.
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = "absolute";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.width = `${el.offsetWidth}px`;
    clone.style.height = `${el.offsetHeight}px`;
    clone.style.pointerEvents = "none";
    clone.style.margin = "0";
    document.body.appendChild(clone);

    event.dataTransfer.setDragImage(clone, 16, 16);
    dragImageRef.current = clone;

    // Delay hiding the source note until after the browser has started dragging.
    // Otherwise some browsers may cancel the drag if the element disappears too quickly.
    requestAnimationFrame(() => {
      setDraggingId(noteId);
      setDragHint(null);
    });
  };

  const onDragOverNote = (event: React.DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();

    if (!draggingId || draggingId === targetId) {
      setDragHint(null);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY > rect.top + rect.height / 2 ? "after" : "before";

    setDragHint({ targetId, position });
    event.dataTransfer.dropEffect = "move";
  };

  const onDragLeaveNote = (targetId: string) => {
    if (dragHint?.targetId === targetId) {
      setDragHint(null);
    }
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragHint(null);

    if (dragImageRef.current) {
      dragImageRef.current.remove();
      dragImageRef.current = null;
    }
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

    const note = notes.find((n) => n.id === noteId);
    if (note && note.category === category) {
      // Dropped into the same column where it already lives; nothing should change.
      setDragHint(null);
      return;
    }

    // If the drop lands over an existing note, treat it as a reorder within the column.
    const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const noteElement = element?.closest("article.note") as HTMLElement | null;
    const targetId = noteElement?.dataset?.noteId;

    if (targetId && targetId !== noteId) {
      const rect = noteElement.getBoundingClientRect();
      const insertAfter = event.clientY > rect.top + rect.height / 2;
      reorderNote(noteId, targetId, insertAfter ? "after" : "before");
      setDragHint(null);
      return;
    }

    // Otherwise, drop into the column (appends to the end).
    moveNote(noteId, category);
    setDragHint(null);
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
            <div className="brand__subtitle">Brain dump notes</div>
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
            <div className="add-note__controls">
              <div className="segmented-control" role="group" aria-label="New note category">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    className={`segmented-control__item ${
                      newCategory === category.key ? "segmented-control__item--active" : ""
                    }`}
                    onClick={() => setNewCategory(category.key)}
                    aria-pressed={newCategory === category.key}
                    aria-label={category.label}
                  >
                    <span aria-hidden="true">{category.icon}</span>
                  </button>
                ))}
              </div>
              <button className="button button--icon" onClick={onAdd}>
                <FiPlus aria-hidden="true" />
                Add note
              </button>
            </div>
          </div>
        </section>

        <section className="board" aria-label="Notes board">
          {CATEGORIES.map((category) => {
            const notesForCategory = (notesByCategory[category.key] || []).slice();

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
                  <span className="column__icon" aria-hidden="true">{category.icon}</span>
                </header>

                <div className="column__notes" data-notes={category.key}>
                  {notesForCategory.length === 0 ? (
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
                    notesForCategory.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onMove={moveNote}
                        onDelete={onDelete}
                        onUpdate={updateNote}
                        onDragStart={onDragStart}
                        onDragOver={onDragOverNote}
                        onDragLeave={onDragLeaveNote}
                        onDragEnd={onDragEnd}
                        onDrop={reorderNote}
                        dragHint={dragHint}
                        isDragging={draggingId === note.id}
                        registerRef={registerNoteRef}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {(canUndo || canRedo) && (
        <div className="undo-redo" role="group" aria-label="Undo and redo">
          <button
            className="button button--secondary"
            onClick={undo}
            disabled={!canUndo}
            type="button"
            aria-label="Undo"
            title="Undo (⌘/Ctrl+Z)"
          >
            ↶
          </button>
          <button
            className="button button--secondary"
            onClick={redo}
            disabled={!canRedo}
            type="button"
            aria-label="Redo"
            title="Redo (⌘/Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
      )}

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
            <li>Drag notes between and within columns to reorder them.</li>
            <li>Use the action buttons, the top-right ×, or double-click to edit a note.</li>
            <li>Use Undo / Redo (buttons or ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z) to recover accidental changes.</li>
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
        <span className="footer__text">Notes are saved locally in your browser.</span>
        <button className="button button--secondary footer__clear-never-button" onClick={clearNever}>
          Clear Never <FiTrash2 />
        </button>
      </footer>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
