import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { login, signup } from "./api/authApi";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RichTextEditorPage from "./pages/RichTextEditorPage";
import SignupPage from "./pages/SignupPage";
import {
  clearSession,
  getToken,
  getUser,
  saveSession,
} from "./utils/authStorage";

function App() {
  const [session, setSession] = useState(() => ({
    token: getToken(),
    user: getUser(),
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthenticated = Boolean(session.token);

  const handleSignup = async (payload) => {
    setIsSubmitting(true);
    try {
      const data = await signup(payload);
      saveSession(data);
      setSession(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (payload) => {
    setIsSubmitting(true);
    try {
      const data = await login(payload);
      saveSession(data);
      setSession(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession({ token: null, user: null });
  };

  return (
    <main className="container">
      <Routes>
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLogin={handleLogin} isSubmitting={isSubmitting} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SignupPage onSignup={handleSignup} isSubmitting={isSubmitting} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardPage
                token={session.token}
                user={session.user}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RichTextEditorPage token={session.token} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
