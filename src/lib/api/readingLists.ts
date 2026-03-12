// src/lib/api/readingLists.ts
import { requestJson, requestVoid } from "@/lib/api/request";
import type {
  ReadingList,
  ReadingListItemsPage,
  ReadingListPage,
  ReadingListVisibility,
} from "./types";

export type { ReadingListPage, ReadingListItemsPage };

function buildPageQuery(limit: number, cursor: string | null, expand?: string): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (expand) {
    params.set("expand", expand);
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  return params.toString();
}

// ---------- CREATE LIST ----------

export type CreateReadingListPayload = {
  name: string;
  description?: string;
  visibility?: ReadingListVisibility;
  allowCollaboration?: boolean;
};

export async function createReadingList(
  body: CreateReadingListPayload,
  accessToken: string
): Promise<{ id: number }> {
  return requestJson<{ id: number }>(`/api/reading-lists`, {
    method: "POST",
    body,
    accessToken,
  });
}

// ---------- DELETE LIST ----------

export async function deleteReadingList(
  readingListId: number,
  accessToken: string
): Promise<void> {
  await requestVoid(`/api/reading-lists/${readingListId}`, {
    method: "DELETE",
    accessToken,
  });
}

// ---------- "MY" LISTS (AUTH) ----------
// GET /api/reading-lists/mine?limit=&cursor=

export async function getMyReadingListsPage(
  accessToken: string,
  cursor: string | null,
  limit: number
): Promise<ReadingListPage> {
  return requestJson<ReadingListPage>(
    `/api/reading-lists/mine?${buildPageQuery(limit, cursor)}`,
    {
      method: "GET",
      accessToken,
    }
  );
}

// ---------- ADD ITEM TO LIST (AUTH) ----------
// POST /api/reading-lists/{readingListId}/items

export type AddItemPayload = {
  articleId: number;
  note?: string;
};

export async function addItemToReadingList(
  readingListId: number,
  body: AddItemPayload,
  accessToken: string
): Promise<void> {
  await requestVoid(`/api/reading-lists/${readingListId}/items`, {
    method: "POST",
    body,
    accessToken,
  });
}

// ---------- REMOVE ITEM FROM LIST (AUTH) ----------
// DELETE /api/reading-lists/{readingListId}/items/{articleId}

export async function removeItemFromReadingList(
  readingListId: number,
  articleId: number,
  accessToken: string
): Promise<void> {
  await requestVoid(`/api/reading-lists/${readingListId}/items/${articleId}`, {
    method: "DELETE",
    accessToken,
  });
}


// ---------- ITEMS (AUTH VIEW) ----------
// GET /api/reading-lists/{readingListId}/items?expand=article&limit=&cursor=

export async function getReadingListItemsPage(
  readingListId: number,
  accessToken: string,
  cursor: string | null,
  limit: number
): Promise<ReadingListItemsPage> {
  return requestJson<ReadingListItemsPage>(
    `/api/reading-lists/${readingListId}/items?${buildPageQuery(limit, cursor, "article")}`,
    {
      method: "GET",
      accessToken,
    }
  );
}

// ---------- PUBLIC METADATA ----------
// GET /api/reading-lists/public/users/{ownerUserId}/{slug}

export async function getPublicReadingList(
  ownerUserId: string,
  slug: string
): Promise<ReadingList> {
  return requestJson<ReadingList>(
    `/api/reading-lists/public/users/${ownerUserId}/${encodeURIComponent(slug)}`,
    {
      method: "GET",
    }
  );
}

// ---------- PUBLIC ITEMS ----------
// GET /api/reading-lists/public/{readingListId}/items?limit=&cursor=

export async function getPublicReadingListItemsPage(
  readingListId: number,
  cursor: string | null,
  limit: number
): Promise<ReadingListItemsPage> {
  return requestJson<ReadingListItemsPage>(
    `/api/reading-lists/public/${readingListId}/items?${buildPageQuery(limit, cursor)}`,
    {
      method: "GET",
    }
  );
}
