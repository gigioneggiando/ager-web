"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Props = {
  href: string;
};

async function copyToClipboard(text: string) {
  const nav = typeof window !== "undefined" ? window.navigator : undefined;

  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export default function ArticleActions({ href }: Props) {
  const t = useTranslations("articleDetail.actions");

  return (
    <div className="mt-6 flex gap-2">
      <Button asChild>
        <a href={href} target="_blank" rel="noreferrer">
          {t("openArticle")}
        </a>
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            await copyToClipboard(href);
            toast(t("linkCopied"));
          } catch {
            toast(t("copyFailed"));
          }
        }}
      >
        {t("copyLink")}
      </Button>
    </div>
  );
}
