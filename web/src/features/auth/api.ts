import { withBasePath } from "../../config/runtime";
import type {
  ConsoleUser,
  CreateUserInput,
  LoginRequest,
  LoginResult,
  UpdatePasswordInput,
} from "./types";

const TOKEN_KEY = "gowa_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

type ApiEnvelope<T> = {
  message?: string;
  results?: T;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return (payload.results ?? payload) as T;
}

export async function login(input: LoginRequest): Promise<LoginResult> {
  const response = await fetch(withBasePath("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const result = await readJson<LoginResult>(response);
  if (result.token) {
    setAuthToken(result.token);
  }
  return result;
}

export async function fetchMe(): Promise<ConsoleUser> {
  const response = await fetch(withBasePath("/auth/me"), {
    headers: authHeaders(),
  });
  return readJson<ConsoleUser>(response);
}

export async function listUsers(): Promise<ConsoleUser[]> {
  const response = await fetch(withBasePath("/auth/users"), {
    headers: authHeaders(),
  });
  const results = await readJson<ConsoleUser[]>(response);
  return Array.isArray(results) ? results : [];
}

export async function createUser(input: CreateUserInput): Promise<ConsoleUser> {
  const response = await fetch(withBasePath("/auth/users"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return readJson<ConsoleUser>(response);
}

export async function updateUserPassword(userId: number, input: UpdatePasswordInput): Promise<void> {
  const response = await fetch(withBasePath(`/auth/users/${userId}/password`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  await readJson(response);
}

export async function deleteUser(userId: number): Promise<void> {
  const response = await fetch(withBasePath(`/auth/users/${userId}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  await readJson(response);
}

// Helper for other api modules to attach Authorization header when logged in via the custom JWT login.
export function withAuthHeader(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers || {});
  if (headers.has("Authorization")) {
    return { ...init, headers };
  }

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return {
    ...init,
    headers,
  };
}
