const API_BASE_URL = "http://localhost:5000/api/auth";

const parseApiResponse = async (response) => {
  const contentType = response?.headers?.get?.("content-type") || "";
  const canParseJson = typeof response?.json === "function";
  const isJsonResponse =
    !contentType || contentType.includes("application/json");

  const data =
    canParseJson && isJsonResponse
      ? await response.json()
      : {
          message: "Server returned an unexpected response format",
        };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data.data;
};

const signup = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

const login = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse(response);
};

export { login, signup };
