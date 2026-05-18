import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  updateNoteAppearance,
} from "../api/noteApi";

import {
  IconNotes,
  IconArchive,
  IconTrash,
  IconEdit,
  IconSearch,
  IconMenu,
  IconRefresh,
  IconGridView,
  IconListView,
  IconDarkMode,
  IconLightMode,
  IconPalette,
  IconDelete,
  IconImport,
} from "../components/Icons";

const SIDEBAR_ITEMS = [
  { key: "notes", icon: <IconNotes />, label: "Notes" },
  { key: "archive", icon: <IconArchive />, label: "Archive" },
  { key: "trash", icon: <IconTrash />, label: "Trash" },
];

const NOTE_COLORS = [
  "#ffffff",
  "#f28b82",
  "#fbbc04",
  "#fff475",
  "#ccff90",
  "#a7ffeb",
  "#cbf0f8",
  "#aecbfa",
  "#d7aefb",
];

const parseChecklist = (content) => {
  if (!content) {
    return null;
  }

  const lines = content.split("\n");
  const checklistItems = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- [ ]") || line.startsWith("- [x]"));

  if (checklistItems.length === 0 || checklistItems.length !== lines.length) {
    return null;
  }

  return checklistItems.map((line) => ({
    text: line.replace(/^- \[[x ]\]\s*/i, ""),
    checked: line.startsWith("- [x]"),
  }));
};

