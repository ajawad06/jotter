import {
  forgotPassword,
  getProfile,
  login,
  logout,
  resendVerification,
  resetPassword,
  signup,
  updateProfile,
  verifyEmail,
} from "./authApi";

const jsonResponse = ({ ok = true, status = 200, data, message } = {}) => ({
  ok,
  status,
  headers: {
    get: () => "application/json",
  },
  json: jest.fn().mockResolvedValue({ data, message }),
});

describe("authApi", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("sends signup payload and returns response data", async () => {
    const payload = {
      name: "Abdullah",
      email: "abdullah@example.com",
      password: "secret",
    };
    const data = { user: { id: 1 }, token: "token" };
    fetch.mockResolvedValue(jsonResponse({ data }));

    await expect(signup(payload)).resolves.toEqual(data);

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  test("sends login payload", async () => {
    const payload = { email: "abdullah@example.com", password: "secret" };
    fetch.mockResolvedValue(jsonResponse({ data: { token: "token" } }));

    await login(payload);

    expect(fetch).toHaveBeenCalledWith("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  test("sends authenticated profile requests", async () => {
    fetch.mockResolvedValue(jsonResponse({ data: { name: "Abdullah" } }));

    await getProfile("token");
    await updateProfile("token", { name: "New Name" });
    await logout("token");

    expect(fetch).toHaveBeenNthCalledWith(1, "http://localhost:5000/api/auth/me", {
      headers: { Authorization: "Bearer token" },
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://localhost:5000/api/auth/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "http://localhost:5000/api/auth/logout",
      {
        method: "POST",
        headers: { Authorization: "Bearer token" },
      },
    );
  });

  test("throws API error messages", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ ok: false, status: 400, message: "Invalid data" }),
    );

    await expect(login({})).rejects.toThrow("Invalid data");
  });

  test("dispatches unauthorized event for 401 responses", async () => {
    const listener = jest.fn();
    window.addEventListener("unauthorized", listener);
    fetch.mockResolvedValue(
      jsonResponse({ ok: false, status: 401, message: "Unauthorized" }),
    );

    await expect(getProfile("bad-token")).rejects.toThrow("Unauthorized");

    expect(listener).toHaveBeenCalled();
    window.removeEventListener("unauthorized", listener);
  });

  test("verifies email with a token", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ message: "Email verified successfully" }),
    );

    await expect(verifyEmail("raw-token")).resolves.toEqual({
      message: "Email verified successfully",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/verify-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "raw-token" }),
      },
    );
  });

  test("requests a resend of the verification email", async () => {
    fetch.mockResolvedValue(
      jsonResponse({ message: "Verification email sent" }),
    );

    await resendVerification("token");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/resend-verification",
      {
        method: "POST",
        headers: { Authorization: "Bearer token" },
      },
    );
  });

  test("submits a forgot password request", async () => {
    fetch.mockResolvedValue(jsonResponse({ message: "Reset link sent" }));

    await forgotPassword("abdullah@example.com");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "abdullah@example.com" }),
      },
    );
  });

  test("submits a reset password request", async () => {
    fetch.mockResolvedValue(jsonResponse({ message: "Password reset" }));

    await resetPassword("raw-token", "newPassword1");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "raw-token", password: "newPassword1" }),
      },
    );
  });

  test("handles unexpected non-json responses", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: () => "text/html",
      },
      json: jest.fn(),
    });

    await expect(getProfile("token")).rejects.toThrow(
      "Server returned an unexpected response format",
    );
  });
});
