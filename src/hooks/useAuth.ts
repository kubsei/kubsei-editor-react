"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LoginRequest, RegisterRequest, User, AuthResponse } from "@/types/auth";
import * as authService from "@/lib/graphql/authService";

const TOKEN_KEY = "visual-editor-token";
const REFRESH_TOKEN_KEY = "visual-editor-refresh-token";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Token helpers
const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== "undefined") {
    console.log("[Auth] Setting tokens:", {
      accessToken: accessToken ? `present (${accessToken.length} chars)` : "null",
      refreshToken: refreshToken ? `present (${refreshToken.length} chars)` : "null"
    });
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Verify tokens were saved
    console.log("[Auth] Tokens saved. Verification:", {
      accessToken: localStorage.getItem(TOKEN_KEY) ? "saved" : "NOT SAVED",
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) ? "saved" : "NOT SAVED"
    });
  }
};

const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const removeTokens = () => {
  if (typeof window !== "undefined") {
    console.log("[Auth] Removing tokens");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const useAuth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
  const isProcessingOAuth = useRef(false);

  // Check authentication status on mount and handle OAuth callback
  useEffect(() => {
    const checkAuth = async () => {
      console.log("[Auth] checkAuth running. Current URL:", window.location.href);
      console.log("[Auth] Current localStorage token:", localStorage.getItem(TOKEN_KEY) ? "present" : "null");
      console.log("[Auth] isProcessingOAuth:", isProcessingOAuth.current);

      // Check if we have tokens from OAuth callback in URL
      const accessTokenFromUrl = searchParams.get("accessToken");
      const refreshTokenFromUrl = searchParams.get("refreshToken");

      console.log("[Auth] Tokens from URL:", {
        accessToken: accessTokenFromUrl ? "present" : "null",
        refreshToken: refreshTokenFromUrl ? "present" : "null"
      });

      if (accessTokenFromUrl && refreshTokenFromUrl) {
        // Prevent double processing
        if (isProcessingOAuth.current) {
          console.log("[Auth] Already processing OAuth, skipping...");
          return;
        }
        isProcessingOAuth.current = true;

        console.log("[Auth] Found tokens in URL, saving...");
        // Store tokens from OAuth callback
        setTokens(accessTokenFromUrl, refreshTokenFromUrl);

        // Clean up URL by removing tokens
        const url = new URL(window.location.href);
        url.searchParams.delete("accessToken");
        url.searchParams.delete("refreshToken");
        window.history.replaceState({}, "", url.pathname);

        // Get user info with the new token
        try {
          console.log("[Auth] Calling getMe with token...");
          const user = await authService.getMe(accessTokenFromUrl);
          console.log("[Auth] getMe succeeded, user:", user?.email);
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        } catch (error) {
          console.error("[Auth] getMe failed:", error);
          // Don't remove tokens here - they might still be valid
          // Just set auth state based on what we have
          setAuthState({
            user: null,
            isAuthenticated: true, // Token exists, might still work
            isLoading: false,
            error: null,
          });
          return;
        }
      }

      const token = getAccessToken();
      const refreshTokenValue = getRefreshToken();

      if (!token) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        // Try to get current user with access token
        const user = await authService.getMe(token);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch {
        // Token might be expired, try to refresh
        if (refreshTokenValue) {
          try {
            const response = await authService.refreshToken(refreshTokenValue);
            setTokens(response.accessToken, response.refreshToken);
            setAuthState({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch {
            // Refresh failed, clear tokens
            removeTokens();
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } else {
          removeTokens();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      }
    };

    checkAuth();
  }, [searchParams]);

  const handleAuthSuccess = useCallback(
    (response: AuthResponse) => {
      setTokens(response.accessToken, response.refreshToken);
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Redirect to workspace or the original destination
      const redirect = searchParams.get("redirect") || "/workspace";
      router.push(redirect);
    },
    [router, searchParams]
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await authService.login(credentials);
        handleAuthSuccess(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al iniciar sesión";
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [handleAuthSuccess]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await authService.register(data);
        handleAuthSuccess(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al registrarse";
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [handleAuthSuccess]
  );

  const loginWithGoogle = useCallback(() => {
    // Redirect to Google OAuth
    window.location.href = authService.getGoogleOAuthUrl();
  }, []);

  const logout = useCallback(async () => {
    const refreshTokenValue = getRefreshToken();

    try {
      if (refreshTokenValue) {
        await authService.logout(refreshTokenValue);
      }
    } catch {
      // Ignore logout errors
    }

    removeTokens();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    router.push("/workspace");
  }, [router]);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    register,
    loginWithGoogle,
    logout,
    clearError,
    getAccessToken,
  };
};
