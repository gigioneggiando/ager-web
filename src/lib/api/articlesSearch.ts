import { getArticlePublic } from "@/lib/api/articles";
import { requestJson } from "@/lib/api/request";
import type { DisplayMode, LicenseType } from "@/lib/api/types";

export type ArticleSearchItem = {
  articleId: number;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  sourceUrl?: string | null;
  sourceName: string;
  publishedAt: string;
  licenseType?: LicenseType;
  displayMode?: DisplayMode;
  paywallDetected?: boolean;
};

export type ArticleSearchResponse = {
  items: ArticleSearchItem[];
  total: number;
  page: number;
  pageSize: number;
};

function hasRelativeImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return false;
  return !/^https?:\/\//i.test(imageUrl);
}

export async function enrichSearchItemsWithSourceUrl(items: ArticleSearchItem[]): Promise<ArticleSearchItem[]> {
  const uniqueArticleIds = Array.from(
    new Set(items.filter((item) => hasRelativeImageUrl(item.imageUrl)).map((item) => item.articleId))
  );

  if (uniqueArticleIds.length === 0) return items;

  const articleDetails = await Promise.all(
    uniqueArticleIds.map(async (articleId) => {
      try {
        const article = await getArticlePublic(articleId);
        return [articleId, article.canonicalUrl ?? article.url] as const;
      } catch {
        return [articleId, null] as const;
      }
    })
  );

  const sourceUrlByArticleId = new Map(articleDetails);

  return items.map((item) => ({
    ...item,
    sourceUrl: sourceUrlByArticleId.get(item.articleId) ?? item.sourceUrl ?? null,
  }));
}

export async function searchArticles(args: {
  q: string;
  page?: number;
  pageSize?: number;
  accessToken?: string;
  locale?: string;
}): Promise<ArticleSearchResponse> {
  const q = args.q.trim();
  const page = args.page && args.page > 0 ? args.page : 1;
  const pageSizeRaw = args.pageSize ?? 20;
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));

  const url = new URL(`/api/articles/search`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  if (args.locale) url.searchParams.set("lang", args.locale);

  const data = await requestJson<ArticleSearchResponse>(url.toString(), {
    method: "GET",
    accessToken: args.accessToken,
    credentials: "include",
  });

  return {
    ...data,
    items: await enrichSearchItemsWithSourceUrl(data.items),
  };
}

// Legacy helper that keeps public search behavior (no auth header required)
export async function searchArticlesPublic(args: {
  q: string;
  page?: number;
  pageSize?: number;
  locale?: string;
}): Promise<ArticleSearchResponse> {
  return searchArticles(args);
}
