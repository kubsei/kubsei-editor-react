"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/ui/language-swicher";
import useIntl from "@/hooks/useIntl";

export const Navbar = () => {
  const router = useRouter();
  const { t } = useIntl();
  const handleLogin = () => {
    router.push("/auth/login");
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="text-2xl font-semibold text-gray-900 cursor-pointer tracking-tight"
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push("/")}>
            plaart
          </motion.div>

          {/* Right side - Language Switcher + Login Button */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <motion.button
              className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors duration-200"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogin}>
              {t("auth.navbar.signIn")}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
