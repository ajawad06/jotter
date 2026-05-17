import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { login, logout, signup } from "./api/authApi";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode);
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const handleLogout = useCallback(async () => {
    try {
      if (session.token) {
        await logout(session.token);
      }
    } catch {
      // Ignore logout errors, still clear session
    } finally {
      clearSession();
      setSession({ token: null, user: null });
    }
  }, [session.token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, [handleLogout]);

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

  const handleUpdateSessionUser = (updatedUser) => {
    setSession((prev) => {
      const newSession = {
        ...prev,
        user: { ...prev.user, ...updatedUser },
      };
      saveSession(newSession);
      return newSession;
    });
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
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ProfilePage
                token={session.token}
                user={session.user}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateSessionUser}
                isDarkMode={isDarkMode}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RichTextEditorPage
                token={session.token}
                isDarkMode={isDarkMode}
              />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
