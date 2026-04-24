"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/session";
import { useAppLocale } from "@/i18n/useAppLocale";
import { getIngestionLogStats, listIngestionLogAdmin } from "@/lib/api/ingestionLog";
import IngestionLogChart from "@/features/admin/components/IngestionLogChart";

export default function AdminIngestionLogPage() {
  const { accessToken } = useSession();
  const { locale } = useAppLocale();
  const sp = useSearchParams();
  const errorsOnly = sp.get("errorsOnly") === "true";

  const logs = useQuery({
    queryKey: ["adminIngestionLog", { errorsOnly }],
    queryFn: () => listIngestionLogAdmin({ errorsOnly, pageSize: 50 }, accessToken ?? undefined),
    enabled: !!accessToken,
    staleTime: 20_000,
  });

  const stats = useQuery({
    queryKey: ["adminIngestionLogStats", 14],
    queryFn: () => getIngestionLogStats(14, accessToken ?? undefined),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  if (!accessToken) {
    return <div className="rounded-md border p-4 text-sm">Admin access required.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Ingestion log</h2>

      {stats.data && <IngestionLogChart stats={stats.data} />}

      <div className="flex flex-wrap gap-2 text-xs">
        <FilterLink label="All runs" href={`/${locale}/admin/ingestion-log`} active={!errorsOnly} />
        <FilterLink
          label="With errors (7d)"
          href={`/${locale}/admin/ingestion-log?errorsOnly=true`}
          active={errorsOnly}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Fetched</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-right">Ingested</th>
              <th className="px-3 py-2 text-right">Skipped</th>
              <th className="px-3 py-2 text-left">TDM opt-out</th>
              <th className="px-3 py-2 text-left">Errors</th>
            </tr>
          </thead>
          <tbody>
            {logs.isLoading && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {logs.isError && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                  Failed to load.
                </td>
              </tr>
            )}
            {logs.data?.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                  —
                </td>
              </tr>
            )}
            {logs.data?.map((r) => (
              <tr key={r.logId} className="border-t">
                <td className="px-3 py-2 text-xs">{new Date(r.fetchedAt).toLocaleString(locale)}</td>
                <td className="px-3 py-2 text-xs">
                  #{r.sourceId}
                  {r.sourceName ? ` — ${r.sourceName}` : ""}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{r.articlesIngested}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{r.articlesSkipped}</td>
                <td className="px-3 py-2 text-xs">
                  {r.tdmrepJsonPresent ? (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-900">
                      tdmrep present
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-xs text-red-900" title={r.errors ?? ""}>
                  {r.errors || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        <code>robots_txt_hash</code> / <code>tdmrep_json_hash</code> / <code>ai_txt_hash</code> are SHA-256 snapshots
        captured at fetch time; they are the forensic evidence layer for DSA / AI Act disputes and are only displayed on
        the detail view.
      </p>
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
