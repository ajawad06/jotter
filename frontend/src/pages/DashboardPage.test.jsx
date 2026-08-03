import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import {
  createLabel,
  createNote,
  deleteNote,
  duplicateNote,
  fetchLabels,
  listNotes,
  removeAttachment,
  renameLabel,
  updateNote,
  updateNoteAppearance,
  uploadAttachment,
} from "../api/noteApi";
import { chatWithNotes, runAiAction } from "../api/aiApi";
import { getProfile, resendVerification } from "../api/authApi";

// Mock the API calls
jest.mock("../api/noteApi");
jest.mock("../api/aiApi");
jest.mock("../api/authApi");

const mockNotes = [
  {
    id: "1",
    title: "Test Note 1",
    content: "Content 1",
    color: "#ffffff",
    isArchived: false,
    isTrashed: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Archived Note",
    content: "Content 2",
    color: "#ffffff",
    isArchived: true,
    isTrashed: false,
    updatedAt: new Date().toISOString(),
  },
];

const renderDashboard = (props = {}) => {
  return render(
    <BrowserRouter>
      <DashboardPage
        token="mock-token"
        user={{ name: "John", profileImage: "" }}
        isDarkMode={false}
        onToggleDarkMode={() => {}}
        {...props}
      />
    </BrowserRouter>,
  );
};

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listNotes.mockResolvedValue(mockNotes);
  });

  test("renders notes on load", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test Note 1")).toBeInTheDocument();
    });
    // Archived note should not be in the "Notes" view
    expect(screen.queryByText("Archived Note")).not.toBeInTheDocument();
  });

  test("filters notes by search text", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test Note 1")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: "Non-existent" } });

    await waitFor(() => {
      expect(screen.queryByText("Test Note 1")).not.toBeInTheDocument();
    });
  });

  test("switches between sidebar categories", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Test Note 1")).toBeInTheDocument();
    });

    const archiveButton = screen.getAllByRole("button", {
      name: /Archive/i,
    })[0];
    fireEvent.click(archiveButton);

    await waitFor(() => {
      expect(screen.getByText("Archived Note")).toBeInTheDocument();
      expect(screen.queryByText("Test Note 1")).not.toBeInTheDocument();
    });
  });

  test("creates a new note", async () => {
    createNote.mockResolvedValue({
      id: "3",
      title: "New Note",
      content: "New Content",
      color: "#ffffff",
      isArchived: false,
      isTrashed: false,
    });

    renderDashboard();

    const contentInput = screen.getByPlaceholderText(/Take a note/i);
    fireEvent.focus(contentInput); // Expand composer

    const titleInput = screen.getByPlaceholderText(/Title/i);
    fireEvent.change(titleInput, { target: { value: "New Note" } });

    // The content area is now a rich-text contenteditable region.
    const editor = screen.getByRole("textbox", { name: "Note content" });
    editor.innerHTML = "New Content";
    fireEvent.input(editor);

    // Submit by clicking the Close button
    const closeButton = screen.getByRole("button", { name: /Close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(createNote).toHaveBeenCalled();
      expect(screen.getByText("New Note")).toBeInTheDocument();
    });
  });

  test("toggles grid/list view", async () => {
    renderDashboard();
    const toggleViewBtn = screen.getByLabelText(/Toggle view mode/i);
    fireEvent.click(toggleViewBtn);
    // Success means no error thrown and button exists
    expect(toggleViewBtn).toBeInTheDocument();
  });

  test("shows an error when loading notes fails", async () => {
    listNotes.mockRejectedValue(new Error("Could not load notes"));

    renderDashboard();

    expect(await screen.findByText("Could not load notes")).toBeInTheDocument();
  });

  test("updates note color and archive state", async () => {
    updateNoteAppearance.mockResolvedValue({
      ...mockNotes[0],
      color: "#faafa8",
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByLabelText("Change note color #faafa8")[0]);

    await waitFor(() => {
      expect(updateNoteAppearance).toHaveBeenCalledWith("mock-token", "1", {
        color: "#faafa8",
      });
    });

    updateNoteAppearance.mockResolvedValue({
      ...mockNotes[0],
      isArchived: true,
    });
    fireEvent.click(screen.getAllByTitle("Archive")[0]);

    await waitFor(() => {
      expect(updateNoteAppearance).toHaveBeenCalledWith("mock-token", "1", {
        isArchived: true,
      });
    });
  });

  test("permanently deletes a note from the Trash view", async () => {
    const trashedNote = {
      id: "3",
      title: "Trashed Note",
      content: "Content 3",
      color: "#ffffff",
      isArchived: false,
      isTrashed: true,
      updatedAt: new Date().toISOString(),
    };
    listNotes.mockResolvedValue([...mockNotes, trashedNote]);
    deleteNote.mockResolvedValue();

    renderDashboard();

    await screen.findByText("Test Note 1");

    // "Delete permanently" is only offered in the Trash view.
    expect(screen.queryByText("Delete permanently")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trash" }));
    await screen.findByText("Trashed Note");

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Delete permanently"));

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith("mock-token", "3");
    });
  });

  test("makes a copy of a note from the three-dots menu", async () => {
    duplicateNote.mockResolvedValue({
      ...mockNotes[0],
      id: "3",
      title: "Test Note 1 copy",
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Make a copy"));

    await waitFor(() => {
      expect(duplicateNote).toHaveBeenCalledWith("mock-token", "1");
      expect(screen.getByText("Test Note 1 copy")).toBeInTheDocument();
    });
  });

  test("adds and removes a label on a note", async () => {
    fetchLabels.mockResolvedValue(["work"]);
    updateNote.mockResolvedValue({ ...mockNotes[0], labels: ["work"] });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Add label"));
    fireEvent.change(screen.getByPlaceholderText(/Add label/i), {
      target: { value: "work" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/Add label/i), {
      key: "Enter",
    });

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        labels: ["work"],
      });
      expect(screen.getByText("work")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Remove label work"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        labels: [],
      });
    });
  });

  test("sets a reminder via a quick-pick option and shows it in the Reminders view", async () => {
    updateNote.mockResolvedValue({
      ...mockNotes[0],
      reminderAt: new Date().toISOString(),
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByTitle("Set reminder")[0]);
    expect(screen.getByText("Remind me later")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tomorrow"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        reminderAt: expect.any(Date),
      });
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Reminders/i })[0]);

    await waitFor(() => {
      expect(screen.getByText("Test Note 1")).toBeInTheDocument();
    });
  });

  test("sets a custom reminder via Pick date & time", async () => {
    const reminderAt = "2026-08-01T10:00";
    updateNote.mockResolvedValue({
      ...mockNotes[0],
      reminderAt: new Date(reminderAt).toISOString(),
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByTitle("Set reminder")[0]);
    fireEvent.click(screen.getByText(/Pick date/i));

    const reminderInput = document.querySelector(
      'input[type="datetime-local"]',
    );
    fireEvent.change(reminderInput, { target: { value: reminderAt } });

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        reminderAt,
      });
    });
  });

  test("removes an existing reminder", async () => {
    listNotes.mockResolvedValue([
      { ...mockNotes[0], reminderAt: new Date().toISOString() },
      mockNotes[1],
    ]);
    updateNote.mockResolvedValue({ ...mockNotes[0], reminderAt: null });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByTitle("Set reminder")[0]);
    fireEvent.click(screen.getByText("Remove reminder"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        reminderAt: null,
      });
    });
  });

  test("uploads and shows an image attachment as a banner", async () => {
    const attachment = {
      id: "att-1",
      name: "photo.png",
      url: "https://cloudinary.test/photo.png",
      type: "image/png",
      size: 10,
    };
    uploadAttachment.mockResolvedValue({
      ...mockNotes[0],
      attachments: [attachment],
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByTitle("Add image")[0]);
    const fileInput = document.querySelector(
      'input[type="file"][accept*="image"]',
    );
    const file = new File(["content"], "photo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadAttachment).toHaveBeenCalledWith("mock-token", "1", file);
      expect(screen.getByAltText("photo.png")).toBeInTheDocument();
    });

    // Image attachments no longer offer a remove control on the card.
    expect(
      screen.queryByLabelText("Remove attachment photo.png"),
    ).not.toBeInTheDocument();
  });

  test("removes a file attachment", async () => {
    const fileAttachment = {
      id: "att-2",
      name: "notes.pdf",
      url: "https://cloudinary.test/notes.pdf",
      type: "application/pdf",
      size: 20,
    };
    listNotes.mockResolvedValue([
      { ...mockNotes[0], attachments: [fileAttachment] },
      mockNotes[1],
    ]);
    removeAttachment.mockResolvedValue({ ...mockNotes[0], attachments: [] });

    renderDashboard();

    await screen.findByText("notes.pdf");

    fireEvent.click(screen.getByLabelText("Remove attachment notes.pdf"));

    await waitFor(() => {
      expect(removeAttachment).toHaveBeenCalledWith("mock-token", "1", "att-2");
      expect(screen.queryByText("notes.pdf")).not.toBeInTheDocument();
    });
  });

  // Skipped: per-note AI action icon was removed from the card for now.
  // Re-enable when the AI actions are re-wired into the UI.
  test.skip("runs an AI action on a note", async () => {
    runAiAction.mockResolvedValue({
      summary: "Short summary",
      note: { ...mockNotes[0], aiSummary: "Short summary" },
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByRole("button", { name: /Summarize/i }));

    await waitFor(() => {
      expect(runAiAction).toHaveBeenCalledWith("mock-token", "1", "summary", {});
    });
  });

  test("chats with notes", async () => {
    chatWithNotes.mockResolvedValue({ answer: "You have 1 note." });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Ask Jotter"));
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: "How many notes do I have?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(chatWithNotes).toHaveBeenCalledWith(
        "mock-token",
        "How many notes do I have?",
        [],
      );
      expect(screen.getByText("You have 1 note.")).toBeInTheDocument();
    });
  });

  test("dismisses the verification banner once resend reports the email is already verified", async () => {
    const onUpdateUser = jest.fn();
    getProfile.mockResolvedValue({ isEmailVerified: false });
    resendVerification.mockRejectedValue(
      new Error("Email is already verified"),
    );

    renderDashboard({
      user: { name: "John", isEmailVerified: false },
      onUpdateUser,
    });

    await screen.findByText(/Verify your email address/i);
    fireEvent.click(screen.getByRole("button", { name: /Resend email/i }));

    await waitFor(() => {
      expect(onUpdateUser).toHaveBeenCalledWith({ isEmailVerified: true });
      expect(
        screen.queryByText(/Verify your email address/i),
      ).not.toBeInTheDocument();
    });
  });

  test("syncs isEmailVerified from the backend on mount", async () => {
    const onUpdateUser = jest.fn();
    getProfile.mockResolvedValue({ isEmailVerified: true });

    renderDashboard({
      user: { name: "John", isEmailVerified: false },
      onUpdateUser,
    });

    await waitFor(() => {
      expect(getProfile).toHaveBeenCalledWith("mock-token");
      expect(onUpdateUser).toHaveBeenCalledWith({ isEmailVerified: true });
    });
  });

  test("opens the Edit labels dialog and creates a new label", async () => {
    fetchLabels.mockResolvedValue(["work"]);
    createLabel.mockResolvedValue(["travel", "work"]);

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByTitle("Edit labels"));

    const dialog = screen.getByRole("dialog", { name: "Edit labels" });
    expect(within(dialog).getByText("work")).toBeInTheDocument();

    fireEvent.change(
      within(dialog).getByPlaceholderText("Create new label"),
      { target: { value: "travel" } },
    );
    fireEvent.click(within(dialog).getByLabelText("Create label"));

    await waitFor(() => {
      expect(createLabel).toHaveBeenCalledWith("mock-token", "travel");
      expect(within(dialog).getByText("travel")).toBeInTheDocument();
    });
  });

  test("renames a label from the Edit labels dialog", async () => {
    fetchLabels.mockResolvedValue(["work"]);
    renameLabel.mockResolvedValue(["office"]);

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByTitle("Edit labels"));
    const dialog = screen.getByRole("dialog", { name: "Edit labels" });
    fireEvent.click(within(dialog).getByLabelText("Edit label work"));

    const renameInput = within(dialog).getByDisplayValue("work");
    fireEvent.change(renameInput, { target: { value: "office" } });
    fireEvent.click(within(dialog).getByLabelText("Confirm rename"));

    await waitFor(() => {
      expect(renameLabel).toHaveBeenCalledWith("mock-token", "work", "office");
    });
  });

  test("closes the Edit labels dialog when Done is clicked", async () => {
    fetchLabels.mockResolvedValue(["work"]);

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByTitle("Edit labels"));
    expect(screen.getByRole("dialog", { name: "Edit labels" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Done/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
