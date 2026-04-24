import { API_BASE } from "@/lib/api/client";
import { requestJson, requestVoid } from "@/lib/api/request";
import type { Source, SourceAdmin, SourceAdminUpdate } from "@/lib/api/types";

function makeUrl(path: string): string {
  const isBrowser = typeof window !== "undefined";
  return isBrowser ? path : `${API_BASE}${path}`;
}

export async function listSourcesPublic(): Promise<Source[]> {
  return requestJson<Source[]>(makeUrl("/api/sources"), { method: "GET", cache: "no-store" });
}

export type AdminSourcesFilter = {
  expiringIn?: number;
  tdmOptout?: boolean;
  negotiation?: "in_progress";
};

export async function listSourcesAdmin(
  filter: AdminSourcesFilter = {},
  accessToken?: string,
): Promise<SourceAdmin[]> {
  const url = new URL(
    makeUrl("/api/admin/sources"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (filter.expiringIn) url.searchParams.set("expiringIn", String(filter.expiringIn));
  if (filter.tdmOptout) url.searchParams.set("tdmOptout", "true");
  if (filter.negotiation) url.searchParams.set("negotiation", filter.negotiation);
  return requestJson<SourceAdmin[]>(url.toString(), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}

export async function getSourceAdmin(id: number, accessToken?: string): Promise<SourceAdmin> {
  return requestJson<SourceAdmin>(makeUrl(`/api/admin/sources/${id}`), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}

export async function patchSourceAdmin(
  id: number,
  body: SourceAdminUpdate,
  accessToken?: string,
): Promise<void> {
  await requestVoid(makeUrl(`/api/admin/sources/${id}`), {
    method: "PATCH",
    accessToken,
    credentials: "include",
    body,
  });
}

export async function refreshTosSnapshot(
  id: number,
  accessToken?: string,
): Promise<{ previousHash: string | null; currentHash: string; changed: boolean }> {
  return requestJson<{ previousHash: string | null; currentHash: string; changed: boolean }>(
    makeUrl(`/api/admin/sources/${id}/refresh-tos`),
    {
      method: "POST",
      accessToken,
      credentials: "include",
    },
  );
}
