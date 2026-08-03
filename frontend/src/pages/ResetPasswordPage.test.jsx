import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPasswordPage from "./ResetPasswordPage";
import { resetPassword } from "../api/authApi";

jest.mock("../api/authApi");

const renderPage = (path = "/reset-password?token=raw-token") => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("resets the password when the passwords match", async () => {
    resetPassword.mockResolvedValue({ message: "Password reset" });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter a new password/i), {
      target: { value: "newPassword1" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Confirm your new password/i),
      { target: { value: "newPassword1" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Reset password/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith("raw-token", "newPassword1");
      expect(
        screen.getByText(/password has been reset successfully/i),
      ).toBeInTheDocument();
    });
  });

  test("shows an error when the passwords do not match", async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter a new password/i), {
      target: { value: "newPassword1" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Confirm your new password/i),
      { target: { value: "different" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  test("shows an error when the token is missing", () => {
    renderPage("/reset-password");

    expect(screen.getByText(/missing a token/i)).toBeInTheDocument();
  });
});
