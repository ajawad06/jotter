import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { jsPDF } from "jspdf";

import {
  createLabel,
  createNote,
  deleteNote,
  duplicateNote,
  fetchLabels,
  listNotes,
  removeAttachment,
  renameLabel,
  reorderNotes,
  updateNote,
  updateNoteAppearance,
  uploadAttachment,
} from "../api/noteApi";
import { chatWithNotes, runAiAction, runDraftAiAction } from "../api/aiApi";
import { getProfile, resendVerification } from "../api/authApi";

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
  IconReminder,
  IconLabel,
  IconAttachment,
  IconSparkles,
  IconClose,
  IconCheck,
  IconPin,
  IconPinFilled,
  IconMore,
  IconTextFormat,
  IconUndo,
  IconRedo,
  IconClearFormat,
} from "../components/Icons";

// Retained for a future re-wire of per-note AI actions (icon removed for now).
// eslint-disable-next-line no-unused-vars
const AI_ACTIONS = [
  { key: "title", label: "Generate title" },
  { key: "summary", label: "Summarize" },
  { key: "grammar", label: "Fix grammar" },
  { key: "tags", label: "Smart tags" },
  { key: "tasks", label: "Extract tasks" },
  { key: "translate", label: "Translate" },
];

const SIDEBAR_ITEMS = [
  { key: "notes", icon: <IconNotes />, label: "Notes" },
  { key: "reminders", icon: <IconReminder />, label: "Reminders" },
  { key: "archive", icon: <IconArchive />, label: "Archive" },
  { key: "trash", icon: <IconTrash />, label: "Trash" },
];

const SIDEBAR_TOP_ITEMS = SIDEBAR_ITEMS.filter((item) =>
  ["notes", "reminders"].includes(item.key),
);
const SIDEBAR_BOTTOM_ITEMS = SIDEBAR_ITEMS.filter((item) =>
  ["archive", "trash"].includes(item.key),
);

const NOTE_COLORS = [
  "#ffffff",
  "#faafa8",
  "#f39f76",
  "#fff8b8",
  "#e2f6d3",
  "#b4ddd3",
  "#d4e4ed",
  "#aeccdc",
  "#d3bfdb",
  "#f6e2dd",
  "#e9e3d4",
  "#efeff1",
];

// Dark-mode equivalents for each note color (mirrors Google Keep's dark palette).
const DARK_NOTE_COLORS = {
  "#ffffff": "#202124",
  "#faafa8": "#77172e",
  "#f39f76": "#692b17",
  "#fff8b8": "#7c4a03",
  "#e2f6d3": "#264d3b",
  "#b4ddd3": "#0c625d",
  "#d4e4ed": "#256377",
  "#aeccdc": "#284255",
  "#d3bfdb": "#472e5b",
  "#f6e2dd": "#6c394f",
  "#e9e3d4": "#4b443a",
  "#efeff1": "#232427",
};

const resolveNoteColor = (color, isDarkMode) => {
  const base = color || "#ffffff";
  if (!isDarkMode) {
    return base;
  }
  return DARK_NOTE_COLORS[base.toLowerCase()] || base;
};

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

const formatContentForExport = (html) => {
  if (!html) return "";
  let text = html;
  // Replace headings with spacing
  text = text.replace(/<h[1-6][^>]*>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");
  // Replace list items with bullets
  text = text.replace(/<li[^>]*>/gi, "\n• ");
  text = text.replace(/<\/li>/gi, "");
  // Replace paragraphs and breaks with newlines
  text = text.replace(/<(p|div|br)[^>]*>/gi, "\n");
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  Object.keys(entities).forEach((entity) => {
    text = text.replace(new RegExp(entity, "g"), entities[entity]);
  });
  // Clean up whitespace
  return text.trim().replace(/\n{3,}/g, "\n\n");
};

const formatEditedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const options =
    date.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString([], options);
};

const composerContentToPlain = (html) =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Render inline markdown emphasis/code on an already-escaped string.
const renderInlineMarkdown = (text) =>
  escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");

