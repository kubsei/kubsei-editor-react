export type { LoginRequest } from "./LoginRequest";
export type { RegisterRequest } from "./RegisterRequest";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";
export type AuthProvider = "LOCAL" | "GOOGLE";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  roles: Role[];
  provider: AuthProvider;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
