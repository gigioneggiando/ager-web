import { API_BASE } from "@/lib/api/client";
import { requestJson } from "@/lib/api/request";

export type ArticleDto = {
  articleId: number;
  title: string;
  url: string;
  canonicalUrl?: string | null;
  excerpt?: string | null;
  imageUrl?: string | null;
  sourceName?: string | null;
  publishedAt?: string | null;
  author?: string | null;
  lang?: string | null;
};

export async function getArticlePublic(articleId: number): Promise<ArticleDto> {
  const isBrowser = typeof window !== "undefined";
  const url = isBrowser ? `/api/articles/${articleId}` : `${API_BASE}/api/articles/${articleId}`;

  return requestJson<ArticleDto>(url, { method: "GET", cache: "no-store" });
}
