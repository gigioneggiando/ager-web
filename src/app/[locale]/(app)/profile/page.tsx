"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMeQuery, useUpdateMe, useChangePassword, useDeleteMe } from "@/features/profile/hooks/useMe";
import type { UpdateMyProfileRequest } from "@/lib/api/me.types";
import { ApiError } from "@/lib/api/me";
import { getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import { getFirstPasswordRuleMessage } from "@/lib/validation/passwordMessages";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { useAppLocale } from "@/i18n/useAppLocale";

function errorMessage(code: string | undefined, t: ReturnType<typeof useTranslations<"profile">>) {
  if (!code) return t("errors.unexpected");

  const keyByCode: Record<string, Parameters<typeof t>[0]> = {
    unauthorized: "errors.unauthorized",
    user_not_found: "errors.userNotFound",
    user_deleted: "errors.userDeleted",
    username_too_long: "errors.usernameTooLong",
    username_taken: "errors.usernameTaken",
    password_not_set: "errors.passwordNotSet",
    invalid_old_password: "errors.invalidOldPassword",
    csrf_failed: "errors.csrfFailed",
  };

  const key = keyByCode[code];
  return key ? t(key) : code;
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
  const t = useTranslations("profile");
  const { locale } = useAppLocale();
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
      toast(t("errors.unauthorized"));
      router.replace(`/${locale}/login`);
    }
  }, [locale, me.error, router, t]);

  const patch = useMemo(() => computePatch(me.data, {
    username: draft.username.trim(),
    avatarUrl: draft.avatarUrl.trim() || null,
    locale: draft.locale || null,
    timezone: draft.timezone.trim() || null
  }), [me.data, draft]);

  const hasChanges = Object.keys(patch).length > 0;

  async function onSaveProfile() {
    const nextFieldErrors: Record<string, string[]> = {};
    if (draft.username.trim().length > 30) nextFieldErrors.username = [t("validation.usernameMax")];
    if (draft.avatarUrl.trim().length > 255) nextFieldErrors.avatarUrl = [t("validation.avatarUrlMax")];
    if ((draft.locale ?? "").trim().length > 10) nextFieldErrors.locale = [t("validation.localeMax")];
    if (draft.timezone.trim().length > 50) nextFieldErrors.timezone = [t("validation.timezoneMax")];

    setProfileFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      toast(t("fixHighlightedFields"));
      return;
    }

    try {
      await update.mutateAsync(patch);
      setProfileFieldErrors({});
      toast(t("profileUpdated"));
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 422) {
        setProfileFieldErrors(getProblemDetailsFieldErrors(err.details));
        toast(t("fixHighlightedFields"));
        return;
      }
      if (err.status === 403) {
        toast(t("forbiddenTitle"), {
          description: errorMessage(err.code, t)
        });
        return;
      }
      if (err.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        toast(t("tooManyAttempts"), {
          description: t("retryAfter", { seconds: retryAfter })
        });
        return;
      }
      toast(t("errorTitle"), {
        description: errorMessage(err.code, t)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  async function onChangePassword() {
    if (!pw.oldPassword || !pw.newPassword) {
      toast(t("fillAllFields"));
      return;
    }

    const message = getFirstPasswordRuleMessage(pw.newPassword, {
      minLength: t("passwordRequirements"),
      number: t("passwordRequirements"),
      special: t("passwordRequirements"),
      invalid: t("passwordRequirements"),
    });
    if (message) {
      toast(message);
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast(t("passwordMismatch"));
      return;
    }

    try {
      await changePw.mutateAsync({ oldPassword: pw.oldPassword, newPassword: pw.newPassword });
      toast(t("passwordUpdated"));
      setPw({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) {
        toast(t("forbiddenTitle"), {
          description: errorMessage(err.code, t)
        });
        return;
      }
      if (err.status === 422) {
        const fieldErrors = getProblemDetailsFieldErrors(err.details);
        toast(t("validationErrorTitle"), {
          description: Object.values(fieldErrors).flat()[0] ?? errorMessage(err.code, t)
        });
        return;
      }
      if (err.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        toast(t("tooManyAttempts"), {
          description: t("retryAfter", { seconds: retryAfter })
        });
        return;
      }
      toast(t("errorTitle"), {
        description: errorMessage(err.code, t)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  async function onDeleteAccount() {
    const ok = confirm(t("deleteConfirm"));
    if (!ok) return;

    try {
      await del.mutateAsync();
      // Clear cookies/session via your Next handler
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      toast(t("accountDeleted"));
      router.replace(`/${locale}/login`);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) {
        toast(t("forbiddenTitle"), {
          description: errorMessage(err.code, t)
        });
        return;
      }
      toast(t("errorTitle"), {
        description: errorMessage(err.code, t)
      });
      if (err.code === "unauthorized") router.replace(`/${locale}/login`);
    }
  }

  if (me.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="text-sm text-muted-foreground">
          {t("loading")}
        </div>
      </div>
    );
  }

  if (me.isError) {
    const err = me.error as ApiError;
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="rounded border p-3 text-sm text-destructive">
          {t("loadErrorPrefix")}
          {errorMessage(err.code, t)}
        </div>
      </div>
    );
  }

  const createdAt = me.data?.createdAt ? new Date(me.data.createdAt).toLocaleString(locale) : null;
  const updatedAt = me.data?.updatedAt ? new Date(me.data.updatedAt).toLocaleString(locale) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {t("title")}
      </h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">{t("fields.username")}</Label>
            <Input
              id="username"
              value={draft.username}
              onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
              placeholder={t("fields.usernamePlaceholder")}
              maxLength={30}
            />
            {profileFieldErrors.username?.[0] && <p className="text-sm text-destructive">{profileFieldErrors.username[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">{t("fields.avatarUrl")}</Label>
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
            <Label htmlFor="locale">{t("fields.language")}</Label>
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
            <Label htmlFor="timezone">{t("fields.timezone")}</Label>
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
            {createdAt && <div>{t("createdAt")}{createdAt}</div>}
            {updatedAt && <div>{t("updatedAt")}{updatedAt}</div>}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={onSaveProfile}
            disabled={!hasChanges || update.isPending}
          >
            {update.isPending
              ? t("saving")
              : t("saveChanges")}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">
          {t("changePassword")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="oldPassword">{t("oldPassword")}</Label>
            <Input
              id="oldPassword"
              type="password"
              value={pw.oldPassword}
              onChange={(e) => setPw((p) => ({ ...p, oldPassword: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
            />
            <PasswordStrengthIndicator password={pw.newPassword} locale={locale} />
            <p className="text-xs text-muted-foreground">
              {t("passwordRequirements")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">{t("confirmNewPassword")}</Label>
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
              ? t("updating")
              : t("updatePassword")}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3 border-destructive/40">
        <h2 className="text-lg font-semibold text-destructive">
          {t("dangerZone")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("dangerDescription")}
        </p>

        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={onDeleteAccount}
            disabled={del.isPending}
          >
            {del.isPending
              ? t("deleting")
              : t("deleteAccount")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
