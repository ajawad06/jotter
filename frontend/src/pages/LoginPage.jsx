import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import AuthBrandPanel from "../components/AuthBrandPanel";

function LoginPage({ onLogin, isSubmitting }) {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      await onLogin(formValues);
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="auth-container">
      <AuthBrandPanel ctaLabel="Create free account" ctaTo="/signup" />
      <div className="auth-form-side">
      <section className="auth-card">
        <div className="auth-logo-circle">
          <img src="/jotter-logo.png" alt="" />
        </div>
        <h1>Welcome back</h1>
        <p>Your ideas are waiting for you.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="auth-switch">
          New user? <Link to="/signup">Create an account</Link>
        </p>
      </section>
      </div>
    </div>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

export default LoginPage;
