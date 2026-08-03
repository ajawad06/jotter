import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
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
        <h1>Forgot password</h1>

        {isSubmitted ? (
          <p>
            If an account exists for that email, a reset link has been sent.
            Check your inbox.
          </p>
        ) : (
          <>
            <p>Enter your email and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {errorMessage && <p className="error-text">{errorMessage}</p>}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
