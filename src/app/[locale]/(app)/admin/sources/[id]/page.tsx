"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/session";
import {
  getSourceAdmin,
  patchSourceAdmin,
  refreshTosSnapshot,
} from "@/lib/api/sources";
import type {
  LicensingStatus,
  NegotiationStatus,
  SourceAdminUpdate,
} from "@/lib/api/types";
import LicensingStatusBadge from "@/features/admin/components/LicensingStatusBadge";
import { toast } from "sonner";

const LICENSING_VALUES: LicensingStatus[] = [
  "licensed_direct",
  "licensed_via_agency",
  "rss_permissive",
  "rss_silent",
  "rss_restrictive",
  "no_agreement_linking_only",
  "opted_out",
];

const NEGOTIATION_VALUES: NegotiationStatus[] = [
  "none",
  "initiated",
  "in_progress",
  "agreed",
  "declined",
];

export default function AdminSourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sourceId = Number(id);
  const { accessToken } = useSession();
  const qc = useQueryClient();

  const { data: source, isLoading, isError } = useQuery({
    queryKey: ["adminSource", sourceId],
    queryFn: () => getSourceAdmin(sourceId, accessToken ?? undefined),
    enabled: !!accessToken && Number.isFinite(sourceId),
  });

  const mutation = useMutation({
    mutationFn: (body: SourceAdminUpdate) => patchSourceAdmin(sourceId, body, accessToken ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminSource", sourceId] });
      qc.invalidateQueries({ queryKey: ["adminSources"] });
      toast.success("Source updated");
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const refresh = useMutation({
    mutationFn: () => refreshTosSnapshot(sourceId, accessToken ?? undefined),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["adminSource", sourceId] });
      toast.success(r.changed ? "ToS hash changed — review required" : "ToS hash unchanged");
    },
    onError: (e: Error) => toast.error(e.message || "ToS refresh failed"),
  });

  const [licensing, setLicensing] = useState<LicensingStatus | "">("");
  const [negotiation, setNegotiation] = useState<NegotiationStatus | "">("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [hotlink, setHotlink] = useState<boolean | null>(null);

  if (!accessToken) return <div className="rounded-md border p-4 text-sm">Admin access required.</div>;
  if (isLoading) return <div className="rounded-md border p-4 text-sm">Loading…</div>;
  if (isError || !source) return <div className="rounded-md border p-4 text-sm">Source not found.</div>;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: SourceAdminUpdate = {};
    if (licensing) body.licensingStatus = licensing;
    if (negotiation) body.negotiationStatus = negotiation;
    if (email.length > 0) body.publisherContactEmail = email;
    if (notes.length > 0) body.notes = notes;
    if (hotlink !== null) body.imageHotlinkAllowed = hotlink;
    mutation.mutate(body);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-medium">{source.name}</h2>
        <LicensingStatusBadge status={source.licensingStatus} />
        <span className="text-xs text-muted-foreground">{source.url}</span>
      </div>

      <section className="rounded-md border p-4 text-sm">
        <div className="mb-2 font-medium">ToS snapshot</div>
        <div className="text-xs text-muted-foreground">
          URL: {source.tosUrl ?? "—"}<br />
          Last checked: {source.tosLastCheckedAt ?? "—"}<br />
          Hash: <code className="font-mono">{source.tosHashLast ?? "—"}</code>
        </div>
        <button
          className="mt-3 rounded-md border px-3 py-1 text-xs disabled:opacity-50"
          disabled={!source.tosUrl || refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? "Refreshing…" : "Refresh snapshot"}
        </button>
      </section>

      <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-4 text-sm">
        <div className="font-medium">Governance</div>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Licensing status</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-1"
            value={licensing}
            onChange={(e) => setLicensing(e.target.value as LicensingStatus)}
          >
            <option value="">— keep current ({source.licensingStatus}) —</option>
            {LICENSING_VALUES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Negotiation status</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-1"
            value={negotiation}
            onChange={(e) => setNegotiation(e.target.value as NegotiationStatus)}
          >
            <option value="">— keep current ({source.negotiationStatus}) —</option>
            {NEGOTIATION_VALUES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Publisher contact email</span>
          <input
            type="email"
            className="w-full rounded-md border bg-background px-2 py-1"
            defaultValue={source.publisherContactEmail ?? ""}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Notes</span>
          <textarea
            className="w-full rounded-md border bg-background px-2 py-1"
            rows={4}
            defaultValue={source.notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={source.imageHotlinkAllowed}
            onChange={(e) => setHotlink(e.target.checked)}
          />
          <span className="text-xs">Allow image hotlinking</span>
        </label>

        <div>
          <button
            type="submit"
            className="rounded-md border bg-foreground px-3 py-1 text-xs text-background disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