// Lightweight, XSS-safe markdown → HTML for AI chat replies.
// Handles bold, inline code, ordered/unordered lists and paragraphs.
const formatAssistantMessage = (raw) => {
  const lines = (raw || "").split(/\r?\n/);
  const blocks = [];
  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (listType) {
      blocks.push(`<${listType}>${listItems.join("")}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
    const unordered = trimmed.match(/^[-*]\s+(.*)$/);

    if (ordered) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
    } else if (unordered) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      blocks.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    }
  });

  flushList();
  return blocks.join("");
};

// Google-Keep-style masonry: fixed-width columns that pack independently, so a
// tall card doesn't leave a gap under the whole row (which CSS grid/columns do).
const MASONRY_COLUMN_WIDTH = 240;
const MASONRY_GAP = 16;

function NotesMasonry({ notes, renderCard }) {
  const containerRef = useRef(null);
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return undefined;
    }

    const computeColumns = () => {
      const width = el.clientWidth;
      setColumnCount(
        Math.max(
          1,
          Math.floor(
            (width + MASONRY_GAP) / (MASONRY_COLUMN_WIDTH + MASONRY_GAP),
          ),
        ),
      );
    };

    computeColumns();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(computeColumns);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = Array.from({ length: columnCount }, () => []);
  notes.forEach((note, index) => {
    columns[index % columnCount].push(note);
  });

  return (
    <div className="jotter-masonry" ref={containerRef}>
      {columns.map((columnNotes, columnIndex) => (
        <div
          className="masonry-column"
          key={`masonry-col-${columnIndex}`}
          style={{
            width: columnCount === 1 ? "100%" : `${MASONRY_COLUMN_WIDTH}px`,
          }}
        >
          {columnNotes.map(renderCard)}
        </div>
      ))}
    </div>
  );
}

NotesMasonry.propTypes = {
  notes: PropTypes.array.isRequired,
  renderCard: PropTypes.func.isRequired,
};

function DashboardPage({
  token,
  user = null,
  isDarkMode,
  onToggleDarkMode,
  onUpdateUser,
  onLogout,
}) {
  const [notes, setNotes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [activeSidebarItem, setActiveSidebarItem] = useState("notes");
  const [activeLabel, setActiveLabel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [labelDraftByNoteId, setLabelDraftByNoteId] = useState({});
  const [openLabelEditorId, setOpenLabelEditorId] = useState(null);
  const [isLabelsDialogOpen, setIsLabelsDialogOpen] = useState(false);
  const [newLabelDraft, setNewLabelDraft] = useState("");
  const [editingLabelName, setEditingLabelName] = useState(null);
  const [renameLabelDraft, setRenameLabelDraft] = useState("");
  const [labelsDialogError, setLabelsDialogError] = useState("");
  const [openReminderEditorId, setOpenReminderEditorId] = useState(null);
  const [customReminderNoteId, setCustomReminderNoteId] = useState(null);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);
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
  const contentEditableRef = useRef(null);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showComposerColors, setShowComposerColors] = useState(false);
  const [showComposerReminder, setShowComposerReminder] = useState(false);
  const [composerReminderAt, setComposerReminderAt] = useState(null);
  const [showComposerAiMenu, setShowComposerAiMenu] = useState(false);
  const [composerLabels, setComposerLabels] = useState([]);
  const [aiComposerBusy, setAiComposerBusy] = useState(null);
  const [composerPinned, setComposerPinned] = useState(false);
  const attachmentInputRef = useRef(null);
  const composerImageInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const attachmentTargetNoteId = useRef(null);
  const [uploadingNoteId, setUploadingNoteId] = useState(null);
  const [aiLoadingNoteId, setAiLoadingNoteId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [translateLanguage, setTranslateLanguage] = useState("Spanish");
  const [translationByNoteId, setTranslationByNoteId] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [isVerificationBannerDismissed, setIsVerificationBannerDismissed] =
    useState(false);
  const [verificationBannerMessage, setVerificationBannerMessage] =
    useState("");
  const navigate = useNavigate();

  const isEditMode = useMemo(() => isEditingId !== null, [isEditingId]);

  const filteredNotes = useMemo(() => {
    let scopedNotes = notes;

    if (activeSidebarItem === "notes") {
      scopedNotes = notes.filter((note) => !note.isArchived && !note.isTrashed);
    } else if (activeSidebarItem === "reminders") {
      scopedNotes = notes
        .filter((note) => note.reminderAt && !note.isTrashed)
        .sort((a, b) => new Date(a.reminderAt) - new Date(b.reminderAt));
    } else if (activeSidebarItem === "archive") {
      scopedNotes = notes.filter((note) => note.isArchived && !note.isTrashed);
    } else if (activeSidebarItem === "trash") {
      scopedNotes = notes.filter((note) => note.isTrashed);
    }

    if (activeLabel) {
      scopedNotes = scopedNotes.filter((note) =>
        (note.labels || []).includes(activeLabel),
      );
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
  }, [activeLabel, activeSidebarItem, notes, searchText]);

  const isReorderable =
    activeSidebarItem === "notes" && !activeLabel && !searchText.trim();

  const resetForm = () => {
    setFormValues({ title: "", content: "", color: "#ffffff" });
    setIsEditingId(null);
    setIsComposerExpanded(false);
    setShowFormatBar(false);
    setShowComposerColors(false);
    setShowComposerReminder(false);
    setComposerReminderAt(null);
    setComposerPinned(false);
    setShowComposerAiMenu(false);
    setComposerLabels([]);
    setAiComposerBusy(null);
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = "";
    }
  };

  const syncComposerContent = () => {
    const html = contentEditableRef.current?.innerHTML || "";
    setFormValues((prev) => ({ ...prev, content: html }));
  };

  const applyFormat = (command, value = null) => {
    contentEditableRef.current?.focus();
    document.execCommand(command, false, value);
    syncComposerContent();
  };

  const runComposerAi = async (action) => {
    const title = formValues.title.trim();
    const content = composerContentToPlain(formValues.content);

    if (!title && !content) {
      setErrorMessage("Write something before using AI.");
      return;
    }

    setShowComposerAiMenu(false);
    setErrorMessage("");
    setAiComposerBusy(action);

    try {
      const result = await runDraftAiAction(token, action, { title, content });

      if (action === "title") {
        setFormValues((prev) => ({ ...prev, title: result.title || "" }));
      } else if (action === "grammar") {
        const corrected = result.corrected || "";
        setFormValues((prev) => ({ ...prev, content: corrected }));
        if (contentEditableRef.current) {
          contentEditableRef.current.innerText = corrected;
        }
      } else if (action === "tags") {
        setComposerLabels((prev) =>
          Array.from(new Set([...prev, ...(result.tags || [])])),
        );
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAiComposerBusy(null);
    }
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
      const isNetworkError =
        error.message === "Failed to fetch" ||
        error.message.includes("backend running");
      setErrorMessage(
        isNetworkError
          ? "Jotter could not reach the backend. Start the backend on port 5000, then refresh notes."
          : error.message,
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadLabels = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const fetchedLabels = await fetchLabels(token);
      setLabels(fetchedLabels || []);
    } catch {
      // Labels are a secondary feature; ignore fetch errors here.
    }
  }, [token]);

  useEffect(() => {
    loadNotes();
    loadLabels();
  }, [loadNotes, loadLabels]);

  useEffect(() => {
    if (!token || !onUpdateUser) {
      return;
    }

    getProfile(token)
      .then((profile) => {
        if (profile.isEmailVerified !== user?.isEmailVerified) {
          onUpdateUser({ isEmailVerified: profile.isEmailVerified });
        }
      })
      .catch(() => {
        // Non-critical: the cached session value is kept if this fails.
      });
    // Only needs to run once per mount to pick up out-of-band verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (openCardMenuId === null) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!event.target.closest(".card-menu-wrap")) {
        setOpenCardMenuId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenCardMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCardMenuId]);

  const handleSelectSidebarItem = (key) => {
    setActiveSidebarItem(key);
    setActiveLabel(null);
  };

  const handleSelectLabel = (label) => {
    setActiveSidebarItem("notes");
    setActiveLabel(label);
  };

  const handleAddLabel = async (note) => {
    const draft = (labelDraftByNoteId[note.id] || "").trim();
    if (!draft) {
      return;
    }

    const nextLabels = Array.from(new Set([...(note.labels || []), draft]));
    try {
      const updatedNote = await updateNote(token, note.id, {
        labels: nextLabels,
      });
      setNotes((prev) =>
        prev.map((current) => (current.id === note.id ? updatedNote : current)),
      );
      setLabelDraftByNoteId((prev) => ({ ...prev, [note.id]: "" }));
      loadLabels();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleRemoveLabel = async (note, label) => {
    const nextLabels = (note.labels || []).filter((item) => item !== label);
    try {
      const updatedNote = await updateNote(token, note.id, {
        labels: nextLabels,
      });
      setNotes((prev) =>
        prev.map((current) => (current.id === note.id ? updatedNote : current)),
      );
      loadLabels();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleOpenLabelsDialog = () => {
    setIsLabelsDialogOpen(true);
  };

  const handleCloseLabelsDialog = useCallback(() => {
    setIsLabelsDialogOpen(false);
    setNewLabelDraft("");
    setEditingLabelName(null);
    setRenameLabelDraft("");
    setLabelsDialogError("");
  }, []);

  useEffect(() => {
    if (!isLabelsDialogOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCloseLabelsDialog();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLabelsDialogOpen, handleCloseLabelsDialog]);

  const handleCreateLabelSubmit = async () => {
    const trimmed = newLabelDraft.trim();
    if (!trimmed) {
      return;
    }

    setLabelsDialogError("");

    try {
      const updatedLabels = await createLabel(token, trimmed);
      setLabels(updatedLabels);
      setNewLabelDraft("");
    } catch (error) {
      setLabelsDialogError(error.message);
    }
  };

  const handleStartRenameLabel = (label) => {
    setEditingLabelName(label);
    setRenameLabelDraft(label);
    setLabelsDialogError("");
  };

  const handleCancelRenameLabel = () => {
    setEditingLabelName(null);
    setRenameLabelDraft("");
  };

  const handleConfirmRenameLabel = async () => {
    const trimmed = renameLabelDraft.trim();
    if (!trimmed) {
      return;
    }

    setLabelsDialogError("");

    try {
      const updatedLabels = await renameLabel(token, editingLabelName, trimmed);
      setLabels(updatedLabels);
      if (activeLabel === editingLabelName) {
        setActiveLabel(trimmed);
      }
      setEditingLabelName(null);
      setRenameLabelDraft("");
      loadNotes();
    } catch (error) {
      setLabelsDialogError(error.message);
    }
  };

  const handleReminderChange = async (note, reminderAt) => {
    setErrorMessage("");

    try {
      const updatedNote = await updateNote(token, note.id, {
        reminderAt: reminderAt || null,
      });
      setNotes((prev) =>
        prev.map((current) => (current.id === note.id ? updatedNote : current)),
      );
      setOpenReminderEditorId(null);
      setCustomReminderNoteId(null);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const toggleReminderEditor = (noteId) => {
    setOpenReminderEditorId((prev) => (prev === noteId ? null : noteId));
    setCustomReminderNoteId(null);
  };

  const getLaterTodayReminder = () => {
    const target = new Date();
    target.setHours(18, 0, 0, 0);
    return target > new Date() ? target : null;
  };

  const getTomorrowReminder = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(8, 0, 0, 0);
    return target;
  };

  const getNextWeekReminder = () => {
    const target = new Date();
    const daysUntilNextMonday = (8 - target.getDay()) % 7 || 7;
    target.setDate(target.getDate() + daysUntilNextMonday);
    target.setHours(8, 0, 0, 0);
    return target;
  };

  const formatReminderTime = (date) =>
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const formatReminderWeekday = (date) =>
    `${date.toLocaleDateString([], { weekday: "short" })}, ${formatReminderTime(date)}`;

  const handleDuplicate = async (noteId) => {
    setErrorMessage("");

    try {
      const duplicatedNote = await duplicateNote(token, noteId);
      setNotes((prev) => [duplicatedNote, ...prev]);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleAttachmentButtonClick = (noteId) => {
    attachmentTargetNoteId.current = noteId;
    attachmentInputRef.current?.click();
  };

  const handleAttachmentFileChange = async (event) => {
    const file = event.target.files?.[0];
    const noteId = attachmentTargetNoteId.current;
    event.target.value = "";

    if (!file || !noteId) {
      return;
    }

    setErrorMessage("");
    setUploadingNoteId(noteId);

    try {
      const updatedNote = await uploadAttachment(token, noteId, file);
      setNotes((prev) =>
        prev.map((current) => (current.id === noteId ? updatedNote : current)),
      );
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUploadingNoteId(null);
    }
  };

  // Creates a note from the current composer draft (plus any extra fields such
  // as isArchived) and returns it, WITHOUT resetting the composer. Callers that
  // need further work on the new note (e.g. uploading an image) can chain off
  // the returned note and reset themselves.
  const createNoteFromComposer = async (extraFields = {}) => {
    const title = formValues.title.trim();
    const content = formValues.content;
    const plainContent = composerContentToPlain(content);

    if (!title && !plainContent) {
      setErrorMessage("Add a title or some content first");
      return null;
    }

    if (!plainContent) {
      setErrorMessage("Content is required");
      return null;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const createdNote = await createNote(token, {
        title: title || "Untitled",
        content,
        contentFormat: "html",
        color: formValues.color,
        reminderAt: composerReminderAt || undefined,
        isPinned: composerPinned,
        labels: composerLabels,
        ...extraFields,
      });
      setNotes((prev) => [createdNote, ...prev]);
      return createdNote;
    } catch (error) {
      setErrorMessage(error.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleComposerImageClick = () => {
    // While editing an existing note, reuse the per-card upload machinery.
    if (isEditMode) {
      handleAttachmentButtonClick(isEditingId);
      return;
    }
    composerImageInputRef.current?.click();
  };

  const handleComposerImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const createdNote = await createNoteFromComposer();
    if (!createdNote) {
      return;
    }

    try {
      const updatedNote = await uploadAttachment(token, createdNote.id, file);
      setNotes((prev) =>
        prev.map((current) =>
          current.id === createdNote.id ? updatedNote : current,
        ),
      );
      resetForm();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleComposerArchive = async () => {
    // Editing an existing note: just toggle archive on it.
    if (isEditMode) {
      const note = notes.find((current) => current.id === isEditingId);
      if (note) {
        await handleToggleField(note, "isArchived");
      }
      resetForm();
      return;
    }

    const createdNote = await createNoteFromComposer({ isArchived: true });
    if (createdNote) {
      resetForm();
    }
  };

  const handleRemoveAttachment = async (note, attachmentId) => {
    setErrorMessage("");

    try {
      const updatedNote = await removeAttachment(token, note.id, attachmentId);
      setNotes((prev) =>
        prev.map((current) => (current.id === note.id ? updatedNote : current)),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRunAiAction = async (note, action) => {
    setErrorMessage("");
    setAiLoadingNoteId(note.id);

    try {
      const options =
        action === "translate" ? { targetLanguage: translateLanguage } : {};
      const result = await runAiAction(token, note.id, action, options);

      if (action === "translate") {
        setTranslationByNoteId((prev) => ({
          ...prev,
          [note.id]: result.translation,
        }));
      } else if (result.note) {
        setNotes((prev) =>
          prev.map((current) =>
            current.id === note.id ? result.note : current,
          ),
        );
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAiLoadingNoteId(null);
    }
  };

  const handleSendChatMessage = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || isChatSending) {
      return;
    }

    const history = chatMessages.slice(-10);
    setChatMessages((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const result = await chatWithNotes(token, message, history);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer },
      ]);
      // If the assistant changed any notes, refresh the list.
      if (result.action) {
        loadNotes();
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${error.message}` },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationBannerMessage("");

    try {
      await resendVerification(token);
      setVerificationBannerMessage(
        "Verification email sent. Check your inbox.",
      );
    } catch (error) {
      if (/already verified/i.test(error.message)) {
        onUpdateUser?.({ isEmailVerified: true });
        setIsVerificationBannerDismissed(true);
        return;
      }
      setVerificationBannerMessage(error.message);
    }
  };

  const dragNoteIdRef = useRef(null);

  const handleDragStart = (noteId) => {
    dragNoteIdRef.current = noteId;
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = async (targetNoteId) => {
    const draggedNoteId = dragNoteIdRef.current;
    dragNoteIdRef.current = null;

    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      return;
    }

    const currentOrder = filteredNotes.map((note) => note.id);
    const fromIndex = currentOrder.indexOf(draggedNoteId);
    const toIndex = currentOrder.indexOf(targetNoteId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const reordered = [...currentOrder];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, draggedNoteId);

    try {
      const updatedNotes = await reorderNotes(token, reordered);
      setNotes(updatedNotes);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const submitDraftIfNeeded = useCallback(async () => {
    if (isEditMode || !isComposerExpanded || isSaving) {
      return;
    }

    const title = formValues.title.trim();
    const content = formValues.content;
    const plainContent = composerContentToPlain(content);

    if (!title && !plainContent) {
      resetForm();
      return;
    }

    if (!plainContent) {
      setErrorMessage("Content is required");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const createdNote = await createNote(token, {
        title: title || "Untitled",
        content,
        contentFormat: "html",
        color: formValues.color,
        reminderAt: composerReminderAt || undefined,
        isPinned: composerPinned,
        labels: composerLabels,
      });
      setNotes((prev) => [createdNote, ...prev]);
      resetForm();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    formValues,
    composerReminderAt,
    composerPinned,
    composerLabels,
    isComposerExpanded,
    isEditMode,
    isSaving,
    token,
  ]);

  const persistEditedNote = useCallback(async () => {
    if (!isEditMode || isSaving) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const updatedNote = await updateNote(token, isEditingId, {
        ...formValues,
        title: formValues.title.trim() || "Untitled",
        content: formValues.content,
        contentFormat: "html",
        isPinned: composerPinned,
      });
      setNotes((prev) =>
        prev.map((note) => (note.id === isEditingId ? updatedNote : note)),
      );
      resetForm();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [formValues, composerPinned, isEditMode, isEditingId, isSaving, token]);

  useEffect(() => {
    const handleClickOutside = async (event) => {
      if (!isComposerExpanded) {
        return;
      }

      if (composerRef.current && !composerRef.current.contains(event.target)) {
        if (isEditMode) {
          await persistEditedNote();
        } else {
          await submitDraftIfNeeded();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isComposerExpanded, isEditMode, persistEditedNote, submitDraftIfNeeded]);

  useEffect(() => {
    if (!isComposerExpanded) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (isEditMode) {
        persistEditedNote();
      } else {
        submitDraftIfNeeded();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isComposerExpanded, isEditMode, persistEditedNote, submitDraftIfNeeded]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      if (isEditMode) {
        const updatedNote = await updateNote(token, isEditingId, {
          ...formValues,
          title: formValues.title.trim(),
          content: formValues.content,
          contentFormat: "html",
          isPinned: composerPinned,
        });
        setNotes((prev) =>
          prev.map((note) => (note.id === isEditingId ? updatedNote : note)),
        );
        resetForm();
      } else {
        const createdNote = await createNote(token, {
          title: formValues.title.trim() || "Untitled",
          content: formValues.content,
          contentFormat: "html",
          color: formValues.color,
          reminderAt: composerReminderAt || undefined,
          isPinned: composerPinned,
          labels: composerLabels,
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
    setComposerReminderAt(note.reminderAt || null);
    setComposerPinned(note.isPinned || false);
    setIsEditingId(note.id);
    setIsComposerExpanded(true);
    // Populate the uncontrolled rich-text editor after it renders.
    requestAnimationFrame(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = note.content || "";
      }
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

  const handleExportNote = (note, format = "txt") => {
    const formattedContent = formatContentForExport(note.content);
    const filename = `${note.title.replace(/\s+/g, "_") || "Note"}.${format}`;

    if (format === "txt") {
      const element = document.createElement("a");
      const file = new Blob([note.title + "\n\n" + formattedContent], {
        type: "text/plain",
      });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(note.title || "Untitled Note", 10, 20);
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(formattedContent, 180);
      doc.text(splitText, 10, 30);
      doc.save(filename);
    }
  };

  return (
    <section className={`jotter-layout ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="jotter-header">
        <div className="jotter-brand">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <IconMenu />
          </button>
          {activeSidebarItem === "notes" && !activeLabel ? (
            <>
              <img className="jotter-logo" src="/jotter-logo.png" alt="" />
              <span className="jotter-title">Jotter</span>
            </>
          ) : (
            <span className="jotter-title jotter-title-view">
              {activeLabel
                ? activeLabel
                : activeSidebarItem === "chat"
                  ? "Ask Jotter"
                  : SIDEBAR_ITEMS.find((item) => item.key === activeSidebarItem)
                      ?.label || "Notes"}
            </span>
          )}
        </div>

        <div className="jotter-search-wrap">
          <span className="search-icon">
            <IconSearch />
          </span>
          <input
            type="text"
            className="jotter-search"
            placeholder="Search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="jotter-actions">
          <input
            type="file"
            ref={attachmentInputRef}
            style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleAttachmentFileChange}
          />
          <input
            type="file"
            ref={composerImageInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleComposerImageChange}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={loadNotes}
            aria-label="Refresh notes"
            title="Refresh"
          >
            <IconRefresh />
          </button>
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
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              title="Account"
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={isProfileMenuOpen}
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
            {isProfileMenuOpen && (
              <div className="profile-menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  View profile
                </button>
                <button
                  type="button"
                  className="profile-menu-danger"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout?.();
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {user &&
        user.isEmailVerified === false &&
        !isVerificationBannerDismissed && (
          <div className="verification-banner">
            <span>
              {verificationBannerMessage ||
                "Verify your email address to secure your account."}
            </span>
            <div className="verification-banner-actions">
              <button type="button" onClick={handleResendVerification}>
                Resend email
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() => setIsVerificationBannerDismissed(true)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      <div className="jotter-body">
        <aside
          className={`jotter-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}
        >
          {SIDEBAR_TOP_ITEMS.map((item) => (
            <Fragment key={item.key}>
              <button
                type="button"
                className={`sidebar-item ${
                  activeSidebarItem === item.key && !activeLabel ? "active" : ""
                }`}
                onClick={() => handleSelectSidebarItem(item.key)}
              >
                <span>{item.icon}</span>
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
              {item.key === "notes" && (
                <button
                  type="button"
                  className={`sidebar-item ${
                    activeSidebarItem === "chat" ? "active" : ""
                  }`}
                  onClick={() => handleSelectSidebarItem("chat")}
                  aria-label="Ask Jotter"
                  title="Ask Jotter"
                >
                  <span>
                    <IconSparkles />
                  </span>
                  {!isSidebarCollapsed && <span>Ask Jotter</span>}
                </button>
              )}
            </Fragment>
          ))}

          <div className="sidebar-labels">
            {labels.map((label) => (
              <button
                key={label}
                type="button"
                className={`sidebar-item sidebar-item-label ${
                  activeLabel === label ? "active" : ""
                }`}
                onClick={() => handleSelectLabel(label)}
                title={label}
              >
                <span>
                  <IconLabel />
                </span>
                {!isSidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
            <button
              type="button"
              className="sidebar-item"
              title="Edit labels"
              onClick={handleOpenLabelsDialog}
            >
              <span>
                <IconEdit />
              </span>
              {!isSidebarCollapsed && <span>Edit labels</span>}
            </button>
          </div>

          {SIDEBAR_BOTTOM_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${
                activeSidebarItem === item.key && !activeLabel ? "active" : ""
              }`}
              onClick={() => handleSelectSidebarItem(item.key)}
            >
              <span>{item.icon}</span>
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </aside>

        <section className="jotter-main">
          {activeSidebarItem === "chat" ? (
            <div className="chat-page">
              <div className="chat-page-header">
                <img className="chat-page-logo" src="/jotter-logo.png" alt="" />
                <span>Jotter AI</span>
              </div>
              <div className="chat-messages">
                <div className="chat-row assistant">
                  <span className="chat-avatar">
                    <IconSparkles />
                  </span>
                  <div className="chat-bubble">
                    Hi there! I&apos;m Jotter AI. I can answer questions about
                    your notes and stats (&ldquo;how many archived notes do I
                    have?&rdquo;, &ldquo;what are my reminders?&rdquo;), and I
                    can even create notes for you (&ldquo;add a note to buy
                    groceries&rdquo;).
                  </div>
                </div>
                {chatMessages.map((message, index) => (
                  <div key={index} className={`chat-row ${message.role}`}>
                    {message.role === "assistant" && (
                      <span className="chat-avatar">
                        <IconSparkles />
                      </span>
                    )}
                    {message.role === "assistant" ? (
                      <div
                        className="chat-bubble"
                        dangerouslySetInnerHTML={{
                          __html: formatAssistantMessage(message.text),
                        }}
                      />
                    ) : (
                      <div className="chat-bubble">{message.text}</div>
                    )}
                  </div>
                ))}
                {isChatSending && (
                  <div className="chat-row assistant">
                    <span className="chat-avatar">
                      <IconSparkles />
                    </span>
                    <div className="chat-bubble chat-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
              <form className="chat-input-row" onSubmit={handleSendChatMessage}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask a question about your notes..."
                />
                <button type="submit" disabled={isChatSending}>
                  {isChatSending ? "Thinking..." : "Send"}
                </button>
              </form>
            </div>
          ) : (
            <>
              {isEditMode && (
                <div
                  className="take-note take-note-placeholder"
                  aria-hidden="true"
                >
                  Take a note…
                </div>
              )}
              <div
                className={
                  isEditMode ? "note-editor-overlay" : "note-composer-inline"
                }
              >
              <form
                className={`take-note ${isComposerExpanded ? "expanded" : ""} ${
                  isEditMode ? "in-modal" : ""
                }`}
                onSubmit={handleSubmit}
                ref={composerRef}
                style={
                  isComposerExpanded
                    ? {
                        background: resolveNoteColor(
                          formValues.color,
                          isDarkMode,
                        ),
                      }
                    : undefined
                }
              >
                {isEditMode &&
                  (() => {
                    const editingNote = notes.find(
                      (note) => note.id === isEditingId,
                    );
                    const images = (editingNote?.attachments || []).filter(
                      (attachment) => attachment.type?.startsWith("image/"),
                    );
                    if (images.length === 0) {
                      return null;
                    }
                    return (
                      <div className="composer-images">
                        {images.map((attachment) => (
                          <div className="composer-image" key={attachment.id}>
                            <img src={attachment.url} alt={attachment.name} />
                            <button
                              type="button"
                              className="composer-image-delete"
                              onClick={() =>
                                handleRemoveAttachment(
                                  editingNote,
                                  attachment.id,
                                )
                              }
                              aria-label={`Remove attachment ${attachment.name}`}
                              title="Delete image"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                {isComposerExpanded && (
                  <div className="take-note-title-row">
                    <input
                      name="title"
                      type="text"
                      placeholder="Title"
                      value={formValues.title}
                      onChange={handleInputChange}
                      className="take-note-title"
                    />
                    <button
                      type="button"
                      className={`icon-btn composer-pin ${
                        composerPinned ? "active" : ""
                      }`}
                      onClick={() => setComposerPinned((prev) => !prev)}
                      title={composerPinned ? "Unpin note" : "Pin note"}
                      aria-label={composerPinned ? "Unpin note" : "Pin note"}
                      aria-pressed={composerPinned}
                    >
                      {composerPinned ? <IconPinFilled /> : <IconPin />}
                    </button>
                  </div>
                )}

                {isComposerExpanded ? (
                  <div
                    ref={contentEditableRef}
                    className="take-note-editor"
                    contentEditable
                    role="textbox"
                    aria-label="Note content"
                    aria-multiline="true"
                    data-placeholder="Take a note..."
                    onInput={syncComposerContent}
                    suppressContentEditableWarning
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    placeholder="Take a note..."
                    className="take-note-input"
                    onFocus={() => {
                      setIsComposerExpanded(true);
                      requestAnimationFrame(() =>
                        contentEditableRef.current?.focus(),
                      );
                    }}
                  />
                )}

                {isComposerExpanded && (
                  <>
                    {composerReminderAt && (
                      <div className="composer-reminder-chip">
                        <IconReminder />
                        <span>
                          {new Date(composerReminderAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setComposerReminderAt(null)}
                          aria-label="Remove reminder"
                        >
                          &times;
                        </button>
                      </div>
                    )}

                    {showFormatBar && (
                      <div className="format-bar">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("formatBlock", "<h1>")}
                          title="Heading 1"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("formatBlock", "<h2>")}
                          title="Heading 2"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          className="format-normal"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("formatBlock", "<p>")}
                          title="Normal text"
                        >
                          Aa
                        </button>
                        <span className="format-divider" />
                        <button
                          type="button"
                          className="format-bold"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("bold")}
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          className="format-italic"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("italic")}
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          className="format-underline"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("underline")}
                          title="Underline"
                        >
                          U
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyFormat("removeFormat")}
                          title="Clear formatting"
                        >
                          <IconClearFormat />
                        </button>
                      </div>
                    )}

                    {(composerLabels.length > 0 || aiComposerBusy) && (
                      <div className="composer-meta">
                        {composerLabels.map((label) => (
                          <span key={label} className="label-chip">
                            {label}
                            <button
                              type="button"
                              onClick={() =>
                                setComposerLabels((prev) =>
                                  prev.filter((item) => item !== label),
                                )
                              }
                              aria-label={`Remove label ${label}`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {aiComposerBusy && (
                          <span className="composer-ai-status">
                            Jotter AI is working…
                          </span>
                        )}
                      </div>
                    )}

                    <div className="composer-toolbar">
                      <div className="composer-tools">
                        <button
                          type="button"
                          className={`icon-btn ${showFormatBar ? "active" : ""}`}
                          onClick={() => setShowFormatBar((prev) => !prev)}
                          title="Formatting options"
                          aria-label="Formatting options"
                        >
                          <IconTextFormat />
                        </button>

                        <div className="composer-tool-wrap">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              setShowComposerColors((prev) => !prev);
                              setShowComposerReminder(false);
                              setShowComposerAiMenu(false);
                            }}
                            title="Background color"
                            aria-label="Background color"
                          >
                            <IconPalette />
                          </button>
                          {showComposerColors && (
                            <div className="composer-popover composer-colors">
                              {NOTE_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`color-dot ${
                                    formValues.color === color ? "selected" : ""
                                  }`}
                                  style={{
                                    background: resolveNoteColor(
                                      color,
                                      isDarkMode,
                                    ),
                                  }}
                                  onClick={() => {
                                    setFormValues((prev) => ({
                                      ...prev,
                                      color,
                                    }));
                                    setShowComposerColors(false);
                                  }}
                                  aria-label={`Select color ${color}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="composer-tool-wrap">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              setShowComposerReminder((prev) => !prev);
                              setShowComposerColors(false);
                              setShowComposerAiMenu(false);
                            }}
                            title="Add reminder"
                            aria-label="Add reminder"
                          >
                            <IconReminder />
                          </button>
                          {showComposerReminder && (
                            <div className="composer-popover reminder-editor">
                              <p className="reminder-editor-title">
                                Remind me later
                              </p>
                              {getLaterTodayReminder() && (
                                <button
                                  type="button"
                                  className="reminder-option"
                                  onClick={() => {
                                    setComposerReminderAt(
                                      getLaterTodayReminder(),
                                    );
                                    setShowComposerReminder(false);
                                  }}
                                >
                                  <span>Later today</span>
                                  <span className="reminder-option-time">
                                    {formatReminderTime(getLaterTodayReminder())}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="reminder-option"
                                onClick={() => {
                                  setComposerReminderAt(getTomorrowReminder());
                                  setShowComposerReminder(false);
                                }}
                              >
                                <span>Tomorrow</span>
                                <span className="reminder-option-time">
                                  {formatReminderTime(getTomorrowReminder())}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="reminder-option"
                                onClick={() => {
                                  setComposerReminderAt(getNextWeekReminder());
                                  setShowComposerReminder(false);
                                }}
                              >
                                <span>Next week</span>
                                <span className="reminder-option-time">
                                  {formatReminderWeekday(getNextWeekReminder())}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="composer-tool-wrap">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              setShowComposerAiMenu((prev) => !prev);
                              setShowComposerColors(false);
                              setShowComposerReminder(false);
                            }}
                            title="AI actions"
                            aria-label="AI actions"
                            disabled={aiComposerBusy !== null}
                          >
                            <IconSparkles />
                          </button>
                          {showComposerAiMenu && (
                            <div className="composer-popover composer-ai-menu">
                              <button
                                type="button"
                                className="ai-menu-item"
                                onClick={() => runComposerAi("title")}
                              >
                                Generate title
                              </button>
                              <button
                                type="button"
                                className="ai-menu-item"
                                onClick={() => runComposerAi("grammar")}
                              >
                                Fix grammar
                              </button>
                              <button
                                type="button"
                                className="ai-menu-item"
                                onClick={() => runComposerAi("tags")}
                              >
                                Smart tags
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="icon-btn"
                          onClick={handleComposerImageClick}
                          title="Add image"
                          aria-label="Add image"
                          disabled={isSaving}
                        >
                          <IconAttachment />
                        </button>

                        <button
                          type="button"
                          className="icon-btn"
                          onClick={handleComposerArchive}
                          title="Archive"
                          aria-label="Archive"
                          disabled={isSaving}
                        >
                          <IconArchive />
                        </button>

                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => applyFormat("undo")}
                          title="Undo"
                          aria-label="Undo"
                        >
                          <IconUndo />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => applyFormat("redo")}
                          title="Redo"
                          aria-label="Redo"
                        >
                          <IconRedo />
                        </button>
                      </div>

                      <div className="composer-actions">
                        {isEditMode &&
                          (() => {
                            const editingNote = notes.find(
                              (note) => note.id === isEditingId,
                            );
                            return editingNote?.updatedAt ? (
                              <span className="composer-edited">
                                Edited {formatEditedDate(editingNote.updatedAt)}
                              </span>
                            ) : null;
                          })()}
                        <button
                          type="button"
                          className="composer-close-btn"
                          disabled={isSaving}
                          onClick={
                            isEditMode ? persistEditedNote : submitDraftIfNeeded
                          }
                        >
                          {isSaving ? "Saving..." : "Close"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </form>
              </div>

              {errorMessage && <p className="error-text">{errorMessage}</p>}

              {isLoading ? (
                <p className="jotter-status">
                  Jotter is gathering your notes...
                </p>
              ) : filteredNotes.length === 0 ? (
                <div className="jotter-empty-state">
                  {activeSidebarItem === "notes" && !activeLabel ? (
                    <img src="/jotter-logo.png" alt="" />
                  ) : (
                    <span className="empty-state-icon">
                      {activeLabel ? (
                        <IconLabel />
                      ) : (
                        SIDEBAR_ITEMS.find(
                          (item) => item.key === activeSidebarItem,
                        )?.icon
                      )}
                    </span>
                  )}
                  <p>No Jotter notes found in this section.</p>
                </div>
              ) : (
                (() => {
                  const renderNoteCard = (note) => {
                    const checklist = parseChecklist(note.content);
                    const isHtmlContent = /<[^>]+>/.test(note.content);
                    return (
                      <article
                        key={note.id}
                        className={`jotter-note-card ${
                          note.isTrashed ? "" : "editable"
                        }`}
                        style={{
                          background: resolveNoteColor(note.color, isDarkMode),
                        }}
                        draggable={isReorderable}
                        onDragStart={() => handleDragStart(note.id)}
                        onDragOver={isReorderable ? handleDragOver : undefined}
                        onDrop={
                          isReorderable ? () => handleDrop(note.id) : undefined
                        }
                        onClick={(event) => {
                          // Ignore clicks on interactive controls / toolbar / popovers.
                          if (
                            event.target.closest(
                              "button, a, input, textarea, .jotter-card-toolbar, .card-menu, .reminder-editor, .note-labels",
                            )
                          ) {
                            return;
                          }
                          if (!note.isTrashed) {
                            handleStartEdit(note);
                          }
                        }}
                      >
                        {note.attachments?.some((attachment) =>
                          attachment.type?.startsWith("image/"),
                        ) && (
                          <div className="note-card-images">
                            {note.attachments
                              .filter((attachment) =>
                                attachment.type?.startsWith("image/"),
                              )
                              .map((attachment) => (
                                <div
                                  className="note-card-image"
                                  key={attachment.id}
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.name}
                                  />
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="note-card-head">
                          <h3>{note.title}</h3>
                          <button
                            type="button"
                            className={`icon-btn card-pin ${
                              note.isPinned ? "pinned" : ""
                            }`}
                            onClick={() => handleToggleField(note, "isPinned")}
                            aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            {note.isPinned ? <IconPinFilled /> : <IconPin />}
                          </button>
                        </div>
                        {note.reminderAt && (
                          <button
                            type="button"
                            className={`reminder-badge ${
                              new Date(note.reminderAt) < new Date()
                                ? "overdue"
                                : ""
                            }`}
                            onClick={() => toggleReminderEditor(note.id)}
                          >
                            <IconReminder />
                            {new Date(note.reminderAt).toLocaleString()}
                          </button>
                        )}
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

                        {openReminderEditorId === note.id && (
                          <div className="reminder-editor">
                            <p className="reminder-editor-title">
                              Remind me later
                            </p>
                            {getLaterTodayReminder() && (
                              <button
                                type="button"
                                className="reminder-option"
                                onClick={() =>
                                  handleReminderChange(
                                    note,
                                    getLaterTodayReminder(),
                                  )
                                }
                              >
                                <span>Later today</span>
                                <span className="reminder-option-time">
                                  {formatReminderTime(getLaterTodayReminder())}
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="reminder-option"
                              onClick={() =>
                                handleReminderChange(
                                  note,
                                  getTomorrowReminder(),
                                )
                              }
                            >
                              <span>Tomorrow</span>
                              <span className="reminder-option-time">
                                {formatReminderTime(getTomorrowReminder())}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="reminder-option"
                              onClick={() =>
                                handleReminderChange(
                                  note,
                                  getNextWeekReminder(),
                                )
                              }
                            >
                              <span>Next week</span>
                              <span className="reminder-option-time">
                                {formatReminderWeekday(getNextWeekReminder())}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="reminder-option"
                              onClick={() =>
                                setCustomReminderNoteId(
                                  customReminderNoteId === note.id
                                    ? null
                                    : note.id,
                                )
                              }
                            >
                              <IconReminder />
                              <span>Pick date &amp; time</span>
                            </button>
                            {customReminderNoteId === note.id && (
                              <input
                                type="datetime-local"
                                className="reminder-custom-input"
                                defaultValue={
                                  note.reminderAt
                                    ? new Date(
                                        new Date(note.reminderAt).getTime() -
                                          new Date().getTimezoneOffset() *
                                            60000,
                                      )
                                        .toISOString()
                                        .slice(0, 16)
                                    : ""
                                }
                                onChange={(event) =>
                                  handleReminderChange(note, event.target.value)
                                }
                              />
                            )}
                            {note.reminderAt && (
                              <button
                                type="button"
                                className="reminder-option reminder-option-clear"
                                onClick={() => handleReminderChange(note, null)}
                              >
                                Remove reminder
                              </button>
                            )}
                          </div>
                        )}

                        {(note.labels?.length > 0 ||
                          openLabelEditorId === note.id) && (
                          <div className="note-labels">
                            {(note.labels || []).map((label) => (
                              <span key={label} className="label-chip">
                                {label}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLabel(note, label)}
                                  aria-label={`Remove label ${label}`}
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                            {openLabelEditorId === note.id && (
                              <input
                                type="text"
                                className="label-input"
                                placeholder="Add label, Enter to save"
                                value={labelDraftByNoteId[note.id] || ""}
                                onChange={(event) =>
                                  setLabelDraftByNoteId((prev) => ({
                                    ...prev,
                                    [note.id]: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleAddLabel(note);
                                  }
                                }}
                              />
                            )}
                          </div>
                        )}

                        {uploadingNoteId === note.id && (
                          <p className="attachment-status">Uploading...</p>
                        )}

                        {note.attachments?.some(
                          (attachment) =>
                            !attachment.type?.startsWith("image/"),
                        ) && (
                          <div className="note-attachments">
                            {note.attachments
                              .filter(
                                (attachment) =>
                                  !attachment.type?.startsWith("image/"),
                              )
                              .map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="attachment-item"
                                >
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="attachment-file-chip"
                                  >
                                    <IconAttachment /> {attachment.name}
                                  </a>
                                  <button
                                    type="button"
                                    className="attachment-remove"
                                    onClick={() =>
                                      handleRemoveAttachment(note, attachment.id)
                                    }
                                    aria-label={`Remove attachment ${attachment.name}`}
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}

                        {aiLoadingNoteId === note.id && (
                          <p className="attachment-status">Thinking...</p>
                        )}

                        {translationByNoteId[note.id] && (
                          <div className="ai-translation-banner">
                            <p>{translationByNoteId[note.id]}</p>
                            <button
                              type="button"
                              className="text-btn"
                              onClick={() =>
                                setTranslationByNoteId((prev) => {
                                  const next = { ...prev };
                                  delete next[note.id];
                                  return next;
                                })
                              }
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        <div className="jotter-card-toolbar">
                          <div className="note-card-actions">
                            <div className="palette-container">
                              <button
                                type="button"
                                className="icon-btn"
                                title="Change color"
                              >
                                <IconPalette />
                              </button>
                              <div className="inline-palette">
                                {NOTE_COLORS.map((color) => (
                                  <button
                                    key={`${note.id}-${color}`}
                                    type="button"
                                    className="mini-color-dot"
                                    style={{
                                      background: resolveNoteColor(
                                        color,
                                        isDarkMode,
                                      ),
                                    }}
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
                              onClick={() => toggleReminderEditor(note.id)}
                              title="Set reminder"
                            >
                              <IconReminder />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() =>
                                handleAttachmentButtonClick(note.id)
                              }
                              title="Add image"
                            >
                              <IconAttachment />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() =>
                                handleToggleField(note, "isArchived")
                              }
                              title={note.isArchived ? "Unarchive" : "Archive"}
                            >
                              <IconArchive />
                            </button>
                            <div className="card-menu-wrap">
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() =>
                                  setOpenCardMenuId(
                                    openCardMenuId === note.id
                                      ? null
                                      : note.id,
                                  )
                                }
                                aria-label="More options"
                                aria-haspopup="true"
                                aria-expanded={openCardMenuId === note.id}
                                title="More"
                              >
                                <IconMore />
                              </button>
                              {openCardMenuId === note.id && (
                                <div className="card-menu">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      handleExportNote(note, "txt");
                                    }}
                                  >
                                    Export note (.txt)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      setOpenLabelEditorId(
                                        openLabelEditorId === note.id
                                          ? null
                                          : note.id,
                                      );
                                    }}
                                  >
                                    Add label
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenCardMenuId(null);
                                      handleDuplicate(note.id);
                                    }}
                                  >
                                    Make a copy
                                  </button>
                                  {note.isTrashed ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuId(null);
                                          handleToggleField(note, "isTrashed");
                                        }}
                                      >
                                        Restore
                                      </button>
                                      <button
                                        type="button"
                                        className="card-menu-danger"
                                        onClick={() => {
                                          setOpenCardMenuId(null);
                                          handleDelete(note.id);
                                        }}
                                      >
                                        Delete permanently
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="card-menu-danger"
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        handleToggleField(note, "isTrashed");
                                      }}
                                    >
                                      Delete note
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  };

                  const groupPinned = activeSidebarItem === "notes";
                  const pinnedNotes = groupPinned
                    ? filteredNotes.filter((note) => note.isPinned)
                    : [];
                  const otherNotes = groupPinned
                    ? filteredNotes.filter((note) => !note.isPinned)
                    : filteredNotes;

                  const renderGroup = (groupNotes) =>
                    isGridView ? (
                      <NotesMasonry
                        notes={groupNotes}
                        renderCard={renderNoteCard}
                      />
                    ) : (
                      <div className="jotter-list">
                        {groupNotes.map(renderNoteCard)}
                      </div>
                    );

                  if (pinnedNotes.length === 0) {
                    return renderGroup(otherNotes);
                  }

                  return (
                    <>
                      <p className="notes-group-label">Pinned</p>
                      {renderGroup(pinnedNotes)}
                      {otherNotes.length > 0 && (
                        <>
                          <p className="notes-group-label">Others</p>
                          {renderGroup(otherNotes)}
                        </>
                      )}
                    </>
                  );
                })()
              )}
            </>
          )}
        </section>
      </div>

      {isLabelsDialogOpen && (
        <div className="modal-overlay" onClick={handleCloseLabelsDialog}>
          <div
            className="labels-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Edit labels"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="labels-dialog-title">Edit labels</h2>

            <div className="labels-dialog-row">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setNewLabelDraft("")}
                aria-label="Clear new label"
              >
                <IconClose />
              </button>
              <input
                type="text"
                className="labels-dialog-input"
                placeholder="Create new label"
                value={newLabelDraft}
                onChange={(event) => setNewLabelDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateLabelSubmit();
                  }
                }}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={handleCreateLabelSubmit}
                aria-label="Create label"
              >
                <IconCheck />
              </button>
            </div>

            {labelsDialogError && (
              <p className="error-text labels-dialog-error">
                {labelsDialogError}
              </p>
            )}

            <div className="labels-dialog-list">
              {labels.map((label) =>
                editingLabelName === label ? (
                  <div className="labels-dialog-row" key={label}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={handleCancelRenameLabel}
                      aria-label="Cancel rename"
                    >
                      <IconClose />
                    </button>
                    <input
                      type="text"
                      className="labels-dialog-input"
                      value={renameLabelDraft}
                      autoFocus
                      onChange={(event) =>
                        setRenameLabelDraft(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleConfirmRenameLabel();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={handleConfirmRenameLabel}
                      aria-label="Confirm rename"
                    >
                      <IconCheck />
                    </button>
                  </div>
                ) : (
                  <div className="labels-dialog-row" key={label}>
                    <span className="labels-dialog-icon">
                      <IconLabel />
                    </span>
                    <span className="labels-dialog-label-name">{label}</span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleStartRenameLabel(label)}
                      aria-label={`Edit label ${label}`}
                    >
                      <IconEdit />
                    </button>
                  </div>
                ),
              )}
            </div>

            <div className="labels-dialog-footer">
              <button
                type="button"
                className="text-btn"
                onClick={handleCloseLabelsDialog}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

DashboardPage.propTypes = {
  token: PropTypes.string,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    isEmailVerified: PropTypes.bool,
  }),
  isDarkMode: PropTypes.bool.isRequired,
  onToggleDarkMode: PropTypes.func.isRequired,
  onUpdateUser: PropTypes.func,
  onLogout: PropTypes.func,
};

export default DashboardPage;
