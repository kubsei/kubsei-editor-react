"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, subscribeTokens } from "@/lib/api/authService";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

export const RedirectIfAuthenticated = ({ children }: RedirectIfAuthenticatedProps) => {
  const router = useRouter();
  // undefined on the server and during hydration: localStorage only exists in the browser
  const token = useSyncExternalStore(subscribeTokens, getAccessToken, () => undefined);

  useEffect(() => {
    if (token) {
      router.replace("/workspace");
    }
  }, [token, router]);

  // Unknown yet, or logged in and redirecting
  if (token !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
};
