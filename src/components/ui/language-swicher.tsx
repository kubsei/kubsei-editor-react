"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, LanguageKey } from "@/lib/translations";
import useIntl from "@/hooks/useIntl";

interface LanguageOption {
  code: LanguageKey;
  label: string;
}

const languages: LanguageOption[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export const LanguageSwitcher = () => {
  const { locale, setLocale } = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((l) => l.code === locale) || languages[1];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (language: LanguageOption) => {
    setLocale(language.code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-black rounded-full border border-gray-200 hover:border-gray-300 bg-white transition-colors duration-200 cursor-pointer"
        whileTap={{ scale: 0.97 }}
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span>{currentLanguage.label}</span>
        <motion.svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 py-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[100px]"
          >
            {languages.map((language) => {
              const isSelected = locale === language.code;

              return (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-gray-50 text-black font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`}
                >
                  <span>{language.code === "en" ? "English" : "Español"}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-1.5 h-1.5 rounded-full bg-black"
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
