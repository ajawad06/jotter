const API_BASE_URL = "http://localhost:5000/api/notes";
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

const listNotes = async (token, filters = {}) => {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
  ).toString();
  const url = query ? `${API_BASE_URL}?${query}` : API_BASE_URL;

  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: buildAuthHeaders(token),
  });

  return parseApiResponse(response);
};

const fetchLabels = async (token) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/labels`, {
    method: "GET",
    headers: buildAuthHeaders(token),
  });

  return parseApiResponse(response);
};

const createLabel = async (token, name) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/labels`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ name }),
  });

  return parseApiResponse(response);
};

const renameLabel = async (token, oldLabel, newName) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/labels/${encodeURIComponent(oldLabel)}`,
    {
      method: "PATCH",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ newName }),
    },
  );

  return parseApiResponse(response);
};

const duplicateNote = async (token, noteId) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/${noteId}/duplicate`, {
    method: "POST",
    headers: buildAuthHeaders(token),
  });

  return parseApiResponse(response);
};

const reorderNotes = async (token, orderedIds) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/reorder`, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ orderedIds }),
  });

  return parseApiResponse(response);
};

const createNote = async (token, payload) => {
  const response = await fetchWithTimeout(API_BASE_URL, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const updateNote = async (token, noteId, payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/${noteId}`, {
    method: "PUT",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const updateNoteAppearance = async (token, noteId, payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/${noteId}`, {
    method: "PUT",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const deleteNote = async (token, noteId) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/${noteId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token),
  });

  await parseApiResponse(response);
};

const uploadAttachment = async (token, noteId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${noteId}/attachments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  return parseApiResponse(response);
};

const removeAttachment = async (token, noteId, attachmentId) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${noteId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    },
  );

  return parseApiResponse(response);
};

export {
  createLabel,
  createNote,
  deleteNote,
  duplicateNote,
  fetchLabels,
  listNotes,
  removeAttachment,
  renameLabel,
  reorderNotes,
  updateNote,
  updateNoteAppearance,
  uploadAttachment,
};
