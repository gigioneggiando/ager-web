"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import TagBar from "@/features/search/components/TagBar";
import SearchResultRow from "@/features/search/components/SearchResultRow";
import { Button } from "@/components/ui/button";
import { getTags, searchByTag, type ArticleTagDto } from "@/lib/api/articlesTags";
import { useAppLocale } from "@/i18n/useAppLocale";

function clampPage(n: number) {
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function clampPageSize(n: number) {
  if (n === 10 || n === 20 || n === 50) return n;
  return 20;
}

export default function ExplorePageClient() {
  const t = useTranslations("search.explore");
  const tTagNames = useTranslations("search.tagNames");
  const { locale } = useAppLocale();
  const router = useRouter();
  const sp = useSearchParams();

  const [qInput, setQInput] = useState("");
  const selectedTag = (sp.get("tag") ?? "").trim() || null;
  const page = clampPage(Number(sp.get("page") ?? "1"));
  const pageSize = clampPageSize(Number(sp.get("pageSize") ?? "20"));

  const tagsQuery = useQuery({
    queryKey: ["articleTags"],
    queryFn: () => getTags(),
    staleTime: 60_000,
    retry: 1,
  });

  const fallbackTags = useMemo((): ArticleTagDto[] => {
    return [
      { slug: "tech", name: t("fallbackTagNames.tech"), keywords: [] },
      { slug: "business", name: t("fallbackTagNames.business"), keywords: [] },
      { slug: "design", name: t("fallbackTagNames.design"), keywords: [] },
      { slug: "ai", name: t("fallbackTagNames.ai"), keywords: [] },
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

  const hrefForTag = (slug: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (!slug) next.delete("tag");
    else next.set("tag", slug);
    next.set("page", "1");
    next.set("pageSize", String(pageSize));
    return `/${locale}/explore?${next.toString()}`;
  };

  const resultsQuery = useQuery({
    queryKey: ["exploreTagSearch", selectedTag, page, pageSize],
    queryFn: () => searchByTag({ tag: selectedTag!, page, pageSize }),
    enabled: selectedTag !== null,
    staleTime: 20_000,
    retry: 1,
  });

  const totalPages = Math.max(1, Math.ceil((resultsQuery.data?.total ?? 0) / pageSize));

  useEffect(() => {
    if (tagsQuery.isError) {
      toast(t("loadTagsErrorToast"));
    }
  }, [tagsQuery.isError, t]);

  useEffect(() => {
    if (!resultsQuery.isError) return;
    toast(t("loadArticlesErrorToast"));
  }, [resultsQuery.isError, t]);

  function setPage(nextPage: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(Math.min(Math.max(1, nextPage), totalPages)));
    next.set("pageSize", String(pageSize));
    router.push(`/${locale}/explore?${next.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = qInput.trim();
          if (!q) return;
          router.push(`/${locale}/search?q=${encodeURIComponent(q)}&page=1&pageSize=20`);
        }}
        className="mt-6 flex flex-col items-center gap-3"
      >
        <input
          className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder={t("queryPlaceholder")}
        />
      </form>

      <TagBar
        tags={tagsToRender.map((t) => ({ slug: t.slug, name: t.name }))}
        selectedTag={selectedTag}
        hrefForTag={hrefForTag}
        loading={tagsQuery.isLoading}
        showFallbackNote={tagsQuery.isError}
      />

      <div className="mt-6">
        {!selectedTag && (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            {t("emptyPrompt")}
          </div>
        )}

        {selectedTag && resultsQuery.isLoading && (
          <div className="text-sm text-muted-foreground">{t("loading")}</div>
        )}

        {selectedTag && resultsQuery.data && resultsQuery.data.items.length === 0 && (
          <div className="rounded border p-4 text-sm text-muted-foreground">
            {t("noResults")}
          </div>
        )}

        {selectedTag && resultsQuery.data && resultsQuery.data.items.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("results", { total: resultsQuery.data.total })}</span>
              <span>{t("pageOf", { page, totalPages })}</span>
            </div>

            <div className="space-y-3">
              {resultsQuery.data.items.map((item) => (
                <SearchResultRow key={item.articleId} {...item} />
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                {t("previous")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                {t("next")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
