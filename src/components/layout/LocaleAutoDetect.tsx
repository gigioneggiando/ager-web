"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const STORAGE_KEY = "locale-preference";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

export default function LocaleAutoDetect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params?.locale as string) ?? "it";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cookiePref = readCookie("NEXT_LOCALE");
    if (cookiePref === "it" || cookiePref === "en") return;

    let storagePref: string | null = null;
    try {
      storagePref = window.localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (storagePref === "it" || storagePref === "en") {
      document.cookie = `NEXT_LOCALE=${storagePref}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      if (storagePref !== currentLocale) {
        router.replace(pathname, { locale: storagePref });
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/locale/detect", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { locale?: string };
        const detected = data?.locale === "it" ? "it" : data?.locale === "en" ? "en" : null;
        if (!detected) return;

        document.cookie = `NEXT_LOCALE=${detected}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
        try {
          window.localStorage.setItem(STORAGE_KEY, detected);
        } catch {}

        if (detected !== currentLocale) {
          router.replace(pathname, { locale: detected });
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLocale, pathname, router]);

  return null;
}
