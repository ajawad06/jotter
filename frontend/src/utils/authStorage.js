const AUTH_TOKEN_KEY = "notes_app_token";
const AUTH_USER_KEY = "notes_app_user";

const saveSession = ({ token, user }) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const getUser = () => {
  const rawValue = localStorage.getItem(AUTH_USER_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export { clearSession, getToken, getUser, saveSession };
