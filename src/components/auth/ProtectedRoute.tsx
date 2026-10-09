"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

const TOKEN_KEY = "visual-editor-token";

// Helper to get token from localStorage
const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

// Default loading component
const DefaultLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  </div>
);

// Inner component that uses useSearchParams (needs to be inside Suspense)
const ProtectedRouteInner = ({ children, loadingComponent }: ProtectedRouteProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have tokens coming from OAuth callback in URL
    const accessTokenFromUrl = searchParams.get("accessToken");

    // If we have token in URL, let useAuth handle it - don't redirect
    if (accessTokenFromUrl) {
      setIsAuthenticated(true);
      return;
    }

    // Check localStorage for existing token
    const token = getAccessToken();

    if (!token) {
      router.replace("/auth/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router, searchParams]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  return <>{children}</>;
};

// Main component with Suspense boundary
export const ProtectedRoute = ({ children, loadingComponent }: ProtectedRouteProps) => {
  return (
    <Suspense fallback={loadingComponent || <DefaultLoading />}>
      <ProtectedRouteInner loadingComponent={loadingComponent}>
        {children}
      </ProtectedRouteInner>
    </Suspense>
  );
};
