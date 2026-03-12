"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchArticlesPublic } from "@/lib/api/articlesSearch";
import { getTags, searchByTag, type ArticleTagDto } from "@/lib/api/articlesTags";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import SearchResultRow from "@/features/search/components/SearchResultRow";
import { Button } from "@/components/ui/button";
import TagBar from "@/features/search/components/TagBar";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api/errors";
import { useAppLocale } from "@/i18n/useAppLocale";

function clampPage(n: number) {
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function clampPageSize(n: number) {
  if (n === 10 || n === 20 || n === 50) return n;
  return 20;
}

export default function SearchPageClient() {
  const t = useTranslations("search.page");
  const tTagNames = useTranslations("search.tagNames");
  const { locale } = useAppLocale();
  const router = useRouter();
  const sp = useSearchParams();

  const qParam = sp.get("q") ?? "";
  const tagParam = (sp.get("tag") ?? "").trim();
  const selectedTag = tagParam.length > 0 ? tagParam : null;
  const page = clampPage(Number(sp.get("page") ?? "1"));
  const pageSize = clampPageSize(Number(sp.get("pageSize") ?? "20"));

  const [qInput, setQInput] = useState(qParam);
  useEffect(() => setQInput(qParam), [qParam]);

  const debounced = useDebouncedValue(qInput, 300);
  const q = debounced.trim();

  // keep URL in sync (bookmark/share)
  useEffect(() => {
    const current = (sp.get("q") ?? "").trim();
    if (q === current) return;

    const next = new URLSearchParams(sp.toString());
    if (!q) {
      next.delete("q");
      next.delete("page");
    } else {
      next.set("q", q);
      next.set("page", "1");
    }

    // If the user starts typing a query, switch back to standard search.
    if (q) next.delete("tag");

    router.replace(`/${locale}/search?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, locale]);

  const tagsQuery = useQuery({
    queryKey: ["articleTags"],
    queryFn: () => getTags(),
    staleTime: 60_000,
    retry: 1,
  });

  const fallbackTags = useMemo((): ArticleTagDto[] => {
    return [
      {
        slug: "tech",
        name: t("fallbackTagNames.tech"),
        keywords: [],
      },
      {
        slug: "business",
        name: t("fallbackTagNames.business"),
        keywords: [],
      },
      {
        slug: "design",
        name: t("fallbackTagNames.design"),
        keywords: [],
      },
      {
        slug: "ai",
        name: t("fallbackTagNames.ai"),
        keywords: [],
      },
    ];
  }, [t]);

  const tagNameBySlug = useMemo((): Record<string, string> => ({
    tecnologia: tTagNames("tecnologia"),
    business: tTagNames("business"),
    design: tTagNames("design"),
    ai: tTagNames("ai"),
    politica: tTagNames("politica"),
    scienza: tTagNames("scienza"),
    economia: tTagNames("economia"),
    finanza: tTagNames("finanza"),
    salute: tTagNames("salute"),
    clima: tTagNames("clima"),
    energia: tTagNames("energia"),
    cybersecurity: tTagNames("cybersecurity"),
    spazio: tTagNames("spazio"),
    startup: tTagNames("startup"),
    cultura: tTagNames("cultura"),
    cucina: tTagNames("cucina"),
    geopolitica: tTagNames("geopolitica"),
    filosofia: tTagNames("filosofia"),
    sport: tTagNames("sport"),
    viaggi: tTagNames("viaggi"),
    educazione: tTagNames("educazione"),
    psicologia: tTagNames("psicologia"),
    intrattenimento: tTagNames("intrattenimento"),
    moda: tTagNames("moda"),
    auto: tTagNames("auto"),
  }), [tTagNames]);

  const tagsToRender = (tagsQuery.isError ? fallbackTags : tagsQuery.data ?? []).map((tag) => ({
    ...tag,
    name: tagNameBySlug[tag.slug] ?? tag.name,
  }));

  function hrefForTag(nextTag: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (!nextTag) next.delete("tag");
    else next.set("tag", nextTag);
    next.set("page", "1");
    if (!next.get("pageSize")) next.set("pageSize", String(pageSize));
    return `/${locale}/search?${next.toString()}`;
  }

  const textQuery = useQuery({
    queryKey: ["articleSearchPublic", q, page, pageSize],
    queryFn: () => searchArticlesPublic({ q, page, pageSize }),
    enabled: selectedTag === null && q.length > 0,
    staleTime: 20_000,
    retry: 1,
  });

  const tagQuery = useQuery({
    queryKey: ["articleTagSearch", selectedTag, page, pageSize],
    queryFn: () => searchByTag({ tag: selectedTag!, page, pageSize }),
    enabled: selectedTag !== null,
    staleTime: 20_000,
    retry: 1,
  });

  const resultsQuery = selectedTag !== null ? tagQuery : textQuery;

  useEffect(() => {
    if (tagsQuery.isError) {
      toast(t("loadTagsErrorToast"));
    }
  }, [tagsQuery.isError, t]);

  useEffect(() => {
    if (!resultsQuery.isError) return;
    const err = resultsQuery.error as unknown as ApiError | Error | undefined;

    if ((err as ApiError | undefined)?.status === 404) {
      toast(t("invalidTagToast"));
      return;
    }

    toast(t("searchFailedToast"));
  }, [resultsQuery.isError, resultsQuery.error, t]);

  const totalPages = useMemo(() => {
    const total = resultsQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [resultsQuery.data?.total, pageSize]);

  const pageLabel = useMemo(() => {
    return t("pageOf", { page, totalPages });
  }, [page, t, totalPages]);

  function setPage(nextPage: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(Math.min(Math.max(1, nextPage), totalPages)));
    router.push(`/${locale}/search?${next.toString()}`);
  }

  function setPageSize(nextSize: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("pageSize", String(nextSize));
    next.set("page", "1");
    router.push(`/${locale}/search?${next.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Input (page-local) */}
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <input
          className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={t("queryPlaceholder")}
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("perPage")}</span>
          <select
            className="h-10 rounded-md border bg-background px-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <TagBar
        tags={tagsToRender.map((t) => ({ slug: t.slug, name: t.name }))}
        selectedTag={selectedTag}
        hrefForTag={hrefForTag}
        loading={tagsQuery.isLoading}
        showFallbackNote={tagsQuery.isError}
      />

      <div className="mt-5">
        {!q && selectedTag === null && (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            {t("emptyPrompt")}
          </div>
        )}

        {(selectedTag !== null || q) && resultsQuery.isLoading && (
          <div className="text-sm text-muted-foreground">{t("searching")}</div>
        )}

        {(selectedTag !== null || q) && resultsQuery.isError && (
          <div className="rounded border border-destructive/40 p-4 text-sm text-destructive">
            {(() => {
              const err = resultsQuery.error as unknown as ApiError | Error | undefined;
              if ((err as ApiError | undefined)?.status === 404) {
                return t("invalidTag");
              }
              return t("searchFailed");
            })()}
            <div className="mt-2 text-xs text-muted-foreground">
              {t("requestRetryHint")}
            </div>
          </div>
        )}

        {(selectedTag !== null || q) && resultsQuery.data && resultsQuery.data.items.length === 0 && (
          <div className="rounded border p-4 text-sm text-muted-foreground">{t("noResults")}</div>
        )}

        {(selectedTag !== null || q) && resultsQuery.data && resultsQuery.data.items.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("results", { total: resultsQuery.data.total })}</span>
              <span>{pageLabel}</span>
            </div>

            <div className="space-y-3">
              {resultsQuery.data.items.map((it) => (
                <SearchResultRow key={it.articleId} {...it} />
              ))}
            </div>

            <div className="mt-8 pb-2">
              <div className="mb-2 text-center text-xs text-muted-foreground">{pageLabel}</div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  {t("previous")}
                </Button>

                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                  {t("next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
