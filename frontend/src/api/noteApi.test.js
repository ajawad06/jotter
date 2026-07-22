import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  updateNoteAppearance,
} from "./noteApi";

const jsonResponse = ({ ok = true, status = 200, data, message } = {}) => ({
  ok,
  status,
  headers: {
    get: () => "application/json",
  },
  json: jest.fn().mockResolvedValue({ data, message }),
});

describe("noteApi", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  test("lists notes with auth headers", async () => {
    const notes = [{ id: "1", title: "Test" }];
    fetch.mockResolvedValue(jsonResponse({ data: notes }));

    await expect(listNotes("token")).resolves.toEqual(notes);

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/notes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  test("creates and updates notes with JSON payloads", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: { id: "1" } }));

    await createNote("token", { title: "New", content: "Body" });
    await updateNote("token", "1", { title: "Updated" });
    await updateNoteAppearance("token", "1", { color: "#ffffff" });

    expect(fetch).toHaveBeenNthCalledWith(1, "http://localhost:5000/api/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ title: "New", content: "Body" }),
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:5000/api/notes/1",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ title: "Updated" }),
      },
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "http://localhost:5000/api/notes/1",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ color: "#ffffff" }),
      },
    );
  });

  test("deletes a note after parsing the response", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: null }));

    await expect(deleteNote("token", "1")).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/notes/1", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  test("throws response messages and dispatches unauthorized events", async () => {
    const listener = jest.fn();
    window.addEventListener("unauthorized", listener);
    fetch.mockResolvedValue(
      jsonResponse({ ok: false, status: 401, message: "Please log in" }),
    );

    await expect(listNotes("bad-token")).rejects.toThrow("Please log in");

    expect(listener).toHaveBeenCalled();
    window.removeEventListener("unauthorized", listener);
  });

  test("uses a fallback message for non-json failures", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: () => "text/plain",
      },
      json: jest.fn(),
    });

    await expect(listNotes("token")).rejects.toThrow(
      "Server returned an unexpected response format",
    );
  });
});
