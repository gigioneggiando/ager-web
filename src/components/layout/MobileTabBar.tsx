"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Search, User } from "lucide-react";
import { useAppLocale } from "@/i18n/useAppLocale";

export default function MobileTabBar() {
  const t = useTranslations("layout.mobileNav");
  const pathname = usePathname();
  const { locale } = useAppLocale();

  const items = [
    { path: "/feed", label: t("feed"), Icon: Home },
    { path: "/explore", label: t("explore"), Icon: Search },
    { path: "/lists", label: t("lists"), Icon: ListChecks },
    { path: "/profile", label: t("profile"), Icon: User },
  ];

  return (
    <nav aria-label="Primary" className="grid grid-cols-4">
      {items.map(({ path, label, Icon }) => {
        const href = `/${locale}${path}`;
        const active = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={path}
            href={href}
            className="flex flex-col items-center justify-center gap-1 py-3 text-sm"
            aria-current={active ? "page" : undefined}
          >
            <Icon className={`h-5 w-5 ${active ? "text-foreground" : "text-muted-foreground"}`} />
            <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
