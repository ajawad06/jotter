const NOTES_BASE_URL = "http://localhost:5000/api/notes";
const AI_BASE_URL = "http://localhost:5000/api/ai";
const REQUEST_TIMEOUT_MS = 30000;

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
  const contentType = response.headers.get("content-type") || "";
  const isJsonResponse = contentType.includes("application/json");

  const data = isJsonResponse
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

  return data.data;
};

const buildAuthHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const runAiAction = async (token, noteId, action, options = {}) => {
  const response = await fetchWithTimeout(
    `${NOTES_BASE_URL}/${noteId}/ai/${action}`,
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(options),
    },
  );

  return parseApiResponse(response);
};

const runDraftAiAction = async (token, action, draft = {}) => {
  const response = await fetchWithTimeout(`${AI_BASE_URL}/draft/${action}`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(draft),
  });

  return parseApiResponse(response);
};

const chatWithNotes = async (token, message, history = []) => {
  const response = await fetchWithTimeout(`${AI_BASE_URL}/chat`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ message, history }),
  });

  return parseApiResponse(response);
};

export { chatWithNotes, runAiAction, runDraftAiAction };
