import { API_BASE } from "@/lib/api/client";
import { requestJson } from "@/lib/api/request";
import type { IngestionLogAdmin, IngestionLogStatsResponse } from "@/lib/api/types";

function makeUrl(path: string): string {
  const isBrowser = typeof window !== "undefined";
  return isBrowser ? path : `${API_BASE}${path}`;
}

export type IngestionLogFilter = {
  sourceId?: number;
  from?: string;
  to?: string;
  errorsOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listIngestionLogAdmin(
  filter: IngestionLogFilter = {},
  accessToken?: string,
): Promise<IngestionLogAdmin[]> {
  const url = new URL(
    makeUrl("/api/admin/ingestion-log"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (filter.sourceId) url.searchParams.set("sourceId", String(filter.sourceId));
  if (filter.from) url.searchParams.set("from", filter.from);
  if (filter.to) url.searchParams.set("to", filter.to);
  if (filter.errorsOnly) url.searchParams.set("errorsOnly", "true");
  if (filter.page) url.searchParams.set("page", String(filter.page));
  if (filter.pageSize) url.searchParams.set("pageSize", String(filter.pageSize));
  return requestJson<IngestionLogAdmin[]>(url.toString(), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}

export async function getIngestionLogStats(
  days: number,
  accessToken?: string,
): Promise<IngestionLogStatsResponse> {
  const url = new URL(
    makeUrl("/api/admin/ingestion-log/stats"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  url.searchParams.set("days", String(days));
  return requestJson<IngestionLogStatsResponse>(url.toString(), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}
