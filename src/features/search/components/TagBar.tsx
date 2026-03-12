"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export type TagBarTag = {
  slug: string;
  name: string;
};

export default function TagBar(props: {
  tags: TagBarTag[];
  selectedTag: string | null;
  hrefForTag: (slug: string | null) => string;
  loading?: boolean;
  showFallbackNote?: boolean;
}) {
  const t = useTranslations("search.tagBar");
  const { tags, selectedTag, hrefForTag, loading, showFallbackNote } = props;

  const selectedName = selectedTag ? tags.find((t) => t.slug === selectedTag)?.name ?? selectedTag : null;

  return (
    <div className="mt-4 max-w-full overflow-hidden">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {t("title")}
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground">
            {t("loading")}
          </div>
        ) : null}
      </div>

      {selectedTag ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full max-w-[18rem] justify-between rounded-full gap-2"
              aria-label={t("selectedTagAriaLabel", { name: selectedName ?? "" })}
            >
              <span className="truncate max-w-[14rem]">{selectedName}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className="w-[min(22rem,calc(100vw-2rem))] min-w-0 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto"
          >
            {tags.map((t) => {
              const selected = selectedTag === t.slug;
              return (
                <DropdownMenuItem key={t.slug} asChild className="max-w-full whitespace-normal break-words">
                  <Link href={hrefForTag(t.slug)} aria-current={selected ? "page" : undefined} className="block max-w-full whitespace-normal break-words">
                    {t.name}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex max-w-full flex-wrap gap-2">
          {tags.map((t) => {
            const selected = selectedTag === t.slug;
            return (
              <Badge
                key={t.slug}
                asChild
                variant={selected ? "default" : "secondary"}
                className="max-w-full rounded-full"
              >
                <Link href={hrefForTag(t.slug)} aria-current={selected ? "page" : undefined} className="truncate">
                  {t.name}
                </Link>
              </Badge>
            );
          })}
        </div>
      )}

      {showFallbackNote ? (
        <div className="mt-2 text-xs text-muted-foreground">
          {t("fallbackNote")}
        </div>
      ) : null}
    </div>
  );
}
