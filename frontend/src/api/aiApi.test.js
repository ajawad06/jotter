import { chatWithNotes, runAiAction } from "./aiApi";

const jsonResponse = ({ ok = true, status = 200, data, message } = {}) => ({
  ok,
  status,
  headers: {
    get: () => "application/json",
  },
  json: jest.fn().mockResolvedValue({ data, message }),
});

describe("aiApi", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  test("runs an AI action for a note", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: { summary: "Short" } }));

    await expect(runAiAction("token", "1", "summary")).resolves.toEqual({
      summary: "Short",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/1/ai/summary",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({}),
      },
    );
  });

  test("runs a translate action with options", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ data: { translation: "Bonjour" } }),
    );

    await runAiAction("token", "1", "translate", { targetLanguage: "French" });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/notes/1/ai/translate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
        body: JSON.stringify({ targetLanguage: "French" }),
      },
    );
  });

  test("chats with notes", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: { answer: "42" } }));

    await expect(chatWithNotes("token", "What is it?")).resolves.toEqual({
      answer: "42",
    });

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ message: "What is it?", history: [] }),
    });
  });

  test("throws response messages and dispatches unauthorized events", async () => {
    const listener = jest.fn();
    window.addEventListener("unauthorized", listener);
    fetch.mockResolvedValue(
      jsonResponse({ ok: false, status: 401, message: "Please log in" }),
    );

    await expect(chatWithNotes("bad-token", "hi")).rejects.toThrow(
      "Please log in",
    );

    expect(listener).toHaveBeenCalled();
    window.removeEventListener("unauthorized", listener);
  });
});
