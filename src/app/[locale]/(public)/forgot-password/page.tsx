"use client";

import Link from "next/link";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError, getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import { PasswordSchema } from "@/lib/validation/password";
import { getFirstPasswordRuleMessage } from "@/lib/validation/passwordMessages";
import { requestPasswordResetOtp, resetPassword } from "@/lib/api/auth";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useCountdown } from "@/lib/useCountdown";
import { useMemo, useState } from "react";

const REQUEST_SCHEMA = z.object({
  email: z.email().max(254),
});

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const common = useTranslations("common");
  const tPasswordRules = useTranslations("auth.passwordRules");
  const { locale } = useAppLocale();
  const router = useRouter();

  const resetSchema = useMemo(() => {
    const passwordMessages = {
      minLength: tPasswordRules("minLength"),
      number: tPasswordRules("number"),
      special: tPasswordRules("special"),
      invalid: tPasswordRules("invalid"),
    };

    return z
      .object({
        otpCode: z.string().regex(/^\d{6}$/),
        newPassword: z.string().superRefine((value, ctx) => {
          const shared = PasswordSchema.safeParse(value);
          if (!shared.success) {
            ctx.addIssue({
              code: "custom",
              message: getFirstPasswordRuleMessage(value, passwordMessages) ?? passwordMessages.invalid,
            });
          }
        }),
        confirmNewPassword: z.string(),
      })
      .superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmNewPassword) {
          ctx.addIssue({
            code: "custom",
            path: ["confirmNewPassword"],
            message: tPasswordRules("mismatch"),
          });
        }
      });
  }, [tPasswordRules]);

  const [step, setStep] = useState<"request" | "reset">("request");
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { secondsLeft: rateLimitSecondsLeft, isActive: isRateLimited } = useCountdown(rateLimitUntil);

  function resetMessages() {
    setInfo(null);
    setErrors(null);
    setFieldErrors({});
  }

  const backToLoginHref = `/${locale}/login`;

  async function onRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = REQUEST_SCHEMA.safeParse({ email });
    if (!parsed.success) {
      setErrors(t("errors.invalidEmail"));
      return;
    }

    setPending(true);
    try {
      await requestPasswordResetOtp(parsed.data.email);
      setInfo(t("info.codeSent"));
      setStep("reset");
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else {
        setErrors(err?.message ?? t("errors.sendCodeFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  function friendly400(err: ApiError): string {
    const code = err.code ?? "";
    if (code && err.message === code) {
      if (code.includes("password")) return t("errors.invalidPassword");
      if (code.includes("otp") || code.includes("code")) return t("errors.invalidCode");
      if (code.includes("email")) return t("errors.invalidEmailValue");
      return t("errors.invalidRequest");
    }

    return err.message || t("errors.invalidRequest");
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = resetSchema.safeParse({ otpCode, newPassword, confirmNewPassword });
    if (!parsed.success) {
      setErrors(t("errors.checkInput"));
      const nextFieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path?.[0] ?? "");
        if (!key) continue;
        nextFieldErrors[key] = [...(nextFieldErrors[key] ?? []), issue.message];
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setPending(true);
    try {
      await resetPassword(email, parsed.data.otpCode, parsed.data.newPassword);
      toast(t("toast.passwordUpdated"));
      router.push(backToLoginHref);
    } catch (error: unknown) {
      const err = error as ApiError;

      if (err?.status === 401) {
        setErrors(t("errors.invalidOrExpiredCode"));
      } else if (err?.status === 403) {
        setErrors(t("errors.accountDisabled"));
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else if (err?.status === 422) {
        const fe = getProblemDetailsFieldErrors(err.details);
        setFieldErrors(fe);
        setErrors(t("errors.fixHighlightedFields"));
      } else if (err?.status === 400 && err?.code) {
        setErrors(friendly400(err));
      } else {
        setErrors(err?.message ?? t("errors.resetFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t("description")}</p>

      {step === "request" ? (
        <form onSubmit={onRequestCode} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">{common("email")}</label>
            <Input
              name="email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
            {fieldErrors.email?.[0] && <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>}
          </div>

          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          {isRateLimited && (
            <p className="text-sm text-muted-foreground">
              {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
            </p>
          )}
          {errors && <p className="text-sm text-destructive">{errors}</p>}

          <Button type="submit" disabled={pending || isRateLimited}>
            {pending ? t("sendLoading") : t("requestCode")}
          </Button>

          <div className="pt-1 text-sm">
            <Link href={backToLoginHref} className="text-muted-foreground hover:underline">
              {t("backToLogin")}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onReset} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">{common("email")}</label>
            <Input name="email" type="email" value={email} disabled />
          </div>

          <div>
            <label className="mb-1 block text-sm">{common("otp")}</label>
            <Input
              name="otpCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("codePlaceholder")}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={pending}
            />
            {fieldErrors.otpCode?.[0] && <p className="text-sm text-destructive">{fieldErrors.otpCode[0]}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm">{t("newPassword")}</label>
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={pending}
            />
            {fieldErrors.newPassword?.[0] && <p className="text-sm text-destructive">{fieldErrors.newPassword[0]}</p>}
            <PasswordStrengthIndicator password={newPassword} locale={locale} />
            <p className="mt-1 text-xs text-muted-foreground">{t("passwordRequirements")}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm">{t("confirmNewPassword")}</label>
            <Input
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              disabled={pending}
            />
            {fieldErrors.confirmNewPassword?.[0] && (
              <p className="text-sm text-destructive">{fieldErrors.confirmNewPassword[0]}</p>
            )}
          </div>

          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          {isRateLimited && (
            <p className="text-sm text-muted-foreground">
              {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
            </p>
          )}
          {errors && <p className="text-sm text-destructive">{errors}</p>}

          <Button type="submit" disabled={pending || isRateLimited}>
            {pending ? t("updateLoading") : t("updatePassword")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setStep("request");
              setOtpCode("");
              setNewPassword("");
              setConfirmNewPassword("");
            }}
          >
            {t("changeEmail")}
          </Button>
        </form>
      )}
    </main>
  );
}