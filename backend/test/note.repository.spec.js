const { expect } = require("chai");
const { createNoteRepository } = require("../src/repositories/note.repository");

describe("Note repository", () => {
  const mockNoteData = {
    _id: "607f1f77bcf86cd799439011",
    user_id: "507f1f77bcf86cd799439011",
    title: "Test Note",
    content: "<p>Hello</p>",
    color: "#ffffff",
    is_pinned: false,
    is_archived: false,
    is_trashed: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  it("maps note correctly after creation", async () => {
    const fakeModel = {
      create: async () => mockNoteData,
    };

    const repository = createNoteRepository(fakeModel);
    const note = await repository.createNote({
      userId: "507f1f77bcf86cd799439011",
      title: "Test Note",
      content: "<p>Hello</p>",
    });

    expect(note.id).to.equal("607f1f77bcf86cd799439011");
    expect(note.userId).to.equal("507f1f77bcf86cd799439011");
    expect(note.isPinned).to.be.false;
  });

  it("finds all notes for a user and sorts them", async () => {
    const fakeModel = {
      find: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => [mockNoteData],
            }),
          }),
        }),
      }),
    };

    const repository = createNoteRepository(fakeModel);
    const notes = await repository.findAllByUserId("507f1f77bcf86cd799439011");

    expect(notes).to.have.length(1);
    expect(notes[0].title).to.equal("Test Note");
  });

  it("returns null when note is not found by ID", async () => {
    const fakeModel = {
      findOne: () => ({
        lean: async () => null,
      }),
    };

    const repository = createNoteRepository(fakeModel);
    const note = await repository.findByIdAndUserId("invalid", "user");

    expect(note).to.be.null;
  });

  it("updates note and returns true on success", async () => {
    const fakeModel = {
      updateOne: async () => ({ modifiedCount: 1, matchedCount: 1 }),
    };

    const repository = createNoteRepository(fakeModel);
    const success = await repository.updateByIdAndUserId("note-id", "user-id", {
      title: "New Title",
    });

    expect(success).to.be.true;
  });

  it("returns false when updating with empty payload", async () => {
    const repository = createNoteRepository({});
    const success = await repository.updateByIdAndUserId(
      "note-id",
      "user-id",
      {},
    );

    expect(success).to.be.false;
  });

  it("deletes note and returns true on success", async () => {
    const fakeModel = {
      deleteOne: async () => ({ deletedCount: 1 }),
    };

    const repository = createNoteRepository(fakeModel);
    const success = await repository.deleteByIdAndUserId("note-id", "user-id");

    expect(success).to.be.true;
  });

  it("returns sorted distinct labels for a user", async () => {
    const fakeModel = {
      distinct: async () => ["work", "Personal"],
    };

    const repository = createNoteRepository(fakeModel);
    const labels = await repository.findLabelsByUserId("user-id");

    expect(labels).to.deep.equal(["Personal", "work"]);
  });

  it("renames a label across every note that has it, deduping the result", async () => {
    const updatedNoteIds = [];
    const fakeModel = {
      find: () => ({
        select: () => ({
          lean: async () => [
            { _id: "note-1", labels: ["work", "urgent"] },
            { _id: "note-2", labels: ["work"] },
          ],
        }),
      }),
      updateOne: async ({ _id }, update) => {
        updatedNoteIds.push({ id: _id, labels: update.labels });
      },
    };

    const repository = createNoteRepository(fakeModel);
    await repository.renameLabelForUser("user-id", "work", "urgent");

    expect(updatedNoteIds).to.deep.equal([
      { id: "note-1", labels: ["urgent"] },
      { id: "note-2", labels: ["urgent"] },
    ]);
  });
});
