export const LANGUAGES = {
  en: "en",
  es: "es",
} as const;

export type LanguageKey = keyof typeof LANGUAGES;
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export const Translations = {
  [LANGUAGES.en]: en,
  [LANGUAGES.es]: es,
} as const;

export type TranslationsSchema = typeof en;
