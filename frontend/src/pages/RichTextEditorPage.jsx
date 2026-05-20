import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { createNote, updateNote } from "../api/noteApi";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "code-block"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "link",
  "code-block",
];

function RichTextEditorPage({ token, isDarkMode }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const quillRef = useRef(null);

  const [noteId] = useState(state?.noteId || null);
  const [title, setTitle] = useState(state?.title || "");
  const [html, setHtml] = useState(state?.content || "");
  const [color, setColor] = useState(state?.color || "#ffffff");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const handleCancel = () => {
    navigate("/dashboard");
  };

  const handleSave = async () => {
    setErrorMessage("");

    // Basic validation: Check if title or content exists
    const trimmedHtml = html.trim();
    const plainText = trimmedHtml.replace(/<[^>]*>/g, "").trim();
    if (!title.trim() && !plainText) {
      setErrorMessage("Please provide a title or some content for your note.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim() || "Untitled",
        content: trimmedHtml,
        color,
      };

      if (noteId) {
        await updateNote(token, noteId, payload);
      } else {
        await createNote(token, payload);
      }

      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error.message || "Failed to save note. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={`editor-layout ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="editor-header">
        <button
          type="button"
          className="text-btn back-btn"
          onClick={handleCancel}
        >
          &larr; Back
        </button>
        <div className="editor-actions">
          {errorMessage && (
            <span className="error-text mini-error">{errorMessage}</span>
          )}
          <button
            type="button"
            className="text-btn cancel-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="editor-card" style={{ backgroundColor: color }}>
        <input
          className="editor-title"
          type="text"
          placeholder="Note Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
        />

        <div className="quill-wrapper">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={html}
            onChange={setHtml}
            modules={modules}
            formats={formats}
            placeholder="Write your note here..."
          />
        </div>

        <div className="editor-footer">
          <div className="editor-colors">
            {[
              "#ffffff",
              "#f28b82",
              "#fbbc04",
              "#fff475",
              "#ccff90",
              "#a7ffeb",
              "#cbf0f8",
              "#aecbfa",
              "#d7aefb",
              "#fdcfe8",
            ].map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`color-dot ${color === swatch ? "selected" : ""}`}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
                aria-label={`Select color ${swatch}`}
              />
            ))}
          </div>
          <span className="editor-hint">
            Changes are saved to your account.
          </span>
        </div>
      </div>
    </section>
  );
}

RichTextEditorPage.propTypes = {
  token: PropTypes.string,
  isDarkMode: PropTypes.bool,
};

export default RichTextEditorPage;
