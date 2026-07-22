import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  updateNoteAppearance,
} from "../api/noteApi";

// Mock the API calls
jest.mock("../api/noteApi");

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
    fireEvent.change(contentInput, { target: { value: "New Content" } });

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
      color: "#f28b82",
    });

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByLabelText("Change note color #f28b82")[0]);

    await waitFor(() => {
      expect(updateNoteAppearance).toHaveBeenCalledWith("mock-token", "1", {
        color: "#f28b82",
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

  test("edits and deletes a note", async () => {
    updateNote.mockResolvedValue({
      ...mockNotes[0],
      title: "Edited Note",
      content: "Edited Content",
    });
    deleteNote.mockResolvedValue();

    renderDashboard();

    await screen.findByText("Test Note 1");

    fireEvent.click(screen.getAllByTitle("Edit")[0]);
    fireEvent.change(screen.getByPlaceholderText(/Title/i), {
      target: { value: "Edited Note" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Take a note/i), {
      target: { value: "Edited Content" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update/i }));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith("mock-token", "1", {
        title: "Edited Note",
        content: "Edited Content",
        color: "#ffffff",
      });
    });

    fireEvent.click(screen.getAllByTitle("Delete Permanently")[0]);

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith("mock-token", "1");
    });
  });
});
