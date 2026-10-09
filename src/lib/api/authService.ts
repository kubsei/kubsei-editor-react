"use client";

import type { AuthResponse, User, LoginRequest, RegisterRequest } from "@/types/auth";

// kubsei-gateway: REST auth (kubsei-users) and /graphql (kubsei-editor) behind one origin
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TOKEN_KEY = "visual-editor-token";
const REFRESH_TOKEN_KEY = "visual-editor-refresh-token";

// Token storage
export const getAccessToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

export const getRefreshToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const removeTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/** For useSyncExternalStore: re-read the token when another tab logs in or out. */
export const subscribeTokens = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

// Errors come back as RFC 9457 problem details: { title, status, detail }
async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail || problem?.title || `HTTP error! status: ${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export function login(credentials: LoginRequest): Promise<AuthResponse> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return request("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
}

export function refreshToken(token: string): Promise<AuthResponse> {
  return request("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) });
}

export function logout(refreshTokenValue: string): Promise<void> {
  return request("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: refreshTokenValue }) });
}

export function getMe(token: string): Promise<User> {
  return request("/api/users/me", {}, token);
}

// One refresh at a time: parallel 401s share it, since the backend rotates (revokes) the refresh token
let refreshing: Promise<string | null> | null = null;

/** Exchanges the stored refresh token for a new pair. Returns the new access token, or null (tokens cleared). */
export function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    const stored = getRefreshToken();
    if (!stored) return null;
    try {
      const response = await refreshToken(stored);
      setTokens(response.accessToken, response.refreshToken);
      return response.accessToken;
    } catch {
      removeTokens();
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Google OAuth: kubsei-users redirects back to /workspace?accessToken=...&refreshToken=...
export function getGoogleOAuthUrl(): string {
  return `${API_URL}/oauth2/authorization/google`;
}
