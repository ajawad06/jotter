const API_BASE_URL = "http://localhost:5000/api/notes";

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

const listNotes = async (token) => {
  const response = await fetch(API_BASE_URL, {
    method: "GET",
    headers: buildAuthHeaders(token),
  });

  return parseApiResponse(response);
};

const createNote = async (token, payload) => {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const updateNote = async (token, noteId, payload) => {
  const response = await fetch(`${API_BASE_URL}/${noteId}`, {
    method: "PUT",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const updateNoteAppearance = async (token, noteId, payload) => {
  const response = await fetch(`${API_BASE_URL}/${noteId}`, {
    method: "PUT",
    headers: buildAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const deleteNote = async (token, noteId) => {
  const response = await fetch(`${API_BASE_URL}/${noteId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token),
  });

  await parseApiResponse(response);
};

export { createNote, deleteNote, listNotes, updateNote, updateNoteAppearance };
