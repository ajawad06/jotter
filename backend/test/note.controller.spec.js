const { expect } = require("chai");

const { createNoteController } = require("../src/controllers/note.controller");

describe("Note controller", () => {
  it("returns 201 for note creation", async () => {
    const controller = createNoteController({
      createNote: async () => ({
        id: 7,
        title: "Quick idea",
        content: "Ship Day 4",
      }),
    });

    const req = {
      user: { id: 1 },
      body: { title: "Quick idea", content: "Ship Day 4" },
    };

    let statusCode;
    let payload;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        payload = data;
        return this;
      },
    };

    await controller.createNote(req, res, () => {});

    expect(statusCode).to.equal(201);
    expect(payload.success).to.equal(true);
    expect(payload.data.id).to.equal(7);
  });

  it("returns notes list for authenticated user", async () => {
    const controller = createNoteController({
      listUserNotes: async () => [{ id: 1, title: "A", content: "B" }],
    });

    const req = { user: { id: 2 } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    await controller.listUserNotes(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data).to.have.length(1);
  });

  it("returns 200 for single note retrieval", async () => {
    const controller = createNoteController({
      getUserNote: async () => ({ id: 5, title: "Title" }),
    });

    const req = { user: { id: 1 }, params: { id: "5" } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    await controller.getUserNote(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.id).to.equal(5);
  });

  it("returns 200 for note update", async () => {
    const controller = createNoteController({
      updateUserNote: async () => ({ id: 10, title: "Updated" }),
    });

    const req = {
      user: { id: 1 },
      params: { id: "10" },
      body: { title: "Updated" },
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    await controller.updateUserNote(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.message).to.equal("Note updated successfully");
    expect(res.payload.data.title).to.equal("Updated");
  });

  it("returns 200 for note deletion", async () => {
    const controller = createNoteController({
      deleteUserNote: async () => {},
    });

    const req = { user: { id: 1 }, params: { id: "10" } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    await controller.deleteUserNote(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.message).to.equal("Note deleted successfully");
  });

  it("forwards service errors to error middleware", async () => {
    const expectedError = new Error("service failed");
    const controller = createNoteController({
      getUserNote: async () => {
        throw expectedError;
      },
    });

    const req = {
      user: { id: 1 },
      params: { id: "10" },
    };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };

    let capturedError;
    await controller.getUserNote(req, res, (error) => {
      capturedError = error;
    });

    expect(capturedError).to.equal(expectedError);
  });
});
