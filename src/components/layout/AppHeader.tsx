"use client";

import { Bell, CircleUser, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/ThemeToggle";
import HeaderSearch from "@/components/search/HeaderSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useAuthActions, useSession } from "@/lib/auth/session";

export default function AppHeader() {
  const t = useTranslations("layout.header");
  const { userId } = useSession();
  const { logout } = useAuthActions();
  const isAuthed = userId != null;
  const { locale } = useAppLocale();
  const router = useRouter();
  const qc = useQueryClient();

  const onLogout = async () => {
    await logout();
    qc.clear();
    router.replace(`/${locale}/login`);
  };

  return (
    <header className="flex w-full items-center gap-3">
      <Link
        href={`/${locale}`}
        className="flex select-none items-center gap-2 text-xl font-bold tracking-tight md:text-2xl"
        aria-label={t("homeAriaLabel")}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
          <Image
            src="/favicon.ico"
            alt="Ager"
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
            priority
          />
        </span>
        <span>Ager</span>
      </Link>

      <div className="relative ml-auto hidden w-full max-w-sm items-center md:flex">
        <HeaderSearch />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <ThemeToggle
          labels={{
            theme: t("theme"),
            system: t("themeSystem"),
            light: t("themeLight"),
            dark: t("themeDark"),
          }}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("menuAriaLabel")}>
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              {t("notificationsComingSoon")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isAuthed ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label={t("profile")}
              title={t("profile")}
            >
              <Link href={`/${locale}/profile`}>
                <CircleUser className="h-5 w-5" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("settings")}
                  title={t("settings")}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/profile`}>{t("profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onLogout}>
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button size="sm" variant="default" asChild>
            <Link href={`/${locale}/login`}>{t("signIn")}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
