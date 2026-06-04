export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RequestOptions extends RequestInit {
  noAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { noAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (!noAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("rfid_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { method: "GET", ...opts }),

  post: <T>(endpoint: string, body?: any, opts?: RequestOptions) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body), ...opts }),

  put: <T>(endpoint: string, body?: any, opts?: RequestOptions) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body), ...opts }),

  delete: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...opts }),

  upload: <T>(endpoint: string, formData: FormData, opts?: RequestOptions) => {
    const { noAuth, ...fetchOptions } = opts || {};
    const headers: Record<string, string> = {};
    if (!noAuth && typeof window !== "undefined") {
      const token = localStorage.getItem("rfid_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    // Don't set Content-Type — browser sets multipart boundary automatically
    return fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
      ...fetchOptions,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
};

// Auth helpers
export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("rfid_token", token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("rfid_token");
  }
  return null;
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("rfid_token");
    localStorage.removeItem("rfid_user");
  }
}

export function setStoredUser(user: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("rfid_user", JSON.stringify(user));
  }
}

export function getStoredUser(): any {
  if (typeof window !== "undefined") {
    const u = localStorage.getItem("rfid_user");
    return u ? JSON.parse(u) : null;
  }
  return null;
}


