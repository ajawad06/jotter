import { getProfile, login, logout, signup, updateProfile } from "./authApi";

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
