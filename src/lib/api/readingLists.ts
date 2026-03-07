// src/lib/api/readingLists.ts
import type {
  ReadingList,
  ReadingListItem,
  ReadingListVisibility,
} from "./types";

// Always return a simple record so TS is happy with fetch headers
function authHeaders(accessToken?: string): Record<string, string> {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

// ---------- EXPORTED PAGE TYPES ----------

export type ReadingListPage = {
  items: ReadingList[];
  nextCursor: string | null;
};

export type ReadingListItemsPage = {
  items: ReadingListItem[];
  nextCursor: string | null;
};

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
  const res = await fetch(`/api/reading-lists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(accessToken),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `POST /api/reading-lists failed: ${res.status}`);
  }

  return res.json();
}

// ---------- DELETE LIST ----------

export async function deleteReadingList(
  readingListId: number,
  accessToken: string
): Promise<void> {
  const res = await fetch(`/api/reading-lists/${readingListId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(accessToken),
    },
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `DELETE /api/reading-lists/${readingListId} failed: ${res.status}`
    );
  }
}

// ---------- "MY" LISTS (AUTH) ----------
// GET /api/reading-lists/mine?limit=&cursor=

export async function getMyReadingListsPage(
  accessToken: string,
  cursor: string | null,
  limit: number
): Promise<ReadingListPage> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `/api/reading-lists/mine?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...authHeaders(accessToken),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `GET /api/reading-lists/mine failed: ${res.status}`
    );
  }

  const data = await res.json();
  return {
    items: data.items as ReadingList[],
    nextCursor: (data.nextCursor ?? null) as string | null,
  };
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
  const res = await fetch(
    `/api/reading-lists/${readingListId}/items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(accessToken),
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok && res.status !== 201) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text ||
        `POST /api/reading-lists/${readingListId}/items failed: ${res.status}`
    );
  }
}

// ---------- REMOVE ITEM FROM LIST (AUTH) ----------
// DELETE /api/reading-lists/{readingListId}/items/{articleId}

export async function removeItemFromReadingList(
  readingListId: number,
  articleId: number,
  accessToken: string
): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  const res = await fetch(
    `/api/reading-lists/${readingListId}/items/${articleId}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `DELETE /api/reading-lists/${readingListId}/items/${articleId} failed: ${res.status}`
    );
  }
}


// ---------- ITEMS (AUTH VIEW) ----------
// GET /api/reading-lists/{readingListId}/items?expand=article&limit=&cursor=

export async function getReadingListItemsPage(
  readingListId: number,
  accessToken: string,
  cursor: string | null,
  limit: number
): Promise<ReadingListItemsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("expand", "article");
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `/api/reading-lists/${readingListId}/items?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...authHeaders(accessToken),
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text ||
        `GET /api/reading-lists/${readingListId}/items failed: ${res.status}`
    );
  }

  const data = await res.json();
  return {
    items: data.items as ReadingListItem[],
    nextCursor: (data.nextCursor ?? null) as string | null,
  };
}

// ---------- PUBLIC METADATA ----------
// GET /api/reading-lists/public/users/{ownerUserId}/{slug}

export async function getPublicReadingList(
  ownerUserId: string,
  slug: string
): Promise<ReadingList> {
  const res = await fetch(
    `/api/reading-lists/public/users/${ownerUserId}/${encodeURIComponent(
      slug
    )}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text ||
        `GET /api/reading-lists/public/users/${ownerUserId}/${slug} failed: ${res.status}`
    );
  }

  return (await res.json()) as ReadingList;
}

// ---------- PUBLIC ITEMS ----------
// GET /api/reading-lists/public/{readingListId}/items?limit=&cursor=

export async function getPublicReadingListItemsPage(
  readingListId: number,
  cursor: string | null,
  limit: number
): Promise<ReadingListItemsPage> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `/api/reading-lists/public/${readingListId}/items?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text ||
        `GET /api/reading-lists/public/${readingListId}/items failed: ${res.status}`
    );
  }

  const data = await res.json();
  return {
    items: data.items as ReadingListItem[],
    nextCursor: (data.nextCursor ?? null) as string | null,
  };
}
