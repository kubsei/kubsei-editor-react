"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import useIntl from "@/hooks/useIntl";

export const HeroButtons = () => {
  const router = useRouter();
  const { t } = useIntl();

  return (
    <motion.div
      className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
    >
      <motion.button
        className="bg-black text-white px-8 py-4 rounded-full text-lg font-medium cursor-pointer hover:bg-gray-800 transition-colors duration-200"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/editor")}
      >
        {t("home.hero.buttons.btnStart")}
      </motion.button>

      <motion.button
        className="bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-medium cursor-pointer hover:border-gray-400 hover:text-black transition-all duration-200"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/docs")}
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t("home.hero.buttons.btnDocs")}
        </span>
      </motion.button>
    </motion.div>
  );
};
