import { enrichSearchItemsWithSourceUrl, type ArticleSearchResponse } from "@/lib/api/articlesSearch";
import { requestJson } from "@/lib/api/request";

export type ArticleTagDto = {
  slug: string;
  name: string;
  keywords: string[];
};

export async function getTags(): Promise<ArticleTagDto[]> {
  return requestJson<ArticleTagDto[]>("/api/articles/tags", {
    method: "GET",
    cache: "no-store",
  });
}

export async function searchByTag(args: {
  tag: string;
  page?: number;
  pageSize?: number;
  locale?: string;
}): Promise<ArticleSearchResponse> {
  const tag = args.tag.trim();
  const page = args.page && args.page > 0 ? args.page : 1;
  const pageSizeRaw = args.pageSize ?? 20;
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));

  const url = new URL(
    `/api/articles/tags/${encodeURIComponent(tag)}/search`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  if (args.locale) url.searchParams.set("lang", args.locale);

  const data = await requestJson<ArticleSearchResponse>(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  return {
    ...data,
    items: await enrichSearchItemsWithSourceUrl(data.items),
  };
}
