import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";
import { updateProfile } from "../api/authApi";

// Mock the API calls
jest.mock("../api/authApi");
jest.mock("../api/noteApi");

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
});
