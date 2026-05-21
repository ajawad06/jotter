import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const renderLogin = (props = {}) => {
  return render(
    <BrowserRouter>
      <LoginPage onLogin={() => {}} isSubmitting={false} {...props} />
    </BrowserRouter>,
  );
};

describe("LoginPage", () => {
  test("renders login form correctly", () => {
    renderLogin();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter your email/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter your password/i),
    ).toBeInTheDocument();
  });

  test("shows error message from login failure", async () => {
    const onLoginMock = jest
      .fn()
      .mockRejectedValue(new Error("Invalid credentials"));
    renderLogin({ onLogin: onLoginMock });

    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  test("disables button when submitting", () => {
    renderLogin({ isSubmitting: true });
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Signing in.../i);
  });
});
