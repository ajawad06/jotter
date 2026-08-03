const { expect } = require("chai");

const { createAiService } = require("../src/services/ai.service");
const AppError = require("../src/utils/appError");

describe("AI service", () => {
  const note = { title: "Groceries", content: "milk\neggs\nbread" };

  const mockFetch = (content) => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    });
  };

  afterEach(() => {
    delete global.fetch;
  });

  it("rejects when the API key is not configured", async () => {
    const aiService = createAiService({ apiKey: "" });

    try {
      await aiService.run("title", note);
      throw new Error("Expected run to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(503);
    }
  });

  it("generates a title", async () => {
    mockFetch("Weekly Groceries");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.run("title", note);
    expect(result).to.deep.equal({ title: "Weekly Groceries" });
  });

  it("parses a comma-separated tag list", async () => {
    mockFetch("- shopping\n- food, errands");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.run("tags", note);
    expect(result.tags).to.deep.equal(["shopping", "food", "errands"]);
  });

  it("translates note content using the requested language", async () => {
    let capturedBody;
    global.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "lait, oeufs, pain" } }] }),
      };
    };

    const aiService = createAiService({ apiKey: "test-key" });
    const result = await aiService.run("translate", note, {
      targetLanguage: "French",
    });

    expect(result).to.deep.equal({ translation: "lait, oeufs, pain" });
    expect(capturedBody.messages[0].content).to.include("French");
  });

  it("rejects unsupported actions", async () => {
    mockFetch("irrelevant");
    const aiService = createAiService({ apiKey: "test-key" });

    try {
      await aiService.run("unknown", note);
      throw new Error("Expected run to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("surfaces API errors as a 502", async () => {
    global.fetch = async () => ({
      ok: false,
      json: async () => ({ error: { message: "rate limited" } }),
    });

    const aiService = createAiService({ apiKey: "test-key" });

    try {
      await aiService.run("summary", note);
      throw new Error("Expected run to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(502);
      expect(error.message).to.equal("rate limited");
    }
  });

  it("rejects chat without a message", async () => {
    const aiService = createAiService({ apiKey: "test-key" });

    try {
      await aiService.chat([note], "");
      throw new Error("Expected chat to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("answers chat questions grounded in the provided notes", async () => {
    mockFetch("You need milk, eggs, and bread.");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat([note], "What do I need to buy?");
    expect(result).to.deep.equal({ answer: "You need milk, eggs, and bread." });
  });

  it("summarizes a note", async () => {
    mockFetch("A short grocery list.");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.run("summary", note);
    expect(result).to.deep.equal({ summary: "A short grocery list." });
  });

  it("corrects grammar for a note", async () => {
    mockFetch("milk, eggs, bread");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.run("grammar", note);
    expect(result).to.deep.equal({ corrected: "milk, eggs, bread" });
  });

  it("extracts tasks one per line", async () => {
    mockFetch("- buy milk\n- buy eggs");
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.run("tasks", note);
    expect(result.tasks).to.deep.equal(["buy milk", "buy eggs"]);
  });

  // Helper: mock a Groq chat-completion response (supports tool_calls).
  const mockChat = (message) => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message }] }),
    });
  };

  const toolCall = (name, args) => ({
    function: { name, arguments: JSON.stringify(args) },
  });

  it("rejects chat when the API key is missing", async () => {
    const aiService = createAiService({ apiKey: "" });

    try {
      await aiService.chat([note], "hello", { createNote: async () => ({}) });
      throw new Error("Expected chat to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(503);
    }
  });

  it("surfaces chat API errors as a 502", async () => {
    global.fetch = async () => ({
      ok: false,
      json: async () => ({ error: { message: "overloaded" } }),
    });
    const aiService = createAiService({ apiKey: "test-key" });

    try {
      await aiService.chat([note], "hello", { createNote: async () => ({}) });
      throw new Error("Expected chat to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(502);
      expect(error.message).to.equal("overloaded");
    }
  });

  it("creates a note via a tool call and reports the change", async () => {
    mockChat({
      tool_calls: [toolCall("create_note", { title: "Todo", content: "walk dog" })],
    });
    let created;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat([], "add a note to walk the dog", {
      createNote: async (payload) => {
        created = payload;
        return { title: payload.title };
      },
    });

    expect(created).to.deep.equal({ title: "Todo", content: "walk dog" });
    expect(result.action).to.equal("notes_changed");
    expect(result.answer).to.match(/Created a note/);
  });

  it("asks for content when create_note has none", async () => {
    mockChat({ tool_calls: [toolCall("create_note", { title: "Todo" })] });
    let createCalled = false;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat([], "make a note", {
      createNote: async () => {
        createCalled = true;
        return {};
      },
    });

    expect(createCalled).to.equal(false);
    expect(result.action).to.be.undefined;
    expect(result.answer).to.match(/What should the note say/);
  });

  it("sets a reminder on a note resolved by title", async () => {
    const notes = [{ id: "n1", title: "Groceries", content: "milk" }];
    mockChat({
      tool_calls: [
        toolCall("set_reminder", {
          note_title: "groceries",
          when: "2026-08-10T09:00:00.000Z",
        }),
      ],
    });
    let update;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat(notes, "remind me about groceries", {
      updateNote: async (id, payload) => {
        update = { id, payload };
      },
    });

    expect(update.id).to.equal("n1");
    expect(update.payload.reminderAt).to.equal("2026-08-10T09:00:00.000Z");
    expect(result.action).to.equal("notes_changed");
  });

  it("adds a label to a note, de-duplicating existing labels", async () => {
    const notes = [
      { id: "n1", title: "Groceries", content: "milk", labels: ["home"] },
    ];
    mockChat({
      tool_calls: [
        toolCall("add_label", { note_title: "Groceries", label: "shopping" }),
      ],
    });
    let update;
    const aiService = createAiService({ apiKey: "test-key" });

    await aiService.chat(notes, "tag groceries as shopping", {
      updateNote: async (id, payload) => {
        update = { id, payload };
      },
    });

    expect(update.payload.labels).to.deep.equal(["home", "shopping"]);
  });

  it("archives a note via a tool call", async () => {
    const notes = [{ id: "n1", title: "Groceries", content: "milk" }];
    mockChat({
      tool_calls: [
        toolCall("set_archived", { note_title: "Groceries", archived: true }),
      ],
    });
    let update;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat(notes, "archive groceries", {
      updateNote: async (id, payload) => {
        update = { id, payload };
      },
    });

    expect(update.payload.isArchived).to.equal(true);
    expect(result.answer).to.match(/Archived/);
  });

  it("moves a note to trash via a tool call", async () => {
    const notes = [{ id: "n1", title: "Groceries", content: "milk" }];
    mockChat({
      tool_calls: [toolCall("trash_note", { note_title: "Groceries" })],
    });
    let update;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat(notes, "delete groceries", {
      updateNote: async (id, payload) => {
        update = { id, payload };
      },
    });

    expect(update.payload.isTrashed).to.equal(true);
    expect(result.answer).to.match(/trash/i);
  });

  it("returns a clarification when a tool references an unknown note", async () => {
    const notes = [{ id: "n1", title: "Groceries", content: "milk" }];
    mockChat({
      tool_calls: [
        toolCall("set_reminder", { note_title: "Nonexistent", when: "x" }),
      ],
    });
    let updateCalled = false;
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat(notes, "remind me", {
      updateNote: async () => {
        updateCalled = true;
      },
    });

    expect(updateCalled).to.equal(false);
    expect(result.action).to.be.undefined;
    expect(result.answer).to.match(/couldn't find/i);
  });

  it("returns a clarification when a title is ambiguous", async () => {
    const notes = [
      { id: "n1", title: "Work notes", content: "a" },
      { id: "n2", title: "Work tasks", content: "b" },
    ];
    mockChat({
      tool_calls: [toolCall("trash_note", { note_title: "Work" })],
    });
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat(notes, "delete work", {
      updateNote: async () => {
        throw new Error("should not update on ambiguous match");
      },
    });

    expect(result.answer).to.match(/which one/i);
  });

  it("passes recent conversation history to the model", async () => {
    let capturedBody;
    global.fetch = async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      };
    };
    const aiService = createAiService({ apiKey: "test-key" });

    await aiService.chat([note], "and now?", {
      history: [
        { role: "user", text: "hello" },
        { role: "assistant", text: "hi there" },
        { role: "system", text: "ignored" },
        { role: "user", text: "" },
      ],
    });

    const roles = capturedBody.messages.map((m) => m.role);
    // system prompt + 2 valid history entries + final user message
    expect(capturedBody.messages).to.have.length(4);
    expect(roles).to.deep.equal(["system", "user", "assistant", "user"]);
    expect(capturedBody.messages[1].content).to.equal("hello");
  });

  it("falls back to a default answer when a tool returns no text", async () => {
    mockChat({ tool_calls: [toolCall("unknown_tool", {})] });
    const aiService = createAiService({ apiKey: "test-key" });

    const result = await aiService.chat([note], "do something", {
      createNote: async () => ({}),
    });

    expect(result.answer).to.equal("Done.");
    expect(result.action).to.be.undefined;
  });
});
