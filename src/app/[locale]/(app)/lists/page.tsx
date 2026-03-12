"use client";

import { useMyListsInfinite, useDeleteList } from "@/features/lists/hooks/useReadingLists";
import CreateListDialog from "@/features/lists/components/CreateListDialog";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReadingList } from "@/lib/api/types";
import type { InfiniteData } from "@tanstack/react-query";
import type { ReadingListPage } from "@/lib/api/readingLists";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppLocale } from "@/i18n/useAppLocale";

export default function ListsIndexPage() {
  const t = useTranslations("lists.page");
  const { locale } = useAppLocale();

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMyListsInfinite(20);

  const deleteList = useDeleteList();

  function visibilityLabel(
    visibility: 0 | 1 | 2 | undefined,
  ) {
    if (visibility === 2) return t("visibility.public");
    if (visibility === 1) return t("visibility.shared");
    return t("visibility.private");
  }

  const pages =
    (data as InfiniteData<ReadingListPage> | undefined)?.pages ?? [];
  const lists: ReadingList[] = pages.flatMap((page) => page.items ?? []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <CreateListDialog />
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">
          {t("loading")}
        </div>
      )}

      {isError && (
        <div className="text-sm text-destructive">
          {t("loadError")}
        </div>
      )}

      {!isLoading && !isError && lists.length === 0 && (
        <div className="rounded border p-3 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      )}

      {lists.length > 0 && (
        <ul className="divide-y rounded border">
          {lists.map((l) => (
            <li key={l.id} className="relative flex items-center gap-3 p-3">
              {/* Full-row link overlay (keeps delete button clickable) */}
              <Link
                href={`/${locale}/lists/${l.id}`}
                aria-label={t("openListAriaLabel", { name: l.name })}
                className="absolute inset-0 z-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              {/* Left: name + visibility (pointer events pass through to overlay) */}
              <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
                <span className="truncate font-medium">{l.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {visibilityLabel(l.visibility as 0 | 1 | 2 | undefined)}
                </span>
              </div>

              {/* Right side: count + delete */}
              <div className="relative z-10 ml-auto flex items-center gap-2">
                {l.itemsCount != null && (
                  <span className="pointer-events-none text-xs text-muted-foreground">
                    {t("itemsCount", { count: l.itemsCount })}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (!confirm(t("deleteConfirm"))) {
                      return;
                    }
                    deleteList.mutate(l.id, {
                      onSuccess: () => {
                        toast(t("deleted"));
                      },
                      onError: (e: any) => {
                        toast(t("errorTitle"), {
                          description:
                            e?.message ?? t("deleteFailed"),
                        });
                      },
                    });
                  }}
                  aria-label={t("deleteAriaLabel")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage
              ? t("loading")
              : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
