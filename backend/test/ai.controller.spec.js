const { expect } = require("chai");

const { createAiController } = require("../src/controllers/ai.controller");

describe("AI controller", () => {
  const buildRes = () => ({
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  });

  it("runs an AI action and persists the result on the note", async () => {
    let updatePayload;
    const controller = createAiController({
      aiService: {
        run: async (action, note) => {
          expect(action).to.equal("summary");
          expect(note.id).to.equal("5");
          return { summary: "Short summary" };
        },
      },
      noteService: {
        getUserNote: async () => ({ id: "5", title: "Note", content: "Body" }),
        updateUserNote: async (_userId, _noteId, payload) => {
          updatePayload = payload;
          return { id: "5", aiSummary: "Short summary" };
        },
      },
    });

    const req = {
      user: { id: 1 },
      params: { id: "5", action: "summary" },
      body: {},
    };
    const res = buildRes();

    await controller.runAction(req, res, () => {});

    expect(updatePayload).to.deep.equal({ aiSummary: "Short summary" });
    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.summary).to.equal("Short summary");
    expect(res.payload.data.note.aiSummary).to.equal("Short summary");
  });

  it("does not persist a translation result", async () => {
    let updateCalled = false;
    const controller = createAiController({
      aiService: {
        run: async () => ({ translation: "Bonjour" }),
      },
      noteService: {
        getUserNote: async () => ({ id: "5" }),
        updateUserNote: async () => {
          updateCalled = true;
        },
      },
    });

    const req = {
      user: { id: 1 },
      params: { id: "5", action: "translate" },
      body: { targetLanguage: "French" },
    };
    const res = buildRes();

    await controller.runAction(req, res, () => {});

    expect(updateCalled).to.equal(false);
    expect(res.payload.data.translation).to.equal("Bonjour");
    expect(res.payload.data.note.id).to.equal("5");
  });

  it("answers a chat question using the user's notes", async () => {
    const controller = createAiController({
      aiService: {
        chat: async (notes, message) => {
          expect(notes).to.have.length(1);
          expect(message).to.equal("What did I write?");
          return { answer: "You wrote about tests." };
        },
      },
      noteService: {
        listUserNotes: async () => [{ id: "1", title: "Note", content: "x" }],
      },
    });

    const req = { user: { id: 1 }, body: { message: "What did I write?" } };
    const res = buildRes();

    await controller.chat(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.answer).to.equal("You wrote about tests.");
  });

  it("persists each action's result on the correct note field", async () => {
    const cases = [
      { action: "title", result: { title: "T" }, field: "aiTitle", value: "T" },
      { action: "grammar", result: { corrected: "fixed" }, field: "content", value: "fixed" },
      { action: "tags", result: { tags: ["a", "b"] }, field: "smartTags", value: ["a", "b"] },
      { action: "tasks", result: { tasks: ["do x"] }, field: "extractedTasks", value: ["do x"] },
    ];

    for (const { action, result, field, value } of cases) {
      let updatePayload;
      const controller = createAiController({
        aiService: { run: async () => result },
        noteService: {
          getUserNote: async () => ({ id: "5" }),
          updateUserNote: async (_userId, _noteId, payload) => {
            updatePayload = payload;
            return { id: "5", ...payload };
          },
        },
      });

      const req = { user: { id: 1 }, params: { id: "5", action }, body: {} };
      const res = buildRes();
      await controller.runAction(req, res, () => {});

      expect(updatePayload).to.deep.equal({ [field]: value });
      expect(res.statusCode).to.equal(200);
    }
  });

  it("runs a draft AI action without persisting a note", async () => {
    let receivedDraft;
    const controller = createAiController({
      aiService: {
        run: async (action, draft) => {
          receivedDraft = { action, draft };
          return { title: "Draft title" };
        },
      },
      noteService: {},
    });

    const req = {
      user: { id: 1 },
      params: { action: "title" },
      body: { title: "T", content: "Body text" },
    };
    const res = buildRes();

    await controller.runDraftAction(req, res, () => {});

    expect(receivedDraft.action).to.equal("title");
    expect(receivedDraft.draft).to.deep.equal({ title: "T", content: "Body text" });
    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.title).to.equal("Draft title");
  });

  it("defaults draft title and content to empty strings", async () => {
    let receivedDraft;
    const controller = createAiController({
      aiService: {
        run: async (_action, draft) => {
          receivedDraft = draft;
          return {};
        },
      },
      noteService: {},
    });

    const req = { user: { id: 1 }, params: { action: "summary" }, body: {} };
    await controller.runDraftAction(req, buildRes(), () => {});

    expect(receivedDraft).to.deep.equal({ title: "", content: "" });
  });

  it("wires createNote and updateNote closures through to the note service", async () => {
    let createArgs;
    let updateArgs;
    const controller = createAiController({
      aiService: {
        chat: async (_notes, _message, options) => {
          await options.createNote({ title: "N", content: "c" });
          await options.updateNote("9", { isArchived: true });
          return { answer: "done", action: "notes_changed" };
        },
      },
      noteService: {
        listUserNotes: async () => [],
        createNote: async (userId, payload) => {
          createArgs = { userId, payload };
        },
        updateUserNote: async (userId, noteId, payload) => {
          updateArgs = { userId, noteId, payload };
        },
      },
    });

    const req = {
      user: { id: 7 },
      body: { message: "do things", history: [] },
    };
    const res = buildRes();
    await controller.chat(req, res, () => {});

    expect(createArgs).to.deep.equal({
      userId: 7,
      payload: { title: "N", content: "c" },
    });
    expect(updateArgs).to.deep.equal({
      userId: 7,
      noteId: "9",
      payload: { isArchived: true },
    });
    expect(res.payload.data.action).to.equal("notes_changed");
  });

  it("forwards AI service errors to the error middleware", async () => {
    const expectedError = new Error("AI failed");
    const controller = createAiController({
      aiService: {
        run: async () => {
          throw expectedError;
        },
      },
      noteService: {
        getUserNote: async () => ({ id: "5" }),
      },
    });

    const req = {
      user: { id: 1 },
      params: { id: "5", action: "summary" },
      body: {},
    };

    let capturedError;
    await controller.runAction(req, buildRes(), (error) => {
      capturedError = error;
    });

    expect(capturedError).to.equal(expectedError);
  });
});
