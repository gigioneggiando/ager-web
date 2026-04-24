"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useSession } from "@/lib/auth/session";

export default function AppSidebar() {
  const t = useTranslations("layout.sidebar");
  const { locale } = useAppLocale();
  const { role, ready } = useSession();

  const links = [
    { path: "/feed", label: t("forYou") },
    { path: "/feed?tab=latest", label: t("latest") },
    { path: "/feed?tab=top", label: t("top") },
    { path: "/explore", label: t("explore") },
    { path: "/lists", label: t("lists") }
  ];

  // Render admin entries only for confirmed-admin sessions. Non-admins, anonymous visitors,
  // and sessions that haven't hydrated yet see nothing — no flash of clickable-but-broken
  // links. The backend still enforces RequireRole("admin") on every /api/admin/* route.
  const showAdmin = ready && role === "admin";

  const adminLinks = [
    { path: "/admin/sources", label: t("admin.sources") },
    { path: "/admin/takedown", label: t("admin.takedown") },
    { path: "/admin/ingestion-log", label: t("admin.ingestionLog") }
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

      {showAdmin && (
        <div className="mt-6" data-testid="admin-nav-section">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("admin.heading")}
          </div>
          <ul className="space-y-1">
            {adminLinks.map(({ path, label }) => (
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
        </div>
      )}
    </nav>
  );
}
