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

  it("passes query filters through to listUserNotes", async () => {
    let receivedFilters;
    const controller = createNoteController({
      listUserNotes: async (userId, filters) => {
        receivedFilters = filters;
        return [];
      },
    });

    const req = {
      user: { id: 2 },
      query: { status: "archive", label: "work", search: "demo", sort: "title" },
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

    await controller.listUserNotes(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(receivedFilters).to.deep.equal({
      status: "archive",
      label: "work",
      search: "demo",
      sort: "title",
      limit: undefined,
      skip: undefined,
    });
  });

  it("returns labels for authenticated user", async () => {
    const controller = createNoteController({
      listUserLabels: async () => ["personal", "work"],
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

    await controller.listUserLabels(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data).to.deep.equal(["personal", "work"]);
  });

  it("returns 201 for label creation", async () => {
    const controller = createNoteController({
      createLabel: async (userId, name) => {
        expect(userId).to.equal(2);
        expect(name).to.equal("travel");
        return ["travel"];
      },
    });

    const req = { user: { id: 2 }, body: { name: "travel" } };
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

    await controller.createLabel(req, res, () => {});

    expect(res.statusCode).to.equal(201);
    expect(res.payload.data).to.deep.equal(["travel"]);
  });

  it("returns 200 for label rename", async () => {
    const controller = createNoteController({
      renameLabel: async (userId, oldName, newName) => {
        expect(userId).to.equal(2);
        expect(oldName).to.equal("work");
        expect(newName).to.equal("office");
        return ["office"];
      },
    });

    const req = {
      user: { id: 2 },
      params: { label: "work" },
      body: { newName: "office" },
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

    await controller.renameLabel(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data).to.deep.equal(["office"]);
  });

  it("returns 201 for note duplication", async () => {
    const controller = createNoteController({
      duplicateUserNote: async () => ({ id: 11, title: "Note copy" }),
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

    await controller.duplicateUserNote(req, res, () => {});

    expect(res.statusCode).to.equal(201);
    expect(res.payload.data.id).to.equal(11);
  });

  it("returns reordered notes", async () => {
    const controller = createNoteController({
      reorderUserNotes: async (userId, orderedIds) => {
        expect(orderedIds).to.deep.equal(["b", "a"]);
        return [{ id: "b" }, { id: "a" }];
      },
    });

    const req = { user: { id: 1 }, body: { orderedIds: ["b", "a"] } };
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

    await controller.reorderUserNotes(req, res, () => {});

    expect(res.statusCode).to.equal(200);
    expect(res.payload.data).to.have.length(2);
  });

  it("uploads a file and appends it as an attachment", async () => {
    const controller = createNoteController(
      {
        getUserNote: async () => ({ id: "5", attachments: [] }),
        updateUserNote: async (_userId, _noteId, payload) => ({
          id: "5",
          attachments: payload.attachments,
        }),
      },
      {
        uploadBuffer: async () => ({
          url: "https://cloudinary.test/image.png",
          publicId: "jotter/1/image",
          resourceType: "image",
        }),
      },
    );

    const req = {
      user: { id: 1 },
      params: { id: "5" },
      file: {
        buffer: Buffer.from("fake"),
        originalname: "image.png",
        mimetype: "image/png",
        size: 4,
      },
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

    await controller.addAttachment(req, res, () => {});

    expect(res.statusCode).to.equal(201);
    expect(res.payload.data.attachments).to.have.length(1);
    expect(res.payload.data.attachments[0].url).to.equal(
      "https://cloudinary.test/image.png",
    );
  });

  it("rejects attachment upload without a file", async () => {
    const controller = createNoteController({}, {});
    const req = { user: { id: 1 }, params: { id: "5" }, file: undefined };

    let capturedError;
    await controller.addAttachment(req, {}, (error) => {
      capturedError = error;
    });

    expect(capturedError.statusCode).to.equal(400);
  });

  it("removes an attachment and deletes it from storage", async () => {
    let deletedArgs;
    const controller = createNoteController(
      {
        getUserNote: async () => ({
          id: "5",
          attachments: [
            {
              id: "att-1",
              publicId: "jotter/1/image",
              resourceType: "image",
            },
          ],
        }),
        updateUserNote: async (_userId, _noteId, payload) => ({
          id: "5",
          attachments: payload.attachments,
        }),
      },
      {
        deleteByPublicId: async (publicId, resourceType) => {
          deletedArgs = [publicId, resourceType];
        },
      },
    );

    const req = {
      user: { id: 1 },
      params: { id: "5", attachmentId: "att-1" },
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

    await controller.removeAttachment(req, res, () => {});

    expect(deletedArgs).to.deep.equal(["jotter/1/image", "image"]);
    expect(res.statusCode).to.equal(200);
    expect(res.payload.data.attachments).to.have.length(0);
  });

  it("rejects removing a non-existent attachment", async () => {
    const controller = createNoteController(
      {
        getUserNote: async () => ({ id: "5", attachments: [] }),
      },
      {},
    );

    const req = {
      user: { id: 1 },
      params: { id: "5", attachmentId: "missing" },
    };

    let capturedError;
    await controller.removeAttachment(req, {}, (error) => {
      capturedError = error;
    });

    expect(capturedError.statusCode).to.equal(404);
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
