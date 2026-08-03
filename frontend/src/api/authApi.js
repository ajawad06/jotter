const API_BASE_URL = "http://localhost:5000/api/auth";
const REQUEST_TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url, options) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Request timed out. Is the backend running?"));
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetch(url, options), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseApiResponse = async (response) => {
  const contentType = response?.headers?.get?.("content-type") || "";
  const canParseJson = typeof response?.json === "function";
  const isJsonResponse =
    !contentType || contentType.includes("application/json");

  const data =
    canParseJson && isJsonResponse
      ? await response.json()
      : {
          message: "Server returned an unexpected response format",
        };

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }
    throw new Error(data.message || "Request failed");
  }

  return data.data !== undefined ? data.data : data;
};

const signup = async (payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const login = async (payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const logout = async (token) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
};

const getProfile = async (token) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
};

const updateProfile = async (token, payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const verifyEmail = async (token) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  return parseApiResponse(response);
};

const resendVerification = async (token) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/resend-verification`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return parseApiResponse(response);
};

const changePassword = async (token, currentPassword, newPassword) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return parseApiResponse(response);
};

const deleteAccount = async (token) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseApiResponse(response);
};

const forgotPassword = async (email) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return parseApiResponse(response);
};

const resetPassword = async (token, password) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, password }),
  });

  return parseApiResponse(response);
};

export {
  changePassword,
  deleteAccount,
  forgotPassword,
  getProfile,
  login,
  logout,
  resendVerification,
  resetPassword,
  signup,
  updateProfile,
  verifyEmail,
};
