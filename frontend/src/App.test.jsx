import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows login screen for unauthenticated users", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("logs user in and redirects to dashboard", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({
        data: {
          token: "test-token",
          user: {
            name: "Abdullah",
            email: "abdullah@example.com",
          },
        },
      }),
    });
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({
        data: [],
      }),
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "abdullah@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Notes" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("notes_app_token")).toBe("test-token");
  });

  it("logs out and redirects to login", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => "application/json",
      },
      json: async () => ({
        data: [],
      }),
    });

    localStorage.setItem("notes_app_token", "already-authenticated");
    localStorage.setItem(
      "notes_app_user",
      JSON.stringify({ name: "Abdullah", email: "abdullah@example.com" }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(
      await screen.findByRole("heading", { name: "Login" }),
    ).toBeInTheDocument();
  });
});
