"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { listSourcesAdmin } from "@/lib/api/sources";
import { useSession } from "@/lib/auth/session";
import LicensingStatusBadge from "@/features/admin/components/LicensingStatusBadge";
import { useAppLocale } from "@/i18n/useAppLocale";

export default function AdminSourcesPage() {
  const { accessToken } = useSession();
  const { locale } = useAppLocale();
  const sp = useSearchParams();
  const expiringIn = sp.get("expiringIn");
  const tdmOptout = sp.get("tdmOptout") === "true";
  const negotiation = sp.get("negotiation") === "in_progress" ? "in_progress" as const : undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adminSources", { expiringIn, tdmOptout, negotiation }],
    queryFn: () => listSourcesAdmin(
      {
        expiringIn: expiringIn ? Number(expiringIn) : undefined,
        tdmOptout,
        negotiation,
      },
      accessToken ?? undefined,
    ),
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  if (!accessToken) {
    return <div className="rounded-md border p-4 text-sm">Admin access required.</div>;
  }
  if (isLoading) {
    return <div className="rounded-md border p-4 text-sm">Loading…</div>;
  }
  if (isError) {
    return (
      <div className="rounded-md border p-4 text-sm">
        <div className="font-medium">Failed to load sources</div>
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
      <div className="flex flex-wrap gap-2 text-xs">
        <FilterLink label="All" href={`/${locale}/admin/sources`} active={!expiringIn && !tdmOptout && !negotiation} />
        <FilterLink label="Licenses expiring (30d)" href={`/${locale}/admin/sources?expiringIn=30`} active={!!expiringIn} />
        <FilterLink label="TDM opt-out" href={`/${locale}/admin/sources?tdmOptout=true`} active={tdmOptout} />
        <FilterLink label="Negotiation in progress" href={`/${locale}/admin/sources?negotiation=in_progress`} active={!!negotiation} />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Licensing</th>
              <th className="px-3 py-2 text-left">Negotiation</th>
              <th className="px-3 py-2 text-left">TDM opt-out</th>
              <th className="px-3 py-2 text-left">License expires</th>
              <th className="px-3 py-2 text-left">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>No sources match.</td>
              </tr>
            )}
            {items.map((s) => (
              <tr key={s.sourceId} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/${locale}/admin/sources/${s.sourceId}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{s.url}</div>
                </td>
                <td className="px-3 py-2"><LicensingStatusBadge status={s.licensingStatus} /></td>
                <td className="px-3 py-2 text-xs">{s.negotiationStatus}</td>
                <td className="px-3 py-2 text-xs">
                  {s.tdmOptoutPresent ? (s.tdmOptoutMechanism ?? "yes") : "no"}
                </td>
                <td className="px-3 py-2 text-xs">{s.licenseExpiresAt ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{s.enabled ? "yes" : "no"}</td>
              </tr>
            ))}
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
