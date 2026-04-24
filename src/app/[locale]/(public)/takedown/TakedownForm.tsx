"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitTakedownRequest } from "@/lib/api/takedown";
import type { RequesterRole } from "@/lib/api/types";

const ROLES: RequesterRole[] = ["publisher", "author", "third_party", "anonymous"];

export default function TakedownForm({ locale }: { locale: "it" | "en" }) {
  const t = useTranslations("takedown.form");

  const [articleId, setArticleId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RequesterRole>("publisher");
  const [reason, setReason] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedArticle = articleId.trim() === "" ? null : Number(articleId);
    const parsedSource = sourceId.trim() === "" ? null : Number(sourceId);
    if (!parsedArticle && !parsedSource) {
      setError(t("errorMissingTarget"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitTakedownRequest({
        articleId: parsedArticle ?? undefined,
        sourceId: parsedSource ?? undefined,
        requesterEmail: email.trim(),
        requesterRole: role,
        reason: reason.trim(),
        honeypot,
      });
      setSuccessId(res.requestId);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (successId !== null) {
    return (
      <div
        role="status"
        className="mt-6 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
      >
        {t("success", { id: successId })}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 text-sm" lang={locale}>
      <p className="text-xs text-muted-foreground">{t("targetHelp")}</p>

      <label className="block">
        <span className="mb-1 block font-medium">{t("articleIdLabel")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          className="w-full rounded-md border bg-background px-3 py-2"
          value={articleId}
          onChange={(e) => setArticleId(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">{t("sourceIdLabel")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          className="w-full rounded-md border bg-background px-3 py-2"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">{t("emailLabel")}</span>
        <input
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border bg-background px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <span className="mt-1 block text-xs text-muted-foreground">{t("emailHelp")}</span>
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">{t("roleLabel")}</span>
        <select
          required
          className="w-full rounded-md border bg-background px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value as RequesterRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roleOptions.${r}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">{t("reasonLabel")}</span>
        <textarea
          required
          minLength={10}
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <span className="mt-1 block text-xs text-muted-foreground">{t("reasonHelp")}</span>
      </label>

      {/* Honeypot: hidden from humans via CSS + aria. Any non-empty value is rejected server-side. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label>
          Leave this field empty
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md border bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
