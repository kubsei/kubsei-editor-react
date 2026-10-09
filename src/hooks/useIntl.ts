"use client";
import { useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLocale as setLocaleAction } from "@/lib/store/slices/intlSlice";
import {
  Translations,
  TranslationsSchema,
  LANGUAGES,
  LanguageKey,
} from "@/lib/translations";

const useIntl = () => {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.intl.locale);

  const messages: TranslationsSchema = useMemo(() => {
    const selectedMessages = Translations[locale];
    if (!selectedMessages) {
      console.warn(`Translations for locale "${locale}" not found`);
      return Translations[LANGUAGES.es];
    }
    return selectedMessages;
  }, [locale]);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>): string => {
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
    },
    [messages]
  );

  const setLocale = useCallback(
    (newLocale: LanguageKey) => {
      dispatch(setLocaleAction(newLocale));
    },
    [dispatch]
  );

  return { t, locale, setLocale, messages };
};

export default useIntl;
