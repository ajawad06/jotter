import {
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

  test("lists notes with query filters", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: [] }));

    await listNotes("token", { status: "archive", label: "work" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes?status=archive&label=work",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      },
    );
  });

  test("fetches distinct labels", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: ["personal", "work"] }));

    await expect(fetchLabels("token")).resolves.toEqual(["personal", "work"]);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/labels",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      },
    );
  });

  test("creates a new label", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: ["travel"] }));

    await expect(createLabel("token", "travel")).resolves.toEqual(["travel"]);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/labels",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ name: "travel" }),
      },
    );
  });

  test("renames a label", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: ["office"] }));

    await expect(renameLabel("token", "work", "office")).resolves.toEqual([
      "office",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/labels/work",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ newName: "office" }),
      },
    );
  });

  test("duplicates a note", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: { id: "2" } }));

    await expect(duplicateNote("token", "1")).resolves.toEqual({ id: "2" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/1/duplicate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      },
    );
  });

  test("reorders notes", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: [{ id: "b" }, { id: "a" }] }));

    await reorderNotes("token", ["b", "a"]);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/reorder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ orderedIds: ["b", "a"] }),
      },
    );
  });

  test("uploads an attachment as multipart form data", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ data: { id: "1", attachments: [] } }),
    );
    const file = new File(["content"], "photo.png", { type: "image/png" });

    await uploadAttachment("token", "1", file);

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/1/attachments",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token" },
      }),
    );
    const [, options] = fetch.mock.calls[0];
    expect(options.body).toBeInstanceOf(FormData);
  });

  test("removes an attachment", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ data: { id: "1", attachments: [] } }),
    );

    await removeAttachment("token", "1", "att-1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/1/attachments/att-1",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      },
    );
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
