import { useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";

function SignupPage({ onSignup, isSubmitting }) {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    name: "",
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
      await onSignup(formValues);
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <section className="auth-card">
      <h1>Sign up</h1>
      <p>Create your account to save private notes.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="signup-name">Name</label>
        <input
          id="signup-name"
          name="name"
          type="text"
          value={formValues.name}
          onChange={handleChange}
          required
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          value={formValues.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleChange}
          required
          minLength={6}
        />

        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}

SignupPage.propTypes = {
  onSignup: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
};

export default SignupPage;
