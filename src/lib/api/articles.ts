import { API_BASE } from "@/lib/api/client";
import { requestJson } from "@/lib/api/request";
import type { DisplayMode, LicenseType } from "@/lib/api/types";

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
  licenseType: LicenseType;
  displayMode: DisplayMode;
  paywallDetected: boolean;
};

export async function getArticlePublic(articleId: number): Promise<ArticleDto> {
  const isBrowser = typeof window !== "undefined";
  const url = isBrowser ? `/api/articles/${articleId}` : `${API_BASE}/api/articles/${articleId}`;

  return requestJson<ArticleDto>(url, { method: "GET", cache: "no-store" });
}
