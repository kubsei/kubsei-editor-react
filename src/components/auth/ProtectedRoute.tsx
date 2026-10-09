"use client";
import { useEffect, useSyncExternalStore, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken, subscribeTokens } from "@/lib/api/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

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
  // undefined on the server and during hydration: localStorage only exists in the browser
  const token = useSyncExternalStore(subscribeTokens, getAccessToken, () => undefined);
  // Tokens coming from the OAuth callback in the URL are stored by useAuth: don't redirect meanwhile
  const fromOAuth = !!searchParams.get("accessToken");

  useEffect(() => {
    if (token === null && !fromOAuth) {
      router.replace("/auth/login");
    }
  }, [token, fromOAuth, router]);

  // Show loading while checking auth (or while redirecting)
  if (!token && !fromOAuth) {
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
