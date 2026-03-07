"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMeQuery, useUpdateMe, useChangePassword, useDeleteMe } from "@/features/profile/hooks/useMe";
import type { UpdateMyProfileRequest } from "@/lib/api/me.types";
import { ApiError } from "@/lib/api/me";
import { getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import { getPasswordRuleIssues } from "@/lib/validation/password";

function msg(code: string | undefined, locale: "it" | "en") {
  const it: Record<string, string> = {
    unauthorized: "Sessione scaduta. Effettua di nuovo l’accesso.",
    user_not_found: "Utente non trovato.",
    user_deleted: "Account disattivato.",
    username_too_long: "Username troppo lungo.",
    username_taken: "Username già in uso.",
    password_not_set: "Questo account non ha una password impostata.",
    invalid_old_password: "La vecchia password non è corretta.",
    csrf_failed: "Sessione non valida. Ricarica la pagina e riprova."
  };
  const en: Record<string, string> = {
    unauthorized: "Session expired. Please log in again.",
    user_not_found: "User not found.",
    user_deleted: "Account is disabled.",
    username_too_long: "Username is too long.",
    username_taken: "Username already taken.",
    password_not_set: "This account has no password set.",
    invalid_old_password: "Old password is incorrect.",
    csrf_failed: "Invalid session state. Reload the page and retry."
  };
  if (!code) return locale === "it" ? "Errore imprevisto." : "Unexpected error.";
  return (locale === "it" ? it[code] : en[code]) ?? code;
}

function computePatch(current: any, draft: any): UpdateMyProfileRequest {
  const patch: UpdateMyProfileRequest = {};
  (["username", "avatarUrl", "locale", "timezone"] as const).forEach((k) => {
    const a = current?.[k] ?? null;
    const b = draft?.[k] ?? null;
    if (a !== b) (patch as any)[k] = b;
  });
  return patch;
}

export default function ProfilePage() {
  const { locale } = useParams() as { locale: "it" | "en" };
  const router = useRouter();

  const me = useMeQuery();
  const update = useUpdateMe();
  const changePw = useChangePassword();
  const del = useDeleteMe();

  const [draft, setDraft] = useState({
    username: "",
    avatarUrl: "",
    locale: locale,
    timezone: ""
  });

  const [pw, setPw] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!me.data) return;
    setDraft({
      username: me.data.username ?? "",
      avatarUrl: me.data.avatarUrl ?? "",
      locale: (me.data.locale as any) ?? locale,
      timezone: me.data.timezone ?? ""
    });
  }, [me.data, locale]);

  // Handle auth expiration globally for this page
  useEffect(() => {
    const err = me.error as any;
    if (err?.code === "unauthorized" || err?.message === "unauthorized") {
      toast(msg("unauthorized", locale));
      router.replace(`/${locale}/login`);
    }
  }, [me.error, locale, router]);

  const patch = useMemo(() => computePatch(me.data, {
    username: draft.username.trim(),
    avatarUrl: draft.avatarUrl.trim() || null,
    locale: draft.locale || null,
    timezone: draft.timezone.trim() || null
  }), [me.data, draft]);

  const hasChanges = Object.keys(patch).length > 0;

  async function onSaveProfile() {
    const nextFieldErrors: Record<string, string[]> = {};
    if (draft.username.trim().length > 30) nextFieldErrors.username = [locale === "it" ? "Massimo 30 caratteri." : "Maximum 30 characters."];
    if (draft.avatarUrl.trim().length > 255) nextFieldErrors.avatarUrl = [locale === "it" ? "Massimo 255 caratteri." : "Maximum 255 characters."];
    if ((draft.locale ?? "").trim().length > 10) nextFieldErrors.locale = [locale === "it" ? "Massimo 10 caratteri." : "Maximum 10 characters."];
    if (draft.timezone.trim().length > 50) nextFieldErrors.timezone = [locale === "it" ? "Massimo 50 caratteri." : "Maximum 50 characters."];

    setProfileFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      toast(locale === "it" ? "Correggi i campi evidenziati" : "Fix highlighted fields");
      return;
    }

    try {
      await update.mutateAsync(patch);
      setProfileFieldErrors({});
      toast(locale === "it" ? "Profilo aggiornato" : "Profile updated");
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422) {
        setProfileFieldErrors(getProblemDetailsFieldErrors(err.details));
        toast(locale === "it" ? "Correggi i campi evidenziati" : "Fix highlighted fields");
        return;
      }
      if (err.status === 403) {
        toast(locale === "it" ? "Operazione non consentita (CSRF)." : "Operation forbidden (CSRF).", {
          description: msg(err.code, locale)
        });
        return;
      }
      if (err.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        toast(locale === "it" ? "Troppi tentativi" : "Too many attempts", {
          description: locale === "it" ? `Riprova tra ${retryAfter}s.` : `Try again in ${retryAfter}s.`
        });
        return;
      }
      toast(locale === "it" ? "Errore" : "Error", {
        description: msg(err.code, locale)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  async function onChangePassword() {
    if (!pw.oldPassword || !pw.newPassword) {
      toast(locale === "it" ? "Compila tutti i campi" : "Fill in all fields");
      return;
    }

    const issues = getPasswordRuleIssues(pw.newPassword);
    if (issues.length > 0) {
      const first = issues[0];
      const message =
        first === "minLength"
          ? (locale === "it" ? "Minimo 8 caratteri." : "At least 8 characters.")
          : first === "number"
            ? (locale === "it" ? "Deve contenere almeno un numero." : "Must include at least one number.")
            : (locale === "it"
                ? "Deve contenere almeno un carattere speciale (es. !@#)."
                : "Must include at least one special character (e.g. !@#).");
      toast(message);
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast(locale === "it" ? "Le password non coincidono" : "Passwords do not match");
      return;
    }

    try {
      await changePw.mutateAsync({ oldPassword: pw.oldPassword, newPassword: pw.newPassword });
      toast(locale === "it" ? "Password aggiornata" : "Password updated");
      setPw({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) {
        toast(locale === "it" ? "Operazione non consentita (CSRF)." : "Operation forbidden (CSRF).", {
          description: msg(err.code, locale)
        });
        return;
      }
      if (err.status === 422) {
        const fieldErrors = getProblemDetailsFieldErrors(err.details);
        toast(locale === "it" ? "Errore validazione" : "Validation error", {
          description: Object.values(fieldErrors).flat()[0] ?? msg(err.code, locale)
        });
        return;
      }
      if (err.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        toast(locale === "it" ? "Troppi tentativi" : "Too many attempts", {
          description: locale === "it" ? `Riprova tra ${retryAfter}s.` : `Try again in ${retryAfter}s.`
        });
        return;
      }
      toast(locale === "it" ? "Errore" : "Error", {
        description: msg(err.code, locale)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  async function onDeleteAccount() {
    const ok = confirm(
      locale === "it"
        ? "Vuoi eliminare il tuo account? L’operazione è irreversibile."
        : "Do you want to delete your account? This cannot be undone."
    );
    if (!ok) return;

    try {
      await del.mutateAsync();
      // Clear cookies/session via your Next handler
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      toast(locale === "it" ? "Account eliminato" : "Account deleted");
      router.replace(`/${locale}/login`);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) {
        toast(locale === "it" ? "Operazione non consentita (CSRF)." : "Operation forbidden (CSRF).", {
          description: msg(err.code, locale)
        });
        return;
      }
      toast(locale === "it" ? "Errore" : "Error", {
        description: msg(err.code, locale)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  if (me.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="text-sm text-muted-foreground">
          {locale === "it" ? "Caricamento profilo…" : "Loading profile…"}
        </div>
      </div>
    );
  }

  if (me.isError) {
    const err = me.error as ApiError;
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="rounded border p-3 text-sm text-destructive">
          {locale === "it" ? "Errore nel caricare il profilo: " : "Failed to load profile: "}
          {msg(err.code, locale)}
        </div>
      </div>
    );
  }

  const createdAt = me.data?.createdAt ? new Date(me.data.createdAt).toLocaleString(locale) : null;
  const updatedAt = me.data?.updatedAt ? new Date(me.data.updatedAt).toLocaleString(locale) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {locale === "it" ? "Profilo" : "Profile"}
      </h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">{locale === "it" ? "Username" : "Username"}</Label>
            <Input
              id="username"
              value={draft.username}
              onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
              placeholder={locale === "it" ? "Il tuo username" : "Your username"}
              maxLength={30}
            />
            {profileFieldErrors.username?.[0] && <p className="text-sm text-destructive">{profileFieldErrors.username[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">{locale === "it" ? "Avatar URL" : "Avatar URL"}</Label>
            <Input
              id="avatarUrl"
              value={draft.avatarUrl}
              onChange={(e) => setDraft((d) => ({ ...d, avatarUrl: e.target.value }))}
              placeholder="https://…"
              maxLength={255}
            />
            {profileFieldErrors.avatarUrl?.[0] && <p className="text-sm text-destructive">{profileFieldErrors.avatarUrl[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">{locale === "it" ? "Lingua" : "Language"}</Label>
            <select
              id="locale"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={draft.locale ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, locale: e.target.value as "it" | "en" }))}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
            {profileFieldErrors.locale?.[0] && <p className="text-sm text-destructive">{profileFieldErrors.locale[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{locale === "it" ? "Timezone" : "Timezone"}</Label>
            <Input
              id="timezone"
              value={draft.timezone}
              onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
              placeholder="Europe/Rome"
              maxLength={50}
            />
            {profileFieldErrors.timezone?.[0] && <p className="text-sm text-destructive">{profileFieldErrors.timezone[0]}</p>}
          </div>
        </div>

        {(createdAt || updatedAt) && (
          <div className="text-xs text-muted-foreground">
            {createdAt && <div>{locale === "it" ? "Creato: " : "Created: "}{createdAt}</div>}
            {updatedAt && <div>{locale === "it" ? "Aggiornato: " : "Updated: "}{updatedAt}</div>}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={onSaveProfile}
            disabled={!hasChanges || update.isPending}
          >
            {update.isPending
              ? (locale === "it" ? "Salvataggio…" : "Saving…")
              : (locale === "it" ? "Salva modifiche" : "Save changes")}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">
          {locale === "it" ? "Cambia password" : "Change password"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="oldPassword">{locale === "it" ? "Password attuale" : "Old password"}</Label>
            <Input
              id="oldPassword"
              type="password"
              value={pw.oldPassword}
              onChange={(e) => setPw((p) => ({ ...p, oldPassword: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">{locale === "it" ? "Nuova password" : "New password"}</Label>
            <Input
              id="newPassword"
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              {locale === "it"
                ? "Requisiti: almeno 8 caratteri, 1 numero, 1 carattere speciale."
                : "Requirements: at least 8 characters, 1 number, 1 special character."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">{locale === "it" ? "Conferma nuova password" : "Confirm new password"}</Label>
            <Input
              id="confirm"
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onChangePassword} disabled={changePw.isPending}>
            {changePw.isPending
              ? (locale === "it" ? "Aggiornamento…" : "Updating…")
              : (locale === "it" ? "Aggiorna password" : "Update password")}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3 border-destructive/40">
        <h2 className="text-lg font-semibold text-destructive">
          {locale === "it" ? "Zona pericolosa" : "Danger zone"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {locale === "it"
            ? "Eliminando l’account, i tuoi dati verranno disattivati (soft-delete)."
            : "Deleting your account will deactivate your data (soft-delete)."}
        </p>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={onDeleteAccount}
            disabled={del.isPending}
          >
            {del.isPending
              ? (locale === "it" ? "Eliminazione…" : "Deleting…")
              : (locale === "it" ? "Elimina il mio account" : "Delete my account")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
