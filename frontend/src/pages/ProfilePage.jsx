import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { jsPDF } from "jspdf";
import { updateProfile } from "../api/authApi";
import { listNotes } from "../api/noteApi";

const GOOGLE_COLORS = [
  "#1a73e8",
  "#d93025",
  "#f9ab00",
  "#188038",
  "#af5cf7",
  "#00acc1",
  "#ff6d00",
];

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

function ProfilePage({ user, token, onLogout, onUpdateUser, isDarkMode }) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(user?.name || "");

  const handleUpdateName = async () => {
    setError("");
    setIsUpdating(true);
    try {
      const updatedUser = await updateProfile(token, { name });
      onUpdateUser(updatedUser);
      alert("Profile name updated!");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateColor = async (color) => {
    setError("");
    try {
      const updatedUser = await updateProfile(token, { profileColor: color });
      onUpdateUser(updatedUser);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setError("");
      setIsUpdating(true);
      try {
        const base64Image = reader.result;
        const updatedUser = await updateProfile(token, {
          profileImage: base64Image,
        });
        onUpdateUser(updatedUser);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsUpdating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    setError("");
    setIsUpdating(true);
    try {
      const updatedUser = await updateProfile(token, { profileImage: "" });
      onUpdateUser(updatedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportAll = async (format = "txt") => {
    setError("");
    setIsUpdating(true);
    try {
      const notes = await listNotes(token);
      if (notes.length === 0) {
        alert("No notes to export.");
        return;
      }

      const filename = `Keep_Export_${new Date().toISOString().split("T")[0]}.${format}`;

      if (format === "txt") {
        const fullContent = notes
          .map((n) => {
            const formattedContent = formatContentForExport(n.content);
            return `TITLE: ${n.title}\nCONTENT: ${formattedContent}\n------------------\n`;
          })
          .join("\n");

        const element = document.createElement("a");
        const file = new Blob([fullContent], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } else if (format === "pdf") {
        const doc = new jsPDF();
        let yPos = 20;

        notes.forEach((n, index) => {
          if (index > 0) {
            doc.addPage();
            yPos = 20;
          }
          const formattedContent = formatContentForExport(n.content);
          doc.setFontSize(16);
          doc.text(n.title || "Untitled", 10, yPos);
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(formattedContent, 180);
          doc.text(splitText, 10, yPos + 10);
        });
        doc.save(filename);
      }
    } catch (err) {
      setError("Export failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className={`profile-container ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="keep-header">
        <div
          className="keep-brand"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <span className="keep-logo">💡</span>
          <span className="keep-title">Keep</span>
        </div>
      </header>

      <div className="profile-card-wrapper">
        <section className="profile-card">
          <div className="profile-hero">
            <div
              className="profile-avatar-large"
              style={{
                backgroundColor: user?.profileColor || "#1a73e8",
                backgroundImage: user?.profileImage
                  ? `url(${user.profileImage})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!user?.profileImage && initials}
            </div>
            <h2>{user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
          </div>

          <div className="profile-section">
            <h3>Personal Info</h3>
            <div className="profile-input-group">
              <label>Name</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={isUpdating || name === user?.name}
                  className="profile-save-btn"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Profile Actions</h3>
            <div className="profile-actions-grid">
              <label className="profile-action-btn">
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </label>
              {user?.profileImage && (
                <button
                  onClick={handleRemoveImage}
                  className="profile-action-btn delete"
                >
                  Remove Photo
                </button>
              )}
              <button
                onClick={() => handleExportAll("txt")}
                className="profile-action-btn"
                disabled={isUpdating}
              >
                Export All (TXT)
              </button>
              <button
                onClick={() => handleExportAll("pdf")}
                className="profile-action-btn"
                disabled={isUpdating}
              >
                Export All (PDF)
              </button>
            </div>
          </div>

          <div className="profile-section">
            <h3>Theme Color</h3>
            <div className="profile-colors">
              {GOOGLE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`profile-color-dot ${
                    user?.profileColor === color ? "active" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleUpdateColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="profile-error">{error}</p>}

          <div className="profile-footer">
            <button onClick={() => navigate("/dashboard")} className="text-btn">
              Back to Notes
            </button>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

ProfilePage.propTypes = {
  user: PropTypes.object,
  token: PropTypes.string,
  onLogout: PropTypes.func.isRequired,
  onUpdateUser: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool,
};

export default ProfilePage;
