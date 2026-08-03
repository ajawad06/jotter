import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/authApi";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(token, password);
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <section className="auth-card">
        <div className="auth-logo-circle">
          <img src="/jotter-logo.png" alt="" />
        </div>
        <h1>Reset password</h1>

        {!token ? (
          <p className="error-text">
            This reset link is missing a token. Request a new one from the{" "}
            <Link to="/forgot-password">forgot password</Link> page.
          </p>
        ) : isSubmitted ? (
          <>
            <p>Your password has been reset successfully.</p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigate("/login")}
            >
              Go to login
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reset-confirm-password">Confirm password</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>

            {errorMessage && <p className="error-text">{errorMessage}</p>}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    </div>
  );
}

export default ResetPasswordPage;
