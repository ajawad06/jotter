import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";

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
    <section className="auth-card">
      <h1>Login</h1>
      <p>Welcome back. Sign in to manage your notes.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          value={formValues.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleChange}
          required
        />

        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">
        New user? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

export default LoginPage;
