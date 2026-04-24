"use client";

import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFeedPage } from "@/lib/api/feed";
import FeedCard from "./FeedCard";
import EmptyState from "./EmptyState";
import { useSession } from "@/lib/auth/session";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 20;

export default function FeedList() {
  const { accessToken } = useSession();
  const t = useTranslations("feed");
  const search = useSearchParams();
  const tab = search.get("tab") ?? "latest";
  const topic = search.get("topic") ?? "all";

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["feed", tab, topic],
    queryFn: ({ pageParam }) => fetchFeedPage({ cursor: pageParam ?? null, limit: PAGE_SIZE }, accessToken, tab, topic),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

  const items = useMemo(() => {
    const flattened = (data?.pages ?? []).flatMap((p) => p.items);
    const seen = new Set<number>();
    const unique = [] as typeof flattened;
    for (const it of flattened) {
      if (seen.has(it.feedItemId)) continue;
      seen.add(it.feedItemId);
      unique.push(it);
    }
    return unique;
  }, [data]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!bottomRef.current) return;
    const el = bottomRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border p-6">
        <div className="mb-2 text-sm font-medium">Failed to load the feed</div>
        <div className="mb-4 text-sm text-muted-foreground">{(error as Error).message}</div>
        <button className="rounded-md border px-3 py-1 text-sm" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <FeedCard
          key={it.feedItemId}
          feedItemId={it.feedItemId}
          articleId={it.articleId}
          title={it.title}
          url={it.url}
          excerpt={it.excerpt}
          imageUrl={it.imageUrl}
          sourceName={it.sourceName}
          publishedAt={it.publishedAt}
          topics={it.topics}
          estimatedReadingMinutes={it.estimatedReadingMinutes}
          paywallDetected={it.paywallDetected}
        />
      ))}
      <div ref={bottomRef} />
      {isFetchingNextPage && (
        <div className="py-3 text-center text-sm text-muted-foreground">Loading…</div>
      )}
      {!hasNextPage && (
        <div className="py-3 text-center text-xs text-muted-foreground">{t("allCaughtUp")}</div>
      )}
    </div>
  );
}
