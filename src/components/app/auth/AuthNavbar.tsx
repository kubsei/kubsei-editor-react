"use client";
import useIntl from "@/hooks/useIntl";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/language-swicher";

export const AuthNavbar = () => {
  const { t } = useIntl();
  const router = useRouter();
  const pathname = usePathname();

  // Determinar la página actual basándose en la URL
  const currentPage: "login" | "register" = pathname.includes("/register")
    ? "register"
    : "login";

  // Manejar el cambio de página
  const handleTogglePage = () => {
    if (currentPage === "login") {
      router.push("/auth/register");
    } else {
      router.push("/auth/login");
    }
  };

  const handleHome = () => {
    router.push("/");
  };

  return (
    <motion.nav
      className="sticky top-0 z-50 py-4 backdrop-blur-xl border-b border-gray-100 bg-white/80"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}>
      <div className="container px-6 mx-auto">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <motion.div
            className="flex items-center cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={handleHome}>
            <span className="text-xl font-semibold tracking-tight text-black">
              {t("common.brand.name")}
            </span>
          </motion.div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <span className="text-gray-500 text-sm hidden sm:inline">
              {currentPage === "login"
                ? t("auth.navbar.noAccount")
                : t("auth.navbar.hasAccount")}
            </span>
            <motion.button
              onClick={handleTogglePage}
              className="text-black font-medium text-sm cursor-pointer px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}>
              {currentPage === "login"
                ? t("auth.navbar.createAccount")
                : t("auth.navbar.signIn")}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
