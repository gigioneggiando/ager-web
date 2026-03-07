"use client";

import Link from "next/link";
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
  locale: "it" | "en";
  tags: TagBarTag[];
  selectedTag: string | null;
  hrefForTag: (slug: string | null) => string;
  loading?: boolean;
  showFallbackNote?: boolean;
}) {
  const { locale, tags, selectedTag, hrefForTag, loading, showFallbackNote } = props;

  const selectedName = selectedTag ? tags.find((t) => t.slug === selectedTag)?.name ?? selectedTag : null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {locale === "it" ? "Tag" : "Tags"}
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground">
            {locale === "it" ? "Caricamento…" : "Loading…"}
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
              className="max-w-full rounded-full gap-2"
              aria-label={
                locale === "it"
                  ? `Tag selezionato: ${selectedName}. Cambia tag.`
                  : `Selected tag: ${selectedName}. Change tag.`
              }
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
            className="w-[calc(100vw-2rem)] min-w-0 max-w-sm max-h-[min(20rem,calc(100vh-7rem))] sm:w-[min(22rem,calc(100vw-2rem))] sm:max-w-[calc(100vw-2rem)]"
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
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const selected = selectedTag === t.slug;
            return (
              <Badge
                key={t.slug}
                asChild
                variant={selected ? "default" : "secondary"}
                className="rounded-full"
              >
                <Link href={hrefForTag(t.slug)} aria-current={selected ? "page" : undefined}>
                  {t.name}
                </Link>
              </Badge>
            );
          })}
        </div>
      )}

      {showFallbackNote ? (
        <div className="mt-2 text-xs text-muted-foreground">
          {locale === "it"
            ? "Impossibile caricare i tag dal server: mostro un set minimo."
            : "Could not load tags from server: showing a minimal set."}
        </div>
      ) : null}
    </div>
  );
}
