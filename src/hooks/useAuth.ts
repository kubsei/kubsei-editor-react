"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LoginRequest, RegisterRequest, User, AuthResponse } from "@/types/auth";
import * as authService from "@/lib/api/authService";
import { getAccessToken, getRefreshToken, setTokens, removeTokens } from "@/lib/api/authService";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

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
        // Token might be expired: refresh (clears tokens if it fails) and retry
        const newToken = await authService.refreshSession();
        const user = newToken ? await authService.getMe(newToken).catch(() => null) : null;
        if (!user) {
          removeTokens();
        }
        setAuthState({
          user,
          isAuthenticated: !!user,
          isLoading: false,
          error: null,
        });
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