function DashboardPage({ token, user = null, isDarkMode, onToggleDarkMode }) {
  const [notes, setNotes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState("notes");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isEditingId, setIsEditingId] = useState(null);
  const [formValues, setFormValues] = useState({
    title: "",
    content: "",
    color: "#ffffff",
  });
  const composerRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const isEditMode = useMemo(() => isEditingId !== null, [isEditingId]);

  const filteredNotes = useMemo(() => {
    let scopedNotes = notes;

    if (activeSidebarItem === "notes") {
      scopedNotes = notes.filter((note) => !note.isArchived && !note.isTrashed);
    } else if (activeSidebarItem === "archive") {
      scopedNotes = notes.filter((note) => note.isArchived && !note.isTrashed);
    } else if (activeSidebarItem === "trash") {
      scopedNotes = notes.filter((note) => note.isTrashed);
    }

    if (!searchText.trim()) {
      return scopedNotes;
    }

    const normalizedSearch = searchText.trim().toLowerCase();
    return scopedNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(normalizedSearch) ||
        note.content.toLowerCase().includes(normalizedSearch),
    );
  }, [activeSidebarItem, notes, searchText]);

  const resetForm = () => {
    setFormValues({ title: "", content: "", color: "#ffffff" });
    setIsEditingId(null);
    setIsComposerExpanded(false);
  };

  const loadNotes = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const fetchedNotes = await listNotes(token);
      setNotes(fetchedNotes);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const submitDraftIfNeeded = useCallback(async () => {
    if (isEditMode || !isComposerExpanded || isSaving) {
      return;
    }

    const title = formValues.title.trim();
    const content = formValues.content.trim();

    if (!title && !content) {
      resetForm();
      return;
    }

    if (!content) {
      setErrorMessage("Content is required");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const createdNote = await createNote(token, {
        title: title || "Untitled",
        content,
        color: formValues.color,
      });
      setNotes((prev) => [createdNote, ...prev]);
      resetForm();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [formValues, isComposerExpanded, isEditMode, isSaving, token]);

  useEffect(() => {
    const handleClickOutside = async (event) => {
      if (!isComposerExpanded) {
        return;
      }

      if (composerRef.current && !composerRef.current.contains(event.target)) {
        await submitDraftIfNeeded();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isComposerExpanded, submitDraftIfNeeded]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      if (isEditMode) {
        const updatedNote = await updateNote(token, isEditingId, formValues);
        setNotes((prev) =>
          prev.map((note) => (note.id === isEditingId ? updatedNote : note)),
        );
        resetForm();
      } else {
        const createdNote = await createNote(token, {
          title: formValues.title.trim() || "Untitled",
          content: formValues.content,
          color: formValues.color,
        });
        setNotes((prev) => [createdNote, ...prev]);
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (note) => {
    setFormValues({
      title: note.title,
      content: note.content,
      color: note.color || "#ffffff",
    });
    setIsEditingId(note.id);
    setIsComposerExpanded(true);
  };

  const handleOpenRichEditor = () => {
    const title = formValues.title.trim();
    const content = formValues.content.trim();

    if (!title && !content) {
      setIsComposerExpanded(true);
      return;
    }

    navigate("/editor", {
      state: {
        noteId: isEditMode ? isEditingId : null,
        title,
        content,
        color: formValues.color,
      },
    });
  };

  const handleColorChange = async (noteId, color) => {
    setErrorMessage("");

    try {
      const updatedNote = await updateNoteAppearance(token, noteId, { color });
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note)),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleToggleField = async (note, field) => {
    setErrorMessage("");

    try {
      const payload = { [field]: !note[field] };
      if (field === "isTrashed" && !note.isTrashed) {
        payload.isArchived = false;
      }

      const updatedNote = await updateNoteAppearance(token, note.id, payload);
      setNotes((prev) =>
        prev.map((current) => (current.id === note.id ? updatedNote : current)),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleDelete = async (noteId) => {
    setErrorMessage("");

    try {
      await deleteNote(token, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));

      if (isEditingId === noteId) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.match("text.*") && !file.name.endsWith(".txt")) {
      setErrorMessage("Please select a text file (.txt)");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

      try {
        const createdNote = await createNote(token, {
          title,
          content,
          color: "#ffffff",
        });
        setNotes((prev) => [createdNote, ...prev]);
        setActiveSidebarItem("notes"); // Switch to notes view to see the imported note
      } catch (error) {
        setErrorMessage("Failed to import note: " + error.message);
      } finally {
        setIsLoading(false);
        event.target.value = ""; // Reset input
      }
    };

    reader.onerror = () => {
      setErrorMessage("Error reading file");
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <section className={`keep-layout ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="keep-header">
        <div className="keep-brand">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <IconMenu />
          </button>
          <span className="keep-logo">💡</span>
          <span className="keep-title">Keep</span>
        </div>

        <div className="keep-search-wrap">
          <span className="search-icon">
            <IconSearch />
          </span>
          <input
            type="text"
            className="keep-search"
            placeholder="Search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="keep-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={handleImportClick}
            aria-label="Import text file"
            title="Import text file"
          >
            <IconImport />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".txt,text/plain"
            onChange={handleFileImport}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsGridView((prev) => !prev)}
            aria-label="Toggle view mode"
          >
            {isGridView ? <IconListView /> : <IconGridView />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <IconLightMode /> : <IconDarkMode />}
          </button>
          <button
            type="button"
            className="avatar-btn"
            onClick={() => navigate("/profile")}
            title="Profile"
            aria-label="Profile"
            style={{
              backgroundColor: user?.profileColor || "#0f766e",
              backgroundImage: user?.profileImage
                ? `url(${user.profileImage})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!user?.profileImage &&
              (user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <div className="keep-body">
        <aside
          className={`keep-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${activeSidebarItem === item.key ? "active" : ""}`}
              onClick={() => setActiveSidebarItem(item.key)}
            >
              <span>{item.icon}</span>
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </aside>

        <section className="keep-main">
          <form
            className={`take-note ${isComposerExpanded ? "expanded" : ""}`}
            onSubmit={handleSubmit}
            ref={composerRef}
          >
            {isComposerExpanded && (
              <input
                name="title"
                type="text"
                placeholder="Title"
                value={formValues.title}
                onChange={handleInputChange}
                className="take-note-title"
              />
            )}

            <textarea
              name="content"
              placeholder="Take a note..."
              value={formValues.content}
              rows={isComposerExpanded ? 4 : 1}
              onFocus={() => setIsComposerExpanded(true)}
              onChange={handleInputChange}
              className="take-note-input"
            />

            {isComposerExpanded && (
              <div className="take-note-footer">
                <div className="palette-container">
                  <IconPalette />
                  <div className="palette">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-dot ${formValues.color === color ? "selected" : ""}`}
                        style={{ background: color }}
                        onClick={() =>
                          setFormValues((prev) => ({ ...prev, color }))
                        }
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="composer-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={handleOpenRichEditor}
                  >
                    Open editor
                  </button>
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : isEditMode ? "Update" : "Add"}
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={submitDraftIfNeeded}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </form>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <div className="notes-section-header">
            <h2>Notes</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={loadNotes}
              title="Refresh"
            >
              <IconRefresh />
            </button>
          </div>

          {isLoading ? (
            <p>Loading notes...</p>
          ) : filteredNotes.length === 0 ? (
            <p>No notes found in this section.</p>
          ) : (
            <div className={isGridView ? "keep-masonry" : "keep-list"}>
              {filteredNotes.map((note) => {
                const checklist = parseChecklist(note.content);
                const isHtmlContent = /<[^>]+>/.test(note.content);
                return (
                  <article
                    key={note.id}
                    className="keep-note-card"
                    style={{ background: note.color || "#ffffff" }}
                  >
                    <div className="note-card-head">
                      <h3>{note.title}</h3>
                      <button
                        type="button"
                        className="icon-btn card-pin"
                        onClick={() => handleToggleField(note, "isPinned")}
                        aria-label="Toggle pin"
                      >
                        {note.isPinned ? "📍" : "📌"}
                      </button>
                    </div>
                    {checklist ? (
                      <ul className="checklist-view">
                        {checklist.map((item, index) => (
                          <li key={`${note.id}-${index}`}>
                            <input
                              type="checkbox"
                              checked={item.checked}
                              readOnly
                            />
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : isHtmlContent ? (
                      <div
                        className="note-html-preview"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    ) : (
                      <p>{note.content}</p>
                    )}

                    <div className="keep-card-toolbar">
                      <div className="note-card-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleStartEdit(note)}
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                        <div className="palette-container">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Change Color"
                          >
                            <IconPalette />
                          </button>
                          <div className="inline-palette">
                            {NOTE_COLORS.map((color) => (
                              <button
                                key={`${note.id}-${color}`}
                                type="button"
                                className="mini-color-dot"
                                style={{ background: color }}
                                onClick={() =>
                                  handleColorChange(note.id, color)
                                }
                                aria-label={`Change note color ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleToggleField(note, "isArchived")}
                          title="Archive"
                        >
                          <IconArchive />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleToggleField(note, "isTrashed")}
                          title={note.isTrashed ? "Restore" : "Move to Trash"}
                        >
                          {note.isTrashed ? <IconRefresh /> : <IconTrash />}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleDelete(note.id)}
                          title="Delete Permanently"
                        >
                          <IconDelete />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

DashboardPage.propTypes = {
  token: PropTypes.string,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  isDarkMode: PropTypes.bool.isRequired,
  onToggleDarkMode: PropTypes.func.isRequired,
};

export default DashboardPage;
