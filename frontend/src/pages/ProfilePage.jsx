import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  changePassword,
  deleteAccount,
  resendVerification,
  updateProfile,
} from "../api/authApi";
import { listNotes } from "../api/noteApi";
import { IconCheck } from "../components/Icons";

const JOTTER_PROFILE_COLORS = [
  "#1a73e8",
  "#d93025",
  "#f9ab00",
  "#188038",
  "#af5cf7",
  "#00acc1",
  "#ff6d00",
];

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ProfilePage({ user, token, onUpdateUser, onLogout, isDarkMode }) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(user?.name || "");

  const [stats, setStats] = useState(null);

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [verificationMessage, setVerificationMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    listNotes(token)
      .then((notes) => {
        if (!isMounted) return;
        const activeNotes = notes.filter((note) => !note.isTrashed);
        const labels = new Set();
        notes.forEach((note) =>
          (note.labels || []).forEach((label) => labels.add(label)),
        );
        setStats({
          total: activeNotes.length,
          pinned: activeNotes.filter((note) => note.isPinned).length,
          archived: activeNotes.filter((note) => note.isArchived).length,
          labels: labels.size,
        });
      })
      .catch(() => {
        if (isMounted) setStats({ total: 0, pinned: 0, archived: 0, labels: 0 });
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleUpdateName = async () => {
    setError("");
    setIsUpdating(true);
    try {
      const updatedUser = await updateProfile(token, { name });
      onUpdateUser(updatedUser);
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
      setError("Image is too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setError("");
      setIsUpdating(true);
      try {
        const updatedUser = await updateProfile(token, {
          profileImage: reader.result,
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

  const handleResendVerification = async () => {
    setVerificationMessage("");
    setIsResending(true);
    try {
      await resendVerification(token);
      setVerificationMessage("Verification email sent. Check your inbox.");
    } catch (err) {
      setVerificationMessage(err.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(
        token,
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordMessage("Password changed successfully.");
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError("");
    setIsDeleting(true);
    try {
      await deleteAccount(token);
      onLogout?.();
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const initials = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const isVerified = user?.isEmailVerified;

  return (
    <div className={`profile-container ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="jotter-header">
        <div
          className="jotter-brand"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <img className="jotter-logo" src="/jotter-logo.png" alt="" />
          <span className="jotter-title">Jotter</span>
        </div>
        <button
          type="button"
          className="profile-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          Back to Notes
        </button>
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
            <div className="profile-hero-info">
              <h2>{user?.name}</h2>
              <p className="profile-email">{user?.email}</p>
              <span
                className={`verify-badge ${
                  isVerified ? "verified" : "unverified"
                }`}
              >
                {isVerified && <IconCheck />}
                {isVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-tile">
              <span className="stat-value">{stats ? stats.total : "—"}</span>
              <span className="stat-label">Notes</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats ? stats.pinned : "—"}</span>
              <span className="stat-label">Pinned</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats ? stats.archived : "—"}</span>
              <span className="stat-label">Archived</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats ? stats.labels : "—"}</span>
              <span className="stat-label">Labels</span>
            </div>
          </div>

          {error && <p className="profile-error">{error}</p>}

          <div className="profile-section">
            <h3>Personal info</h3>
            <div className="profile-input-group">
              <label>Display name</label>
              <div className="input-with-button">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={isUpdating || name === user?.name || !name.trim()}
                  className="profile-save-btn"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Appearance</h3>
            <div className="profile-actions-grid">
              <label className="profile-action-btn">
                <span>Upload photo</span>
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
                  Remove photo
                </button>
              )}
            </div>
            <div className="profile-color-picker">
              <span className="profile-field-label">Theme color</span>
              <div className="profile-colors">
                {JOTTER_PROFILE_COLORS.map((color) => (
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
          </div>

          {!isVerified && (
            <div className="profile-section">
              <h3>Email verification</h3>
              <p className="profile-hint">
                Verify your email to secure your account and enable all
                features.
              </p>
              <button
                type="button"
                className="profile-action-btn"
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
              {verificationMessage && (
                <p className="profile-success">{verificationMessage}</p>
              )}
            </div>
          )}

          <div className="profile-section">
            <h3>Change password</h3>
            <form className="password-form" onSubmit={handleChangePassword}>
              <input
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
              <input
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
              <input
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
              <button
                type="submit"
                className="profile-save-btn"
                disabled={
                  isChangingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword
                }
              >
                {isChangingPassword ? "Updating..." : "Update password"}
              </button>
              {passwordError && (
                <p className="profile-error">{passwordError}</p>
              )}
              {passwordMessage && (
                <p className="profile-success">{passwordMessage}</p>
              )}
            </form>
          </div>

          <div className="profile-section danger-zone">
            <h3>Danger zone</h3>
            <p className="profile-hint">
              Deleting your account permanently removes your profile and all of
              your notes. This cannot be undone.
            </p>
            {!isConfirmingDelete ? (
              <button
                type="button"
                className="danger-btn"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete account
              </button>
            ) : (
              <div className="delete-confirm">
                <label>
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
                <div className="delete-confirm-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                    onClick={handleDeleteAccount}
                  >
                    {isDeleting ? "Deleting..." : "Permanently delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

ProfilePage.propTypes = {
  user: PropTypes.object,
  token: PropTypes.string,
  onUpdateUser: PropTypes.func.isRequired,
  onLogout: PropTypes.func,
  isDarkMode: PropTypes.bool,
};

export default ProfilePage;
