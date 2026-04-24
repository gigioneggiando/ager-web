"use client";

import type { LicensingStatus } from "@/lib/api/types";

const STYLES: Record<LicensingStatus, { label: string; className: string }> = {
  licensed_direct: {
    label: "Licensed (direct)",
    className: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  licensed_via_agency: {
    label: "Licensed (agency)",
    className: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  rss_permissive: {
    label: "RSS permissive",
    className: "bg-sky-100 text-sky-900 border-sky-300",
  },
  rss_silent: {
    label: "RSS silent",
    className: "bg-slate-100 text-slate-900 border-slate-300",
  },
  rss_restrictive: {
    label: "RSS restrictive",
    className: "bg-amber-100 text-amber-900 border-amber-300",
  },
  no_agreement_linking_only: {
    label: "No agreement — link only",
    className: "bg-zinc-100 text-zinc-900 border-zinc-300",
  },
  opted_out: {
    label: "Opted out",
    className: "bg-red-100 text-red-900 border-red-300",
  },
};

export default function LicensingStatusBadge({ status }: { status: LicensingStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${s.className}`}
      title={status}
    >
      {s.label}
    </span>
  );
}
