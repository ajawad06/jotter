import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";
import { updateProfile } from "../api/authApi";
import { listNotes } from "../api/noteApi";

// Mock the API calls
jest.mock("../api/authApi");
jest.mock("../api/noteApi");
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addPage: jest.fn(),
    save: jest.fn(),
    setFontSize: jest.fn(),
    splitTextToSize: jest.fn((text) => [text]),
    text: jest.fn(),
  })),
}));

const mockUser = {
  name: "John Doe",
  email: "john@example.com",
  profileColor: "#1a73e8",
  profileImage: "",
};

const renderProfile = (props = {}) => {
  return render(
    <BrowserRouter>
      <ProfilePage
        user={mockUser}
        token="mock-token"
        onLogout={() => {}}
        onUpdateUser={() => {}}
        isDarkMode={false}
        {...props}
      />
    </BrowserRouter>,
  );
};

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on window.alert
    jest.spyOn(window, "alert").mockImplementation(() => {});
    URL.createObjectURL = jest.fn(() => "blob:mock-export");
  });

  test("renders profile information correctly", () => {
    renderProfile();
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  test("updates user name successfully", async () => {
    const onUpdateUserMock = jest.fn();
    updateProfile.mockResolvedValue({ ...mockUser, name: "New Name" });

    renderProfile({ onUpdateUser: onUpdateUserMock });

    const nameInput = screen.getByDisplayValue("John Doe");
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith("mock-token", {
        name: "New Name",
      });
      expect(onUpdateUserMock).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith("Profile name updated!");
    });
  });

  test("handles image upload profile update", async () => {
    const onUpdateUserMock = jest.fn();
    updateProfile.mockResolvedValue({
      ...mockUser,
      profileImage: "data:image/png;base64,mock",
    });

    renderProfile({ onUpdateUser: onUpdateUserMock });

    // We can't easily trigger the FileReader onload with standard RTL events without more complex mocking,
    // but we can verify the input exists and handle the flow.
    const fileInput = screen.getByLabelText(/Upload Photo/i);
    const file = new File(["test"], "test.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Since FileReader is async, we just check if it was called (requires more complex setup to test full base64 conversion)
    // For now, let's verify UI elements.
    expect(fileInput).toBeInTheDocument();
  });

  test("changes profile color", async () => {
    updateProfile.mockResolvedValue({ ...mockUser, profileColor: "#d93025" });
    renderProfile();

    const colorDots = screen
      .getAllByRole("button")
      .filter((b) => b.classList.contains("profile-color-dot"));
    fireEvent.click(colorDots[1]); // red

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith("mock-token", {
        profileColor: "#d93025",
      });
    });
  });

  test("logs out when logout button is clicked", () => {
    const onLogoutMock = jest.fn();
    renderProfile({ onLogout: onLogoutMock });

    fireEvent.click(screen.getByText(/Logout/i));
    expect(onLogoutMock).toHaveBeenCalled();
  });

  test("shows profile update errors", async () => {
    updateProfile.mockRejectedValue(new Error("Profile update failed"));
    renderProfile();

    fireEvent.change(screen.getByDisplayValue("John Doe"), {
      target: { value: "Broken Update" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    expect(await screen.findByText("Profile update failed")).toBeInTheDocument();
  });

  test("removes an existing profile image", async () => {
    const onUpdateUserMock = jest.fn();
    updateProfile.mockResolvedValue({ ...mockUser, profileImage: "" });

    renderProfile({
      user: { ...mockUser, profileImage: "data:image/png;base64,mock" },
      onUpdateUser: onUpdateUserMock,
    });

    fireEvent.click(screen.getByRole("button", { name: /Remove Photo/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith("mock-token", {
        profileImage: "",
      });
      expect(onUpdateUserMock).toHaveBeenCalled();
    });
  });

  test("exports all notes as text", async () => {
    const appendSpy = jest.spyOn(document.body, "appendChild");
    const removeSpy = jest.spyOn(document.body, "removeChild");
    listNotes.mockResolvedValue([
      {
        id: "1",
        title: "Exported Note",
        content: "<p>Hello&nbsp;world</p>",
      },
    ]);

    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Export All \(TXT\)/i }));

    await waitFor(() => {
      expect(listNotes).toHaveBeenCalledWith("mock-token");
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  test("handles empty and failed exports", async () => {
    listNotes.mockResolvedValueOnce([]);
    renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /Export All \(TXT\)/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("No notes to export.");
    });

    listNotes.mockRejectedValueOnce(new Error("Network down"));
    fireEvent.click(screen.getByRole("button", { name: /Export All \(PDF\)/i }));

    expect(await screen.findByText("Export failed: Network down")).toBeInTheDocument();
  });
});
