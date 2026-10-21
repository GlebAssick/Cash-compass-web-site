const API_URL = import.meta.env.VITE_API_URL ?? "https://cash-compass-backend-production.up.railway.app/api/v1";
const TOKEN_KEY = "cashcompass_token";

export interface ApiUser {
  id: number;
  name: string | null;
  email: string;
  country: string;
  education_level: string | null;
  university: string | null;
  base_currency: string;
  is_verified: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  country: string;
  education_level?: string;
  university?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // response had no JSON body, fall back to statusText
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<ApiUser> {
  const { access_token } = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(access_token);
  return getMe();
}

export async function register(payload: RegisterPayload): Promise<ApiUser> {
  const { access_token } = await request<{ access_token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setToken(access_token);
  return getMe();
}

export function getMe(): Promise<ApiUser> {
  return request<ApiUser>("/auth/me", { method: "GET" }, true);
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) });
}

export function verifyEmail(email: string, code: string): Promise<{ message: string }> {
  return request("/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) });
}

export function resendVerification(email: string): Promise<{ message: string }> {
  return request("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function logout() {
  clearToken();
}

/** Generic authenticated fetch for the rest of the app (transactions, budgets, etc.) */
export function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, true);
}

export async function loginWithGoogle(idToken: string): Promise<ApiUser> {
  const { access_token } = await request<{ access_token: string }>("/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  setToken(access_token);
  return getMe();
}

export async function loginWithYandex(accessToken: string, country?: string): Promise<ApiUser> {
  const { access_token } = await request<{ access_token: string }>("/auth/oauth/yandex", {
    method: "POST",
    body: JSON.stringify({ access_token: accessToken, country }),
  });
  setToken(access_token);
  return getMe();
}