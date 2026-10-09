"use client";
import { createContext, useState, useMemo, ReactNode } from "react";
import {
  Translations,
  TranslationsSchema,
  LANGUAGES,
  LanguageKey,
} from "@/lib/translations";

interface IntlContextType {
  locale: LanguageKey;
  setLocale: (locale: LanguageKey) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  messages: TranslationsSchema;
}

export const IntlContext = createContext<IntlContextType | null>(null);

interface IntlProviderProps {
  children: ReactNode;
  initialLocale?: LanguageKey;
}

export const IntlProvider = ({
  children,
  initialLocale = LANGUAGES.es,
}: IntlProviderProps) => {
  const [locale, setLocale] = useState<LanguageKey>(initialLocale);

  const messages: TranslationsSchema = useMemo(() => {
    const selectedMessages = Translations[locale];
    if (!selectedMessages) {
      console.warn(`Translations for locale "${locale}" not found`);
      return Translations[LANGUAGES.es];
    }
    return selectedMessages;
  }, [locale]);

  const t = (key: string, values?: Record<string, string | number>): string => {
    if (!key) return key;
    if (!messages) return key;

    const keys = key.split(".");
    let result: unknown = messages;

    for (const k of keys) {
      result = result ? (result as Record<string, unknown>)[k] : undefined;
      if (result === undefined) return key;
    }

    if (typeof result !== "string") return key;

    if (values) {
      let finalResult = result;
      Object.keys(values).forEach((valueKey) => {
        finalResult = finalResult.replace(
          new RegExp(`\\{${valueKey}\\}`, "g"),
          String(values[valueKey])
        );
      });
      return finalResult;
    }

    return result;
  };

  return (
    <IntlContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </IntlContext.Provider>
  );
};
