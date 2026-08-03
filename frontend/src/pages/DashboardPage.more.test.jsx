import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import {
  createNote,
  listNotes,
  removeAttachment,
  reorderNotes,
  updateNote,
  updateNoteAppearance,
  uploadAttachment,
} from "../api/noteApi";
import { chatWithNotes, runDraftAiAction } from "../api/aiApi";
import { getProfile, resendVerification } from "../api/authApi";

jest.mock("../api/noteApi");
jest.mock("../api/aiApi");
jest.mock("../api/authApi");

const baseNote = {
  id: "1",
  title: "Test Note 1",
  content: "Content 1",
  color: "#ffffff",
  isArchived: false,
  isTrashed: false,
  isPinned: false,
  updatedAt: new Date().toISOString(),
};

const renderDashboard = (props = {}) =>
  render(
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

const expandComposer = () => {
  fireEvent.focus(screen.getByPlaceholderText("Take a note..."));
};

const typeComposerContent = (html) => {
  const editor = screen.getByRole("textbox", { name: "Note content" });
  editor.innerHTML = html;
  fireEvent.input(editor);
  return editor;
};

describe("DashboardPage — composer, editing, chat, and misc", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listNotes.mockResolvedValue([baseNote]);
    document.execCommand = jest.fn();
    window.URL.createObjectURL = jest.fn(() => "blob:mock");
    window.URL.revokeObjectURL = jest.fn();
  });

  test("expands the composer and drives the formatting toolbar", async () => {
    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    typeComposerContent("hello world");

    // Toggle the format bar and exercise every formatting command.
    fireEvent.click(screen.getByLabelText("Formatting options"));
    ["H1", "H2", "Aa", "B", "I", "U"].forEach((label) => {
      fireEvent.click(screen.getByRole("button", { name: label }));
    });
    fireEvent.click(screen.getByTitle("Clear formatting"));
    fireEvent.click(screen.getByLabelText("Undo"));
    fireEvent.click(screen.getByLabelText("Redo"));

    expect(document.execCommand).toHaveBeenCalledWith("bold", false, null);
    expect(document.execCommand).toHaveBeenCalledWith(
      "formatBlock",
      false,
      "<h1>",
    );
  });

  test("selects a background color from the composer palette", async () => {
    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(screen.getByLabelText("Select color #faafa8"));

    // Popover closes after picking a color.
    expect(screen.queryByLabelText("Select color #faafa8")).not.toBeInTheDocument();
  });

  test("adds and removes a reminder chip in the composer", async () => {
    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    fireEvent.click(screen.getByLabelText("Add reminder"));
    fireEvent.click(screen.getByText("Tomorrow"));

    const removeChip = await screen.findByLabelText("Remove reminder");
    fireEvent.click(removeChip);

    await waitFor(() => {
      expect(screen.queryByLabelText("Remove reminder")).not.toBeInTheDocument();
    });
  });

  test("toggles the composer pin button", async () => {
    const { container } = renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    const composerPin = container.querySelector(".composer-pin");
    expect(composerPin).not.toHaveClass("active");
    fireEvent.click(composerPin);
    expect(composerPin).toHaveClass("active");
  });

  test("runs composer AI actions: generate title, fix grammar, smart tags", async () => {
    runDraftAiAction
      .mockResolvedValueOnce({ title: "AI Generated Title" })
      .mockResolvedValueOnce({ corrected: "Corrected text." })
      .mockResolvedValueOnce({ tags: ["work", "todo"] });

    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    typeComposerContent("some draft content");

    fireEvent.click(screen.getByLabelText("AI actions"));
    fireEvent.click(screen.getByText("Generate title"));

    await waitFor(() => {
      expect(runDraftAiAction).toHaveBeenCalledWith("mock-token", "title", {
        title: "",
        content: "some draft content",
      });
      expect(screen.getByPlaceholderText("Title")).toHaveValue(
        "AI Generated Title",
      );
    });

    fireEvent.click(screen.getByLabelText("AI actions"));
    fireEvent.click(screen.getByText("Fix grammar"));
    await waitFor(() => {
      expect(runDraftAiAction).toHaveBeenCalledWith(
        "mock-token",
        "grammar",
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByLabelText("AI actions"));
    fireEvent.click(screen.getByText("Smart tags"));
    await waitFor(() => {
      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("todo")).toBeInTheDocument();
    });
  });

  test("shows an error when composer AI is used with no content", async () => {
    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    fireEvent.click(screen.getByLabelText("AI actions"));
    fireEvent.click(screen.getByText("Generate title"));

    expect(
      await screen.findByText("Write something before using AI."),
    ).toBeInTheDocument();
    expect(runDraftAiAction).not.toHaveBeenCalled();
  });

  test("surfaces composer AI errors", async () => {
    runDraftAiAction.mockRejectedValue(new Error("AI is down"));
    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    typeComposerContent("draft");
    fireEvent.click(screen.getByLabelText("AI actions"));
    fireEvent.click(screen.getByText("Generate title"));

    expect(await screen.findByText("AI is down")).toBeInTheDocument();
  });

  test("creates an archived note from the composer archive button", async () => {
    createNote.mockResolvedValue({
      ...baseNote,
      id: "9",
      title: "Archived Draft",
      isArchived: true,
    });

    renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "Archived Draft" },
    });
    typeComposerContent("archive me");
    fireEvent.click(screen.getByLabelText("Archive"));

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith(
        "mock-token",
        expect.objectContaining({ isArchived: true, title: "Archived Draft" }),
      );
    });
  });

  test("uploads an image while creating a new note from the composer", async () => {
    createNote.mockResolvedValue({ ...baseNote, id: "9", title: "With image" });
    uploadAttachment.mockResolvedValue({
      ...baseNote,
      id: "9",
      title: "With image",
      attachments: [
        {
          id: "a1",
          name: "pic.png",
          url: "https://cdn/pic.png",
          type: "image/png",
        },
      ],
    });

    const { container } = renderDashboard();
    await screen.findByText("Test Note 1");

    expandComposer();
    typeComposerContent("has an image");
    fireEvent.click(screen.getByLabelText("Add image"));

    const composerFileInput = container.querySelector(
      'input[type="file"][accept="image/*"]',
    );
    const file = new File(["x"], "pic.png", { type: "image/png" });
    fireEvent.change(composerFileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(createNote).toHaveBeenCalled();
      expect(uploadAttachment).toHaveBeenCalledWith("mock-token", "9", file);
    });
  });

  test("opens a note in the edit composer and saves changes on close", async () => {
    updateNote.mockResolvedValue({
      ...baseNote,
      title: "Edited Title",
      content: "Content 1",
    });

    renderDashboard();
    await screen.findByText("Test Note 1");

    // Clicking the card title opens the editor.
    fireEvent.click(screen.getByText("Test Note 1"));

    const titleInput = await screen.findByDisplayValue("Test Note 1");
    fireEvent.change(titleInput, { target: { value: "Edited Title" } });

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith(
        "mock-token",
        "1",
        expect.objectContaining({ title: "Edited Title", contentFormat: "html" }),
      );
    });
  });

  test("removes an image attachment from inside the edit composer", async () => {
    listNotes.mockResolvedValue([
      {
        ...baseNote,
        attachments: [
          {
            id: "img-1",
            name: "photo.png",
            url: "https://cdn/photo.png",
            type: "image/png",
          },
        ],
      },
    ]);
    removeAttachment.mockResolvedValue({ ...baseNote, attachments: [] });

    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByText("Test Note 1"));

    // The composer (edit mode) renders its own delete control for images.
    const deleteButtons = await screen.findAllByLabelText(
      "Remove attachment photo.png",
    );
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(removeAttachment).toHaveBeenCalledWith("mock-token", "1", "img-1");
    });
  });

  test("exports a note as a .txt file from the three-dots menu", async () => {
    const appendSpy = jest.spyOn(document.body, "appendChild");
    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText(/Export note/i));

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });

  test("renders assistant markdown (lists, bold, code) and refreshes on note changes", async () => {
    chatWithNotes.mockResolvedValue({
      answer: "Here you go:\n- **first** item\n- second `code`\n\n1. step one",
      action: "notes_changed",
    });

    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Ask Jotter"));
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: "summarize" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(screen.getByText("first")).toBeInTheDocument();
    });
    // "notes_changed" action triggers a reload (initial load + refresh).
    expect(listNotes).toHaveBeenCalledTimes(2);
    // Bold rendered as <strong>.
    expect(screen.getByText("first").tagName).toBe("STRONG");
  });

  test("shows an error bubble when the chat request fails", async () => {
    chatWithNotes.mockRejectedValue(new Error("chat exploded"));

    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Ask Jotter"));
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    expect(await screen.findByText(/Error: chat exploded/i)).toBeInTheDocument();
  });

  test("opens the profile menu and navigates / logs out", async () => {
    const onLogout = jest.fn();
    renderDashboard({ onLogout });
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Account menu"));
    fireEvent.click(screen.getByText("View profile"));

    // Re-open and log out.
    fireEvent.click(screen.getByLabelText("Account menu"));
    fireEvent.click(screen.getByText("Logout"));

    expect(onLogout).toHaveBeenCalled();
  });

  test("closes the profile menu on outside click", async () => {
    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Account menu"));
    expect(screen.getByText("View profile")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText("View profile")).not.toBeInTheDocument();
    });
  });

  test("toggles the sidebar collapsed state", async () => {
    const { container } = renderDashboard();
    await screen.findByText("Test Note 1");

    const sidebar = container.querySelector(".jotter-sidebar");
    expect(sidebar).not.toHaveClass("collapsed");
    fireEvent.click(screen.getByLabelText("Toggle sidebar"));
    expect(sidebar).toHaveClass("collapsed");
  });

  test("pins a note and groups it under Pinned", async () => {
    updateNoteAppearance.mockResolvedValue({ ...baseNote, isPinned: true });

    renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByRole("button", { name: "Pin note" }));

    await waitFor(() => {
      expect(updateNoteAppearance).toHaveBeenCalledWith("mock-token", "1", {
        isPinned: true,
      });
    });
    expect(await screen.findByText("Pinned")).toBeInTheDocument();
  });

  test("restores a note from the Trash view", async () => {
    listNotes.mockResolvedValue([
      { ...baseNote, id: "3", title: "Trashed", isTrashed: true },
    ]);
    updateNoteAppearance.mockResolvedValue({
      id: "3",
      title: "Trashed",
      isTrashed: false,
    });

    renderDashboard();
    await waitFor(() => expect(listNotes).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Trash" }));
    await screen.findByText("Trashed");

    fireEvent.click(screen.getByLabelText("More options"));
    fireEvent.click(screen.getByText("Restore"));

    await waitFor(() => {
      expect(updateNoteAppearance).toHaveBeenCalledWith("mock-token", "3", {
        isTrashed: false,
      });
    });
  });

  test("reorders notes via drag and drop", async () => {
    const second = { ...baseNote, id: "2", title: "Second Note" };
    listNotes.mockResolvedValue([baseNote, second]);
    reorderNotes.mockResolvedValue([second, baseNote]);

    const { container } = renderDashboard();
    await screen.findByText("Second Note");

    const cards = container.querySelectorAll(".jotter-note-card");
    fireEvent.dragStart(cards[0]);
    fireEvent.dragOver(cards[1]);
    fireEvent.drop(cards[1]);

    await waitFor(() => {
      expect(reorderNotes).toHaveBeenCalledWith("mock-token", ["2", "1"]);
    });
  });

  test("opens the reminder editor from a note's reminder badge", async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    listNotes.mockResolvedValue([{ ...baseNote, reminderAt: future }]);
    updateNote.mockResolvedValue({ ...baseNote, reminderAt: null });

    renderDashboard();
    await screen.findByText("Test Note 1");

    // The badge shows the reminder time; clicking it opens the editor.
    const badge = document.querySelector(".reminder-badge");
    fireEvent.click(badge);

    fireEvent.click(screen.getByText("Remove reminder"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        reminderAt: null,
      });
    });
  });

  test("switches to list view", async () => {
    const { container } = renderDashboard();
    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getByLabelText("Toggle view mode"));
    expect(container.querySelector(".jotter-list")).toBeInTheDocument();
  });

  test("resends the verification email and shows a confirmation", async () => {
    getProfile.mockResolvedValue({ isEmailVerified: false });
    resendVerification.mockResolvedValue({});

    renderDashboard({
      user: { name: "John", isEmailVerified: false },
      onUpdateUser: jest.fn(),
    });

    await screen.findByText(/Verify your email address/i);
    fireEvent.click(screen.getByRole("button", { name: /Resend email/i }));

    expect(
      await screen.findByText(/Verification email sent/i),
    ).toBeInTheDocument();
  });

  test("dismisses the verification banner", async () => {
    getProfile.mockResolvedValue({ isEmailVerified: false });

    renderDashboard({
      user: { name: "John", isEmailVerified: false },
      onUpdateUser: jest.fn(),
    });

    await screen.findByText(/Verify your email address/i);
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(
      screen.queryByText(/Verify your email address/i),
    ).not.toBeInTheDocument();
  });
});
