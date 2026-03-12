"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/i18n/useAppLocale";

export default function AppSidebar() {
  const t = useTranslations("layout.sidebar");
  const { locale } = useAppLocale();

  const links = [
    { path: "/feed", label: t("forYou") },
    { path: "/feed?tab=latest", label: t("latest") },
    { path: "/feed?tab=top", label: t("top") },
    { path: "/explore", label: t("explore") },
    { path: "/lists", label: t("lists") }
  ];

  return (
    <nav aria-label={t("ariaLabel")} className="sticky top-[4.25rem]">
      <ul className="space-y-1">
        {links.map(({ path, label }) => (
          <li key={path}>
            <Link
              href={`/${locale}${path}`}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
