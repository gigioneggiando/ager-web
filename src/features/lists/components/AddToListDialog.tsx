"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useMyLists,
  useAddToList,
} from "@/features/lists/hooks/useReadingLists";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ReadingList } from "@/lib/api/types";

const LAST_LIST_KEY = "ager:lastListId";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: number;
  articleTitle: string;
};

export default function AddToListDialog({
  open,
  onOpenChange,
  articleId,
  articleTitle,
}: Props) {
  const action = useTranslations("action");
  const t = useTranslations("lists.addDialog");
  const common = useTranslations("common");

  const { data: lists, isLoading, isError } = useMyLists();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // Preselect last used list when dialog opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(LAST_LIST_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) setSelectedId(n);
      }
    } catch {
      // ignore
    }
  }, [open]);

  const typedLists = lists as ReadingList[] | undefined;

  const targetList = useMemo(
    () => typedLists?.find((l) => l.id === selectedId) ?? null,
    [typedLists, selectedId]
  );

  // Current hook signature: mutate({ readingListId, articleId, note? })
  const addMutation = useAddToList();

  function handleSave() {
    if (!selectedId) {
      toast(t("selectListTitle"), {
        description: t("selectListDescription"),
      });
      return;
    }

    const trimmedNote = note.trim();

    addMutation.mutate(
      {
        readingListId: selectedId,
        articleId,
        note: trimmedNote.length > 0 ? trimmedNote : undefined,
      },
      {
        onSuccess: () => {
          localStorage.setItem(LAST_LIST_KEY, String(selectedId));
          toast(t("saved"), {
            description: targetList
              ? t("savedInList", { name: targetList.name })
              : t("savedGeneric"),
          });
          setNote("");
          onOpenChange(false);
        },
        onError: (e: any) => {
          toast(t("errorTitle"), {
            description:
              e?.message ?? t("saveFailed"),
          });
        },
      }
    );
  }

  const hasLists = !!typedLists && typedLists.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="mt-1">
            {t("description")}
            <br />
            <span className="font-medium">{articleTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("loading")}
          </p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            {t("loadError")}
          </p>
        )}

        {!isLoading && !isError && !hasLists && (
          <p className="text-sm text-muted-foreground">
            {t("empty")}
          </p>
        )}

        {hasLists && (
          <>
            {/* Select list */}
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium" htmlFor="list-select">
                {t("listLabel")}
              </label>
              <select
                id="list-select"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedId ? String(selectedId) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedId(v ? Number(v) : null);
                }}
              >
                <option value="">{t("selectList")}</option>
                {typedLists!.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.itemsCount != null
                      ? ` ${t("itemsCount", { count: l.itemsCount })}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional note */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium" htmlFor="note-textarea">
                {t("noteLabel")}
              </label>
              <Textarea
                id="note-textarea"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {common("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={addMutation.isPending || !hasLists}
          >
            {addMutation.isPending ? t("saving") : action("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
