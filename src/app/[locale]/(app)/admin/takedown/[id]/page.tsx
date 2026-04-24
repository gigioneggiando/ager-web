"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session";
import { getTakedownAdmin, patchTakedownAdmin } from "@/lib/api/takedown";
import type { TakedownAction } from "@/lib/api/types";

const ACTIONS: { value: TakedownAction; labelKey: string }[] = [
  { value: "removed", labelKey: "markRemoved" },
  { value: "disputed", labelKey: "markDisputed" },
  { value: "referred", labelKey: "markReferred" },
  { value: "none", labelKey: "markNone" },
];

export default function AdminTakedownDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const requestId = Number(id);
  const { accessToken } = useSession();
  const qc = useQueryClient();
  const t = useTranslations("takedown.admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminTakedown", requestId],
    queryFn: () => getTakedownAdmin(requestId, accessToken ?? undefined),
    enabled: !!accessToken && Number.isFinite(requestId),
  });

  const [selected, setSelected] = useState<TakedownAction | null>(null);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (action: TakedownAction) =>
      patchTakedownAdmin(requestId, { actionTaken: action, responseNotes: notes || null }, accessToken ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminTakedown", requestId] });
      qc.invalidateQueries({ queryKey: ["adminTakedown"] });
      toast.success(t("saved"));
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message || t("saveFailed")),
  });

  if (!accessToken) return <div className="rounded-md border p-4 text-sm">Admin access required.</div>;
  if (isLoading) return <div className="rounded-md border p-4 text-sm">Loading…</div>;
  if (isError || !data) return <div className="rounded-md border p-4 text-sm">Not found.</div>;

  const target = data.articleId
    ? `article #${data.articleId}${data.articleTitle ? ` — ${data.articleTitle}` : ""}`
    : data.sourceId
      ? `source #${data.sourceId}${data.sourceName ? ` — ${data.sourceName}` : ""}`
      : "—";

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h2 className="text-lg font-medium">
          Request #{data.requestId}
          {data.isPending ? (
            <span className="ml-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
              {t("pending")}
            </span>
          ) : (
            <span className="ml-2 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900">
              {t("resolved")} — {data.actionTaken}
            </span>
          )}
        </h2>
        <div className="mt-2 text-xs text-muted-foreground">
          Received {new Date(data.receivedAt).toLocaleString()}
          {data.respondedAt && ` — Responded ${new Date(data.respondedAt).toLocaleString()}`}
        </div>
      </div>

      <section className="rounded-md border p-4">
        <div className="text-xs text-muted-foreground">Target</div>
        <div className="mt-1 font-medium">{target}</div>
        {data.articleUrl && (
          <a className="mt-1 block text-xs text-muted-foreground hover:underline" href={data.articleUrl} target="_blank" rel="noreferrer">
            {data.articleUrl}
          </a>
        )}
        {data.articleTakedownStatus && (
          <div className="mt-1 text-xs">Article status: <code>{data.articleTakedownStatus}</code></div>
        )}
        {data.sourceLicensingStatus && (
          <div className="mt-1 text-xs">Source licensing: <code>{data.sourceLicensingStatus}</code></div>
        )}
      </section>

      <section className="rounded-md border p-4">
        <div className="text-xs text-muted-foreground">Requester</div>
        <div className="mt-1 font-medium">{data.requesterEmail} <span className="text-xs text-muted-foreground">({data.requesterRole})</span></div>
        <div className="mt-3 text-xs text-muted-foreground">Reason</div>
        <blockquote className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
          {data.reason}
        </blockquote>
      </section>

      <section className="rounded-md border p-4">
        <div className="mb-2 font-medium">{t("columns.action")}</div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted-foreground">{t("notesLabel")}</span>
          <textarea
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            rows={4}
            defaultValue={data.responseNotes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              disabled={mutation.isPending}
              className={`rounded-md border px-3 py-1 text-xs disabled:opacity-50 ${
                a.value === "removed" ? "border-red-300 text-red-900 hover:bg-red-50" : "hover:bg-muted"
              }`}
              onClick={() => setSelected(a.value)}
            >
              {t(`actions.${a.labelKey}` as const)}
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs">
            {selected === "removed" && (
              <div className="mb-2 font-medium text-red-900">
                {t("actions.removedWarning")}
              </div>
            )}
            <div className="flex gap-2">
              <button
                className="rounded-md border bg-foreground px-3 py-1 text-xs text-background disabled:opacity-50"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(selected)}
              >
                {mutation.isPending ? t("save") + "…" : t("save")}
              </button>
              <button
                className="rounded-md border px-3 py-1 text-xs"
                disabled={mutation.isPending}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
