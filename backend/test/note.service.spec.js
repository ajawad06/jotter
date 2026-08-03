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

  it("rejects invalid color format on update", async () => {
    const noteService = createNoteService({
      noteRepository: {
        updateByIdAndUserId: async () => true,
        findByIdAndUserId: async () => ({ id: 1 }),
      },
    });

    try {
      await noteService.updateUserNote(1, 1, { color: "blue" });
      throw new Error("Expected updateUserNote to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("updates metadata fields for existing note", async () => {
    const fakeRepository = {
      updateByIdAndUserId: async (_noteId, _userId, fields) => {
        expect(fields).to.deep.equal({
          color: "#fff475",
          isPinned: true,
          isArchived: false,
          isTrashed: false,
          trashedAt: null,
        });
        return true;
      },
      findByIdAndUserId: async () => ({
        id: 9,
        title: "Meta",
        content: "Updated",
        color: "#fff475",
        isPinned: true,
        isArchived: false,
        isTrashed: false,
      }),
    };

    const noteService = createNoteService({ noteRepository: fakeRepository });
    const result = await noteService.updateUserNote(1, 9, {
      color: "#fff475",
      isPinned: true,
      isArchived: false,
      isTrashed: false,
    });

    expect(result.id).to.equal(9);
    expect(result.isPinned).to.equal(true);
  });

  it("duplicates an existing note as a copy", async () => {
    const originalNote = {
      id: 1,
      title: "Original",
      content: "Body",
      color: "#ffffff",
      isPinned: true,
      isArchived: true,
      isTrashed: false,
      reminderAt: new Date(),
    };

    const fakeRepository = {
      findByIdAndUserId: async () => originalNote,
      createNote: async (payload) => ({ id: 2, ...payload }),
    };

    const noteService = createNoteService({ noteRepository: fakeRepository });
    const copy = await noteService.duplicateUserNote(1, 1);

    expect(copy.title).to.equal("Original copy");
    expect(copy.isPinned).to.equal(false);
    expect(copy.isArchived).to.equal(false);
    expect(copy.isTrashed).to.equal(false);
  });

  it("reorders notes by updating each note's order", async () => {
    const updatedOrders = [];
    const fakeRepository = {
      updateByIdAndUserId: async (noteId, _userId, fields) => {
        updatedOrders.push([noteId, fields.order]);
        return true;
      },
      findByIdAndUserId: async (noteId) => ({ id: noteId }),
      findAllByUserId: async () => [{ id: "b" }, { id: "a" }],
    };

    const noteService = createNoteService({ noteRepository: fakeRepository });
    const result = await noteService.reorderUserNotes(1, ["b", "a"]);

    expect(updatedOrders).to.deep.equal([
      ["b", 0],
      ["a", 1],
    ]);
    expect(result).to.have.length(2);
  });

  it("rejects reorder with a non-array payload", async () => {
    const noteService = createNoteService({ noteRepository: {} });

    try {
      await noteService.reorderUserNotes(1, "not-an-array");
      throw new Error("Expected reorderUserNotes to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("lists distinct labels for a user", async () => {
    const noteService = createNoteService({
      noteRepository: {
        findLabelsByUserId: async () => ["personal", "work"],
      },
    });

    const labels = await noteService.listUserLabels(1);
    expect(labels).to.deep.equal(["personal", "work"]);
  });

  it("merges note-derived labels with user-created labels", async () => {
    const noteService = createNoteService({
      noteRepository: {
        findLabelsByUserId: async () => ["work"],
      },
      userRepository: {
        getLabels: async () => ["empty-label", "work"],
      },
    });

    const labels = await noteService.listUserLabels(1);
    expect(labels).to.deep.equal(["empty-label", "work"]);
  });

  it("creates a new label for a user", async () => {
    let addedLabel;
    const noteService = createNoteService({
      noteRepository: {
        findLabelsByUserId: async () => [],
      },
      userRepository: {
        addLabel: async (userId, label) => {
          addedLabel = label;
        },
        getLabels: async () => ["travel"],
      },
    });

    const labels = await noteService.createLabel(1, "  travel  ");

    expect(addedLabel).to.equal("travel");
    expect(labels).to.deep.equal(["travel"]);
  });

  it("rejects creating a label with an empty name", async () => {
    const noteService = createNoteService({
      noteRepository: {},
      userRepository: {},
    });

    try {
      await noteService.createLabel(1, "   ");
      throw new Error("Expected createLabel to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });

  it("renames a label everywhere it is used", async () => {
    let renameArgsForNotes;
    let renameArgsForUser;
    const noteService = createNoteService({
      noteRepository: {
        renameLabelForUser: async (userId, oldName, newName) => {
          renameArgsForNotes = [userId, oldName, newName];
        },
        findLabelsByUserId: async () => ["personal"],
      },
      userRepository: {
        renameLabel: async (userId, oldName, newName) => {
          renameArgsForUser = [userId, oldName, newName];
        },
        getLabels: async () => [],
      },
    });

    const labels = await noteService.renameLabel(1, "work", "personal");

    expect(renameArgsForNotes).to.deep.equal([1, "work", "personal"]);
    expect(renameArgsForUser).to.deep.equal([1, "work", "personal"]);
    expect(labels).to.deep.equal(["personal"]);
  });

  it("skips the rename when the name is unchanged", async () => {
    let renameCalled = false;
    const noteService = createNoteService({
      noteRepository: {
        renameLabelForUser: async () => {
          renameCalled = true;
        },
        findLabelsByUserId: async () => ["work"],
      },
      userRepository: {
        renameLabel: async () => {
          renameCalled = true;
        },
        getLabels: async () => [],
      },
    });

    await noteService.renameLabel(1, "work", "work");
    expect(renameCalled).to.equal(false);
  });

  it("rejects renaming a label with a missing new name", async () => {
    const noteService = createNoteService({
      noteRepository: {},
      userRepository: {},
    });

    try {
      await noteService.renameLabel(1, "work", "");
      throw new Error("Expected renameLabel to fail");
    } catch (error) {
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(400);
    }
  });
});
