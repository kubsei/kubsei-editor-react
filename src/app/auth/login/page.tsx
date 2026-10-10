"use client";
import { Suspense } from "react";
import { LoginForm } from "@/components/app/auth/LoginForm";

export default function LoginPage() {
  // LoginForm reads ?error (useSearchParams), which needs a Suspense boundary to prerender
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
