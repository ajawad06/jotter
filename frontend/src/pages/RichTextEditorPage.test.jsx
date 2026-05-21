import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import RichTextEditorPage from "./RichTextEditorPage";
import { createNote, updateNote } from "../api/noteApi";

// Mock API and Router hooks
jest.mock("../api/noteApi");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
  useNavigate: () => mockNavigate,
}));

// Mock ReactQuill since it's hard to test in JSDOM
jest.mock("react-quill", () => {
  /* eslint-disable react/prop-types */
  const MockQuill = ({ value, onChange }) => {
    return (
      <textarea
        data-testid="quill-mock"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
  return MockQuill;
});

const renderEditor = (props = {}) => {
  return render(
    <BrowserRouter>
      <RichTextEditorPage token="mock-token" isDarkMode={false} {...props} />
    </BrowserRouter>,
  );
};

describe("RichTextEditorPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue({ state: null });
  });

  test("renders empty editor by default", () => {
    renderEditor();
    expect(screen.getByPlaceholderText(/Note Title/i)).toHaveValue("");
    expect(screen.getByTestId("quill-mock")).toHaveValue("");
  });

  test("fills editor with state from navigation", () => {
    useLocation.mockReturnValue({
      state: {
        noteId: "123",
        title: "Existing Title",
        content: "<p>Existing Content</p>",
        color: "#ffffff",
      },
    });

    renderEditor();
    expect(screen.getByPlaceholderText(/Note Title/i)).toHaveValue(
      "Existing Title",
    );
    expect(screen.getByTestId("quill-mock")).toHaveValue(
      "<p>Existing Content</p>",
    );
  });

  test("saves a new note", async () => {
    createNote.mockResolvedValue({ _id: "new-id" });
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText(/Note Title/i), {
      target: { value: "New Note Title" },
    });
    fireEvent.change(screen.getByTestId("quill-mock"), {
      target: { value: "<p>New Content</p>" },
    });

    const saveButton = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith("mock-token", {
        title: "New Note Title",
        content: "<p>New Content</p>",
        color: "#ffffff",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("updates an existing note", async () => {
    useLocation.mockReturnValue({
      state: { noteId: "123", title: "Old", content: "Old", color: "#ffffff" },
    });
    updateNote.mockResolvedValue({});

    renderEditor();

    fireEvent.change(screen.getByPlaceholderText(/Note Title/i), {
      target: { value: "Updated Title" },
    });
    const saveButton = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith(
        "mock-token",
        "123",
        expect.objectContaining({
          title: "Updated Title",
        }),
      );
    });
  });

  test("shows error when saving empty note", async () => {
    renderEditor();
    const saveButton = screen.getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveButton);

    expect(
      screen.getByText(/Please provide a title or some content/i),
    ).toBeInTheDocument();
  });

  test("cancels editing and returns to dashboard", () => {
    renderEditor();
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
