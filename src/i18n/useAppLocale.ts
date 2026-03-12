"use client";

import { useLocale } from "next-intl";

export type AppLocale = "en" | "it";

export function useAppLocale() {
  const locale = useLocale() as AppLocale;

  return {
    locale,
    isItalian: locale === "it",
  };
}