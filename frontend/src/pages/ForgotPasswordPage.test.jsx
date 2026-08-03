import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ForgotPasswordPage from "./ForgotPasswordPage";
import { forgotPassword } from "../api/authApi";

jest.mock("../api/authApi");

const renderPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>,
  );
};

describe("ForgotPasswordPage", () => {
  test("submits the email and shows a confirmation message", async () => {
    forgotPassword.mockResolvedValue({ message: "Reset link sent" });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: "abdullah@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send reset link/i }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith("abdullah@example.com");
      expect(screen.getByText(/reset link has been sent/i)).toBeInTheDocument();
    });
  });

  test("shows an error message on failure", async () => {
    forgotPassword.mockRejectedValue(new Error("Request failed"));

    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: "abdullah@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText("Request failed")).toBeInTheDocument();
    });
  });
});
