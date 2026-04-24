"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Heart, Share2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInteract } from "@/features/interactions/useInteract";
import { useState } from "react";
import AddToListDialog from "@/features/lists/components/AddToListDialog";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session";
import ResilientImage from "@/components/media/ResilientImage";
import { normalizeImageUrl } from "@/lib/images/normalize";
import { useAppLocale } from "@/i18n/useAppLocale";

function timeAgo(iso: string, locale: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(0, "minute");
  if (mins < 60)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    }).format(-hrs, "hour");
  const days = Math.floor(hrs / 24);
  return new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  }).format(-days, "day");
}

export type FeedCardProps = {
  feedItemId: number;
  articleId: number;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: string;
  topics: string[] | null;
  estimatedReadingMinutes: number;
  paywallDetected?: boolean;
};

export default function FeedCard(props: FeedCardProps) {
  const tResultRow = useTranslations("search.resultRow");
  const tFeedCard = useTranslations("feed.card");
  const {
    articleId,
    title,
    url,
    excerpt,
    imageUrl,
    sourceName,
    publishedAt,
    topics,
    estimatedReadingMinutes,
    paywallDetected,
  } = props;

  const { locale } = useAppLocale();
  const rel = timeAgo(publishedAt, locale ?? "it");
  const normalizedImageUrl = normalizeImageUrl(imageUrl, url);
  const hasImage = !!normalizedImageUrl;

  const { accessToken } = useSession();

  // From interactions: like & hide only
  const { like, hide } = useInteract();

  // Dialog state for “Salva in…”
  const [addOpen, setAddOpen] = useState(false);

  const detailHref = `/${locale}/articles/${articleId}`;

  async function shareOrCopy(opts: { title: string; url: string }) {
    const { title, url } = opts;
    const nav = typeof window !== "undefined" ? window.navigator : undefined;

    try {
      if (nav?.share) {
        await nav.share({ title, url });
        return;
      }

      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        toast(tFeedCard("linkCopied"));
        return;
      }

      // fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      toast(tFeedCard("linkCopied"));
    } catch {
      toast(tFeedCard("shareFailed"));
    }
  }

  return (
    <>
      <Card
        className={[
          "grid gap-4 p-4",
          hasImage ? "sm:grid-cols-[1fr,220px]" : "",
        ].join(" ")}
      >
        {/* Text block */}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {sourceName && <span className="truncate">{sourceName}</span>}
            <span>•</span>
            <span>{rel}</span>
            {estimatedReadingMinutes ? (
              <>
                <span>•</span>
                <span>{estimatedReadingMinutes} min</span>
              </>
            ) : null}
            {paywallDetected ? (
              <Badge variant="outline" className="ml-1 rounded-full text-[10px]">
                {tFeedCard("paywallBadge")}
              </Badge>
            ) : null}
          </div>

          {/* Title links out to the original source */}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-base font-semibold leading-snug hover:underline"
          >
            {title}
          </a>

          {excerpt && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {excerpt}
            </p>
          )}

          {topics && topics.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {topics.slice(0, 4).map((t) => (
                <Badge
                  key={t}
                  asChild
                  variant="secondary"
                  className="rounded-full"
                >
                  <Link
                    href={`/${locale}/search?q=${encodeURIComponent(t)}&page=1&pageSize=20`}
                    aria-label={tFeedCard("topicSearchAriaLabel", { topic: t })}
                  >
                    {t}
                  </Link>
                </Badge>
              ))}
            </div>
          )}

          {/* Actions row */}
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => like(articleId)}
              disabled={!accessToken}
              aria-label={tResultRow("like")}
              title={tResultRow("like")}
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">{tResultRow("like")}</span>
            </Button>

            {/* Open the AddToListDialog */}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => setAddOpen(true)}
              aria-label={tResultRow("saveTo")}
              title={tResultRow("saveTo")}
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{tResultRow("saveTo")}</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={async () => {
                const shareUrl = window.location.origin + detailHref;
                await shareOrCopy({ title, url: shareUrl });
              }}
              aria-label={tResultRow("share")}
              title={tResultRow("share")}
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">{tResultRow("share")}</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => hide(articleId)}
              aria-label={tResultRow("hide")}
              title={tResultRow("notInterested")}
            >
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">{tResultRow("hide")}</span>
            </Button>
          </div>
        </div>

        {/* Image block */}
        {hasImage && (
          <a href={url} target="_blank" rel="noreferrer" className="w-full">
            <ResilientImage
              src={normalizedImageUrl!}
              alt=""
              width={800}
              height={450}
              className="w-full h-auto rounded-md"  
              sizes="(max-width: 640px) 100vw, 220px"
            />
          </a>
        )}
      </Card>

      {/* “Salva in…” dialog */}
      <AddToListDialog
        articleId={articleId}
        articleTitle={title}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </>
  );
}
