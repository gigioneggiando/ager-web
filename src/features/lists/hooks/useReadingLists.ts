"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useSession } from "@/lib/auth/session";
import {
  getMyReadingListsPage,
  getReadingListItemsPage,
  createReadingList,
  addItemToReadingList,
  removeItemFromReadingList,
  deleteReadingList,
  type ReadingListPage,
  type ReadingListItemsPage,
} from "@/lib/api/readingLists";
import type { ReadingListItem, ReadingList } from "@/lib/api/types";

const listQueryKeys = {
  root: () => ["lists"] as const,
  all: () => ["lists", "all"] as const,
  mine: (limit: number) => ["lists", "mine", limit] as const,
  itemsSingle: (listId: number) => ["lists", listId, "items", "single"] as const,
  items: (listId: number) => ["lists", listId, "items"] as const,
};

function invalidateListQueries(queryClient: ReturnType<typeof useQueryClient>, listId?: number) {
  if (typeof listId === "number") {
    queryClient.invalidateQueries({ queryKey: listQueryKeys.items(listId) });
  }

  queryClient.invalidateQueries({ queryKey: listQueryKeys.root() });
  queryClient.invalidateQueries({ queryKey: listQueryKeys.all() });
}

function requireAccessToken(accessToken: string | null): string {
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  return accessToken;
}

/**
 * Non-paged lists, used e.g. in AddToListDialog.
 * (Internally we just fetch one big page.)
 */
export function useMyLists() {
  const { accessToken } = useSession();

  return useQuery<ReadingList[]>({
    queryKey: listQueryKeys.all(),
    enabled: !!accessToken,
    queryFn: async () => {
      if (!accessToken) return [];
      const page = await getMyReadingListsPage(accessToken, null, 100);
      return page.items;
    },
  });
}

/**
 * Paged lists for the Lists index page.
 *
 * Keeps the same signature: useMyListsInfinite(limit = 20)
 */
export function useMyListsInfinite(limit = 20) {
  const { accessToken } = useSession();

  return useInfiniteQuery<ReadingListPage, Error>({
    queryKey: listQueryKeys.mine(limit),
    enabled: !!accessToken,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!accessToken) {
        return { items: [], nextCursor: null };
      }
      return getMyReadingListsPage(
        accessToken,
        (pageParam as string | null) ?? null,
        limit
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Simple non-paged items (if you need it somewhere else).
 * (Internally: first page with big limit.)
 */
export function useListItems(listId: number) {
  const { accessToken } = useSession();

  return useQuery<ReadingListItem[]>({
    queryKey: listQueryKeys.itemsSingle(listId),
    enabled: !!accessToken && !!listId,
    queryFn: async () => {
      if (!accessToken) return [];
      const page = await getReadingListItemsPage(
        listId,
        accessToken,
        null,
        100
      );
      return page.items;
    },
  });
}

/**
 * Paged items for the list detail page.
 *
 * Keeps the same signature: useListItemsInfinite(listId, limit = 20)
 */
export function useListItemsInfinite(listId: number, limit = 20) {
  const { accessToken } = useSession();

  return useInfiniteQuery<ReadingListItemsPage, Error>({
    queryKey: listQueryKeys.items(listId),
    enabled: !!accessToken && !!listId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!accessToken) {
        return { items: [], nextCursor: null };
      }
      return getReadingListItemsPage(
        listId,
        accessToken,
        (pageParam as string | null) ?? null,
        limit
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Create a new list.
 *
 * Old signature: body { name, description?, isPublic? }
 * We now map isPublic → visibility ("Public"/"Private").
 */
export function useCreateList() {
  const { accessToken } = useSession();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string | null;
      isPublic?: boolean;
    }) => {
      const token = requireAccessToken(accessToken);

      // 0 = Private, 2 = Public
      const visibility: 0 | 2 = body.isPublic ? 2 : 0;

      return createReadingList(
        {
          name: body.name,
          description: body.description ?? undefined,
          visibility,
          allowCollaboration: false,
        },
        token
      );
    },
    onSuccess: () => {
      invalidateListQueries(qc);
    },
  });
}

/**
 * Add an article to a list.
 */
export function useAddToList() {
  const { accessToken } = useSession();
  const qc = useQueryClient();

  return useMutation({
    // Now we accept readingListId + articleId + optional note
    mutationFn: async (args: {
      readingListId: number;
      articleId: number;
      note?: string;
    }) => {
      const token = requireAccessToken(accessToken);
      await addItemToReadingList(
        args.readingListId,
        {
          articleId: args.articleId,
          note: args.note,
        },
        token
      );
    },
    onSuccess: (_data, vars) => {
      invalidateListQueries(qc, vars.readingListId);
    },
  });
}

/**
 * Remove an article from a list (by articleId).
 */
export function useRemoveFromList(readingListId: number) {
  const { accessToken } = useSession();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: number) => {
      await removeItemFromReadingList(readingListId, articleId, requireAccessToken(accessToken));
    },
    onSuccess: () => {
      invalidateListQueries(qc, readingListId);
    },
  });
}

/**
 * Delete a whole list.
 */
export function useDeleteList() {
  const { accessToken } = useSession();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (listId: number) => {
      await deleteReadingList(listId, requireAccessToken(accessToken));
    },
    onSuccess: () => {
      invalidateListQueries(qc);
    },
  });
}
