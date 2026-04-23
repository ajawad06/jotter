const { expect } = require("chai");

const { createNoteService } = require("../src/services/note.service");
const AppError = require("../src/utils/appError");

describe("Note service", () => {
  it("creates a note for an authenticated user", async () => {
    const fakeRepository = {
      createNote: async ({ userId, title, content }) => ({
        id: 10,
        userId,
        title,
        content,
      }),
    };

    const noteService = createNoteService({ noteRepository: fakeRepository });
    const result = await noteService.createNote(3, {
      title: "Checklist",
      content: "Prepare internship demo",
    });

    expect(result).to.deep.equal({
      id: 10,
      userId: 3,
      title: "Checklist",
      content: "Prepare internship demo",
    });
  });

  it("rejects create note with missing fields", async () => {
    const noteService = createNoteService({
      noteRepository: {
        createNote: async () => {
          throw new Error("should not run");
        },
      },
    });

    try {
      await noteService.createNote(1, { title: "", content: "" });
      throw new Error("Expected createNote to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("returns note not found for non-owned note", async () => {
    const noteService = createNoteService({
      noteRepository: {
        findByIdAndUserId: async () => null,
      },
    });

    try {
      await noteService.getUserNote(1, 999);
      throw new Error("Expected getUserNote to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(404);
    }
  });

  it("updates existing note for owner only", async () => {
    const fakeRepository = {
      updateByIdAndUserId: async () => true,
      findByIdAndUserId: async () => ({
        id: 5,
        userId: 2,
        title: "Updated",
        content: "Updated content",
      }),
    };

    const noteService = createNoteService({ noteRepository: fakeRepository });
    const note = await noteService.updateUserNote(2, 5, {
      title: "Updated",
      content: "Updated content",
    });

    expect(note.id).to.equal(5);
    expect(note.title).to.equal("Updated");
  });

  it("deletes only owned note", async () => {
    const noteService = createNoteService({
      noteRepository: {
        deleteByIdAndUserId: async () => true,
      },
    });

    const result = await noteService.deleteUserNote(2, 5);
    expect(result).to.deep.equal({ deleted: true });
  });
});
