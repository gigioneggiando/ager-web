"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { listTakedownAdmin } from "@/lib/api/takedown";
import { useSession } from "@/lib/auth/session";
import { useAppLocale } from "@/i18n/useAppLocale";

export default function AdminTakedownPage() {
  const { accessToken } = useSession();
  const { locale } = useAppLocale();
  const sp = useSearchParams();
  const t = useTranslations("takedown.admin");

  const mode = sp.get("mode"); // "pending" | "recent" | null

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adminTakedown", { mode }],
    queryFn: () =>
      listTakedownAdmin(
        {
          pending: mode === "pending",
          recentDays: mode === "recent" ? 30 : undefined,
        },
        accessToken ?? undefined,
      ),
    enabled: !!accessToken,
    staleTime: 20_000,
  });

  if (!accessToken) {
    return <div className="rounded-md border p-4 text-sm">Admin access required.</div>;
  }
  if (isLoading) return <div className="rounded-md border p-4 text-sm">Loading…</div>;
  if (isError) {
    return (
      <div className="rounded-md border p-4 text-sm">
        <div className="font-medium">Failed to load takedown requests</div>
        <div className="text-muted-foreground">{(error as Error).message}</div>
        <button className="mt-2 rounded-md border px-3 py-1 text-sm" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">{t("heading")}</h2>

      <div className="flex flex-wrap gap-2 text-xs">
        <FilterLink label={t("filterAll")} href={`/${locale}/admin/takedown`} active={mode === null} />
        <FilterLink
          label={t("filterPending")}
          href={`/${locale}/admin/takedown?mode=pending`}
          active={mode === "pending"}
        />
        <FilterLink
          label={t("filterRecent")}
          href={`/${locale}/admin/takedown?mode=recent`}
          active={mode === "recent"}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("columns.received")}</th>
              <th className="px-3 py-2 text-left">{t("columns.target")}</th>
              <th className="px-3 py-2 text-left">{t("columns.requester")}</th>
              <th className="px-3 py-2 text-left">{t("columns.status")}</th>
              <th className="px-3 py-2 text-left">{t("columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                  —
                </td>
              </tr>
            )}
            {items.map((r) => {
              const target = r.articleId
                ? `article #${r.articleId}${r.articleTitle ? ` — ${r.articleTitle}` : ""}`
                : r.sourceId
                  ? `source #${r.sourceId}${r.sourceName ? ` — ${r.sourceName}` : ""}`
                  : "—";
              return (
                <tr key={r.requestId} className="border-t">
                  <td className="px-3 py-2 text-xs">{new Date(r.receivedAt).toLocaleString(locale)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/${locale}/admin/takedown/${r.requestId}`} className="font-medium hover:underline">
                      {target}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.requesterEmail} <span className="text-muted-foreground">({r.requesterRole})</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.isPending ? t("pending") : t("resolved")}</td>
                  <td className="px-3 py-2 text-xs">{r.actionTaken}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${active ? "bg-foreground text-background" : "hover:bg-muted"}`}
    >
      {label}
    </Link>
  );
}
