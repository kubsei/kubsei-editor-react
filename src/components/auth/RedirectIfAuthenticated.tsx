"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

const TOKEN_KEY = "visual-editor-token";

// Helper to get token from localStorage
const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const RedirectIfAuthenticated = ({ children }: RedirectIfAuthenticatedProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();

    if (token) {
      router.replace("/workspace");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
};
