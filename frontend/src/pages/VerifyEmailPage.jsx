import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { verifyEmail } from "../api/authApi";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("This verification link is missing a token.");
      return;
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((error) => {
        setStatus("error");
        setErrorMessage(error.message);
      });
  }, [token]);

  return (
    <div className="auth-container">
      <section className="auth-card">
        <div className="auth-logo-circle">
          <img src="/jotter-logo.png" alt="" />
        </div>
        <h1>Email verification</h1>

        {status === "verifying" && <p>Verifying your email...</p>}
        {status === "success" && <p>Your email has been verified. You can now sign in.</p>}
        {status === "error" && <p className="error-text">{errorMessage}</p>}

        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    </div>
  );
}

export default VerifyEmailPage;
