import { API_BASE } from "@/lib/api/client";
import { requestJson, requestVoid } from "@/lib/api/request";
import type {
  TakedownRequestAdmin,
  TakedownRequestAdminUpdate,
  TakedownRequestInput,
} from "@/lib/api/types";

function makeUrl(path: string): string {
  const isBrowser = typeof window !== "undefined";
  return isBrowser ? path : `${API_BASE}${path}`;
}

export async function submitTakedownRequest(input: TakedownRequestInput): Promise<{ requestId: number }> {
  return requestJson<{ requestId: number }>(makeUrl("/api/takedown"), {
    method: "POST",
    body: input,
  });
}

export type AdminTakedownFilter = {
  pending?: boolean;
  sourceId?: number;
  recentDays?: number;
  page?: number;
  pageSize?: number;
};

export async function listTakedownAdmin(
  filter: AdminTakedownFilter = {},
  accessToken?: string,
): Promise<TakedownRequestAdmin[]> {
  const url = new URL(
    makeUrl("/api/admin/takedown"),
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (filter.pending) url.searchParams.set("pending", "true");
  if (filter.sourceId) url.searchParams.set("sourceId", String(filter.sourceId));
  if (filter.recentDays) url.searchParams.set("recentDays", String(filter.recentDays));
  if (filter.page) url.searchParams.set("page", String(filter.page));
  if (filter.pageSize) url.searchParams.set("pageSize", String(filter.pageSize));
  return requestJson<TakedownRequestAdmin[]>(url.toString(), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}

export async function getTakedownAdmin(id: number, accessToken?: string): Promise<TakedownRequestAdmin> {
  return requestJson<TakedownRequestAdmin>(makeUrl(`/api/admin/takedown/${id}`), {
    method: "GET",
    cache: "no-store",
    accessToken,
    credentials: "include",
  });
}

export async function patchTakedownAdmin(
  id: number,
  body: TakedownRequestAdminUpdate,
  accessToken?: string,
): Promise<void> {
  await requestVoid(makeUrl(`/api/admin/takedown/${id}`), {
    method: "PATCH",
    accessToken,
    credentials: "include",
    body,
  });
}
