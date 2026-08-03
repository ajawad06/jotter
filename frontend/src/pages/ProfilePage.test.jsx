import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";
import {
  changePassword,
  deleteAccount,
  resendVerification,
  updateProfile,
} from "../api/authApi";
import { listNotes } from "../api/noteApi";

jest.mock("../api/authApi");
jest.mock("../api/noteApi");

const mockUser = {
  name: "John Doe",
  email: "john@example.com",
  profileColor: "#1a73e8",
  profileImage: "",
  isEmailVerified: true,
};

const renderProfile = (props = {}) => {
  return render(
    <BrowserRouter>
      <ProfilePage
        user={mockUser}
        token="mock-token"
        onUpdateUser={() => {}}
        onLogout={() => {}}
        isDarkMode={false}
        {...props}
      />
    </BrowserRouter>,
  );
};

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "alert").mockImplementation(() => {});
    listNotes.mockResolvedValue([]);
  });

  test("renders profile information correctly", () => {
    renderProfile();
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  test("shows account stats derived from notes", async () => {
    listNotes.mockResolvedValue([
      { id: "1", isPinned: true, isArchived: false, isTrashed: false, labels: ["work"] },
      { id: "2", isPinned: false, isArchived: true, isTrashed: false, labels: ["work", "home"] },
      { id: "3", isPinned: false, isArchived: false, isTrashed: true, labels: [] },
    ]);

    renderProfile();

    // Total (non-trashed) = 2, Pinned = 1, Archived = 1, Labels = 2 unique
    await waitFor(() => {
      const stats = document.querySelectorAll(".stat-value");
      expect(Array.from(stats).map((s) => s.textContent)).toEqual([
        "2",
        "1",
        "1",
        "2",
      ]);
    });
  });

  test("updates user name successfully", async () => {
    const onUpdateUserMock = jest.fn();
    updateProfile.mockResolvedValue({ ...mockUser, name: "New Name" });

    renderProfile({ onUpdateUser: onUpdateUserMock });

    const nameInput = screen.getByDisplayValue("John Doe");
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith("mock-token", {
        name: "New Name",
      });
      expect(onUpdateUserMock).toHaveBeenCalled();
    });
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

  test("shows an unverified badge and resends verification", async () => {
    resendVerification.mockResolvedValue({});
    renderProfile({ user: { ...mockUser, isEmailVerified: false } });

    expect(screen.getByText("Email not verified")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Resend verification email/i }),
    );

    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledWith("mock-token");
      expect(
        screen.getByText(/Verification email sent/i),
      ).toBeInTheDocument();
    });
  });

  test("changes the password", async () => {
    changePassword.mockResolvedValue({});
    renderProfile();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "newpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith(
        "mock-token",
        "oldpass123",
        "newpass123",
      );
      expect(
        screen.getByText("Password changed successfully."),
      ).toBeInTheDocument();
    });
  });

  test("rejects a password change when confirmation does not match", async () => {
    renderProfile();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));

    expect(
      await screen.findByText("New passwords do not match."),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  test("deletes the account after typed confirmation", async () => {
    const onLogoutMock = jest.fn();
    deleteAccount.mockResolvedValue({});
    renderProfile({ onLogout: onLogoutMock });

    fireEvent.click(screen.getByRole("button", { name: /^Delete account$/i }));

    const confirmInput = screen.getByPlaceholderText("DELETE");
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Permanently delete/i }),
    );

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledWith("mock-token");
      expect(onLogoutMock).toHaveBeenCalled();
    });
  });

  test("shows profile update errors", async () => {
    updateProfile.mockRejectedValue(new Error("Profile update failed"));
    renderProfile();

    fireEvent.change(screen.getByDisplayValue("John Doe"), {
      target: { value: "Broken Update" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    expect(await screen.findByText("Profile update failed")).toBeInTheDocument();
  });

  test("removes an existing profile image", async () => {
    const onUpdateUserMock = jest.fn();
    updateProfile.mockResolvedValue({ ...mockUser, profileImage: "" });

    renderProfile({
      user: { ...mockUser, profileImage: "data:image/png;base64,mock" },
      onUpdateUser: onUpdateUserMock,
    });

    fireEvent.click(screen.getByRole("button", { name: /Remove photo/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith("mock-token", {
        profileImage: "",
      });
      expect(onUpdateUserMock).toHaveBeenCalled();
    });
  });
});
