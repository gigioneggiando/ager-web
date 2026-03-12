"use client";

import { useState } from "react";
import { useCreateList } from "@/features/lists/hooks/useReadingLists";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function CreateListDialog() {
  const t = useTranslations("lists.createDialog");
  const common = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  const create = useCreateList();

  function resetForm() {
    setName("");
    setDescription("");
    setVisibility("private");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast(t("nameRequiredTitle"), {
        description: t("nameRequiredDescription"),
      });
      return;
    }

    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        isPublic: visibility === "public",
      },
      {
        onSuccess: () => {
          toast(t("created"), {
            description:
              visibility === "public"
                ? t("createdPublic")
                : t("createdPrivate"),
          });
          resetForm();
          setOpen(false);
        },
        onError: (e: any) => {
          toast(t("errorTitle"), {
            description:
              e?.message ?? t("createFailed"),
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm">{t("trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="list-name">
              {t("nameLabel")}
            </label>
            <Input
              id="list-name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="list-desc">
              {t("descriptionLabel")}
            </label>
            <Textarea
              id="list-desc"
              rows={3}
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">{t("visibilityLabel")}</span>
            <p className="text-xs text-muted-foreground">
              {t("visibilityHint")}
            </p>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                variant={visibility === "private" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisibility("private")}
              >
                {t("private")}
              </Button>
              <Button
                type="button"
                variant={visibility === "public" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisibility("public")}
              >
                {t("public")}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {common("cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {t("create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
