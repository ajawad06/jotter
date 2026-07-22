import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SignupPage from "./SignupPage";

const renderSignup = (props = {}) => {
  return render(
    <BrowserRouter>
      <SignupPage onSignup={() => {}} isSubmitting={false} {...props} />
    </BrowserRouter>,
  );
};

describe("SignupPage", () => {
  test("renders signup form correctly", () => {
    renderSignup();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Enter your email/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Create a password/i),
    ).toBeInTheDocument();
  });

  test("shows error message from signup failure", async () => {
    const onSignupMock = jest
      .fn()
      .mockRejectedValue(new Error("Registration failed"));
    renderSignup({ onSignup: onSignupMock });

    fireEvent.change(screen.getByPlaceholderText(/Enter your name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Create a password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Registration failed/i)).toBeInTheDocument();
    });
  });

  test("disables button when submitting", () => {
    renderSignup({ isSubmitting: true });
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Creating account.../i);
  });
});
