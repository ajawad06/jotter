import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import VerifyEmailPage from "./VerifyEmailPage";
import { verifyEmail } from "../api/authApi";

jest.mock("../api/authApi");

const renderPage = (path = "/verify-email?token=raw-token") => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a success message when verification succeeds", async () => {
    verifyEmail.mockResolvedValue({ message: "Email verified successfully" });

    renderPage();

    expect(verifyEmail).toHaveBeenCalledWith("raw-token");

    await waitFor(() => {
      expect(screen.getByText(/verified/i)).toBeInTheDocument();
    });
  });

  test("shows an error message when verification fails", async () => {
    verifyEmail.mockRejectedValue(new Error("Verification link is invalid"));

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Verification link is invalid/i),
      ).toBeInTheDocument();
    });
  });

  test("shows an error when the token is missing", async () => {
    renderPage("/verify-email");

    await waitFor(() => {
      expect(screen.getByText(/missing a token/i)).toBeInTheDocument();
    });
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
