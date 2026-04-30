"use client";

import { Globe } from "lucide-react";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppLocale } from "@/i18n/useAppLocale";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type LocaleToggleLabels = {
  language: string;
  italian: string;
  english: string;
};

function persistLocaleCookie(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  try {
    window.localStorage.setItem("locale-preference", locale);
  } catch {}
}

export default function LocaleToggle({ labels }: { labels: LocaleToggleLabels }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params?.locale as AppLocale) ?? "it";
  const [isPending, startTransition] = useTransition();

  const onSelect = (next: string) => {
    if (next !== "it" && next !== "en") return;
    if (next === currentLocale) return;
    persistLocaleCookie(next);
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={labels.language}
          title={labels.language}
          disabled={isPending}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{labels.language}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={currentLocale} onValueChange={onSelect}>
          <DropdownMenuRadioItem value="it">{labels.italian}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{labels.english}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
