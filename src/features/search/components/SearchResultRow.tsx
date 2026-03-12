"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Share2, Heart, EyeOff } from "lucide-react";
import { useState } from "react";
import AddToListDialog from "@/features/lists/components/AddToListDialog";
import { useInteract } from "@/features/interactions/useInteract";
import { useQueryClient } from "@tanstack/react-query";
import ResilientImage from "@/components/media/ResilientImage";
import { normalizeImageUrl } from "@/lib/images/normalize";
import { useAppLocale } from "@/i18n/useAppLocale";

type Props = {
  articleId: number;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  sourceUrl?: string | null;
  sourceName: string;
  publishedAt: string;
};

function timeAgo(iso: string, locale: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (mins < 1) return rtf.format(0, "minute");
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.floor(hrs / 24);
  return rtf.format(-days, "day");
}

async function shareOrCopy(opts: { title: string; url: string }) {
  const { title, url } = opts;
  const nav = typeof window !== "undefined" ? window.navigator : undefined;

  if (nav?.share) {
    await nav.share({ title, url });
    return;
  }

  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(url);
    return;
  }

  // fallback
  const el = document.createElement("textarea");
  el.value = url;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export default function SearchResultRow({
  articleId,
  title,
  excerpt,
  imageUrl,
  sourceUrl,
  sourceName,
  publishedAt,
}: Props) {
  const t = useTranslations("search.resultRow");
  const { locale } = useAppLocale();
  const sp = useSearchParams();
  const qc = useQueryClient();

  const rel = timeAgo(publishedAt, locale ?? "it");
  const [addOpen, setAddOpen] = useState(false);

  const detailHref = `/${locale}/articles/${articleId}`;
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const detailAbsoluteUrl = `${siteOrigin || "https://www.agerculture.com"}${detailHref}`;
  const normalizedImageUrl = normalizeImageUrl(imageUrl, sourceUrl ?? detailAbsoluteUrl);
  const hasImage = !!normalizedImageUrl;

  // Reuse your existing interaction hook (server calls + undo toast)
  const { like, hide } = useInteract();

  /**
   * Optimistic remove from *search* cache so the row disappears instantly.
   * We still call useInteract().hide() to schedule the server DISCARD + toast undo.
   * If user undoes, your hook will restore feed snapshots; here we also restore search snapshot.
   */
  function hideFromSearchOptimistic() {
    const q = (sp.get("q") ?? "").trim();
    const page = Number(sp.get("page") ?? "1") || 1;
    const pageSize = Number(sp.get("pageSize") ?? "20") || 20;

    const key = ["articleSearchPublic", q, page, pageSize];

    // Snapshot current search data
    const prev = qc.getQueryData<any>(key);
    if (prev?.items?.length) {
      qc.setQueryData(key, {
        ...prev,
        items: prev.items.filter((x: any) => x.articleId !== articleId),
      });
    }

    // Trigger your existing hide flow (includes undo toast + delayed commit)
    hide(articleId);

    /**
     * IMPORTANT: Your existing undo restores feed snapshots internally.
     * To restore search results on undo, the simplest reliable way is to
     * refetch the search query when any undo happens.
     *
     * Since your useInteract currently handles toast internally, we can't
     * hook directly into its undo click from here without changing it.
     * So we ensure correctness by invalidating the search query shortly after:
     * - If user doesn't undo: server will confirm; refetch is fine.
     * - If user undoes: server won't commit; refetch restores the hidden item.
     *
     * This keeps behavior correct without modifying useInteract right now.
     */
    window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["articleSearchPublic"] });
    }, 3500);
  }

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        {hasImage && (
          <div className="mt-0.5 h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
            <ResilientImage
              src={normalizedImageUrl!}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{sourceName}</span>
            <span>•</span>
            <span>{rel}</span>
          </div>
          <Link href={detailHref} className="mt-1 block font-medium hover:underline">
            {title}
          </Link>
          {excerpt && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => like(articleId)}
            aria-label={t("like")}
            title={t("like")}
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">{t("like")}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => setAddOpen(true)}
            aria-label={t("saveTo")}
            title={t("saveTo")}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">{t("save")}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={async () => {
              const url = window.location.origin + detailHref;
              await shareOrCopy({ title, url });
            }}
            aria-label={t("share")}
            title={t("share")}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("share")}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={hideFromSearchOptimistic}
            aria-label={t("hide")}
            title={t("notInterested")}
          >
            <EyeOff className="h-4 w-4" />
            <span className="hidden sm:inline">{t("hide")}</span>
          </Button>
        </div>
      </div>

      <AddToListDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        articleId={articleId}
        articleTitle={title}
      />
    </Card>
  );
}
