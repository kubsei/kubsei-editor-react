"use client";
import { AnimatedBackground } from "@/components/app/auth/AnimatedBackground";
import { AuthNavbar } from "@/components/app/auth/AuthNavbar";
import { RedirectIfAuthenticated } from "@/components/auth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import useIntl from "@/hooks/useIntl";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useIntl();
  const pathname = usePathname();
  const type = pathname.includes("/register") ? "register" : "login";

  return (
    <RedirectIfAuthenticated>
      <div className="min-h-screen flex">
        {/* Left side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white">
          <AuthNavbar />
          <div className="flex-1 flex items-center justify-center p-8">
            {children}
          </div>
          <footer className="flex justify-center gap-6 pb-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-black hover:underline">
              {t("legal.links.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-black hover:underline">
              {t("legal.links.terms")}
            </Link>
          </footer>
        </div>

        {/* Right side - Animated Background */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <AnimatedBackground type={type} />
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
