"use client";

import { z } from "zod";
import { useTranslations } from "next-intl";
import { PasswordSchema } from "@/lib/validation/password";
import { getFirstPasswordRuleMessage } from "@/lib/validation/passwordMessages";
import { useAuthActions } from "@/lib/auth/session";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useState } from "react";
import { ApiError, getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import HCaptchaWidget from "@/components/auth/HCaptchaWidget";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useCountdown } from "@/lib/useCountdown";

const REQUEST_SCHEMA = z.object({
  username: z.string().min(1).max(30),
  email: z.email().max(254),
});

const RESEND_COOLDOWN_MS = 30_000;
const HONEYPOT_FIELD_NAME = "companyWebsite";

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const common = useTranslations("common");
  const tPasswordRules = useTranslations("auth.passwordRules");
  const { requestRegisterOtp, register } = useAuthActions();
  const router = useRouter();
  const { locale } = useAppLocale();
  const hCaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? "";
  const captchaEnabled = hCaptchaSiteKey.length > 0;

  const verifySchema = useMemo(() => {
    const passwordMessages = {
      minLength: tPasswordRules("minLength"),
      number: tPasswordRules("number"),
      special: tPasswordRules("special"),
      invalid: tPasswordRules("invalid"),
    };

    return z.object({
      otpCode: z.string().regex(/^\d{6}$/),
      password: z
        .string()
        .optional()
        .transform((value) => (value === "" ? undefined : value))
        .superRefine((value, ctx) => {
          if (value === undefined) return;

          const parsed = PasswordSchema.safeParse(value);
          if (!parsed.success) {
            ctx.addIssue({
              code: "custom",
              message: getFirstPasswordRuleMessage(value, passwordMessages) ?? passwordMessages.invalid,
            });
          }
        }),
    });
  }, [tPasswordRules]);

  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);

  const { secondsLeft: resendSecondsLeft } = useCountdown(resendAvailableAt, {
    enabled: step === "verify",
  });
  const { secondsLeft: rateLimitSecondsLeft, isActive: isRateLimited } = useCountdown(rateLimitUntil);
  const canResend = step === "verify" && resendSecondsLeft === 0;

  async function onRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setFieldErrors({});
    setInfo(null);

    const parsed = REQUEST_SCHEMA.safeParse({ username, email });
    if (!parsed.success) {
      setErrors(t("errors.checkInput"));
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setErrors(t("errors.sendCodeFailed"));
      return;
    }

    setPending(true);
    try {
      await requestRegisterOtp({
        username: parsed.data.username,
        email: parsed.data.email,
        honeypot,
        captchaToken,
      });
      setInfo(t("info.codeSent"));
      setStep("verify");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(t("errors.temporaryEmail"));
      } else if (err?.status === 409) {
        if (err?.code === "email_already_registered") {
          setErrors(t("errors.emailAlreadyRegistered"));
        } else if (err?.code === "username_already_registered") {
          setErrors(t("errors.usernameAlreadyTaken"));
        } else {
          setErrors(err?.message ?? t("errors.registrationUnavailable"));
        }
      } else {
        setErrors(err?.message ?? t("errors.sendCodeFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setFieldErrors({});

    const parsed = verifySchema.safeParse({ otpCode, password });
    if (!parsed.success) {
      setErrors(parsed.error.issues[0]?.message ?? t("errors.checkInput"));
      return;
    }

    setPending(true);
    try {
      await register({
        username,
        email,
        otpCode: parsed.data.otpCode,
        password: parsed.data.password,
      });
      router.push(`/${locale}/feed`);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.status === 401) {
        setErrors(t("errors.invalidOrExpiredCode"));
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(t("errors.temporaryEmail"));
      } else if (err?.status === 400 && err?.code === "otp_username_mismatch") {
        setErrors(t("errors.usernameMismatch"));
      } else if (err?.status === 422) {
        const fe = getProblemDetailsFieldErrors(err.details);
        setFieldErrors(fe);
        setErrors(t("errors.fixHighlightedFields"));
      } else {
        setErrors(err?.message ?? t("errors.registerFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    setErrors(null);
    setFieldErrors({});
    setInfo(null);
    setPending(true);
    try {
      await requestRegisterOtp({ username, email, honeypot, captchaToken });
      setInfo(t("info.codeSent"));
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (error: unknown) {
      const err = error as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(t("errors.temporaryEmail"));
      } else {
        setErrors(err?.message ?? t("errors.sendCodeFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                <Image
                  src="/favicon.ico"
                  alt="Ager"
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] object-contain"
                  priority
                />
              </span>
              <CardTitle className="text-2xl">{t("title")}</CardTitle>
            </div>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === "request" ? (
              <form onSubmit={onRequestCode} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">{common("username")}</label>
                  <Input
                    name="username"
                    required
                    maxLength={30}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={pending}
                  />
                </div>
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
                </div>
                <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true">
                  <label htmlFor={HONEYPOT_FIELD_NAME}>{HONEYPOT_FIELD_NAME}</label>
                  <input
                    id={HONEYPOT_FIELD_NAME}
                    name={HONEYPOT_FIELD_NAME}
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>
                {captchaEnabled && (
                  <div className="space-y-2">
                    <HCaptchaWidget
                      siteKey={hCaptchaSiteKey}
                      onTokenChange={setCaptchaToken}
                      disabled={pending}
                    />
                  </div>
                )}
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <Button
                  type="submit"
                  disabled={pending || isRateLimited || (captchaEnabled && !captchaToken)}
                  className="w-full"
                >
                  {pending ? t("sendLoading") : t("requestCode")}
                </Button>
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">{common("username")}</label>
                  <Input name="username" value={username} disabled />
                  {fieldErrors.username?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.username[0]}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm">{common("email")}</label>
                  <Input name="email" type="email" value={email} disabled />
                  {fieldErrors.email?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
                  )}
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
                  {fieldErrors.otpCode?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.otpCode[0]}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm">{common("password")}</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder={t("optionalPassword")}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={pending}
                  />
                  {fieldErrors.password?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
                  )}
                  <PasswordStrengthIndicator password={password} locale={locale} />
                  <p className="mt-1 text-xs text-muted-foreground">{t("passwordHint")}</p>
                </div>
                {captchaEnabled && (
                  <div className="space-y-2">
                    <HCaptchaWidget
                      siteKey={hCaptchaSiteKey}
                      onTokenChange={setCaptchaToken}
                      disabled={pending}
                    />
                  </div>
                )}
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}

                <div className="flex gap-2">
                  <Button type="submit" disabled={pending || isRateLimited} className="flex-1">
                    {pending ? t("verifyLoading") : t("verify")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending || isRateLimited || !canResend || (captchaEnabled && !captchaToken)}
                    onClick={onResend}
                    className="flex-1"
                  >
                    {t("resend")}
                    {resendSecondsLeft > 0 ? ` (${resendSecondsLeft}s)` : ""}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="w-full"
                  onClick={() => {
                    setStep("request");
                    setOtpCode("");
                    setPassword("");
                    setErrors(null);
                    setInfo(null);
                    setFieldErrors({});
                    setResendAvailableAt(null);
                  }}
                >
                  {t("editDetails")}
                </Button>
              </form>
            )}

            <div className="text-sm text-muted-foreground">
              {t("alreadyHaveAccount")}{" "}
              <Link href={`/${locale}/login`} className="hover:underline">
                {t("signIn")}
              </Link>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">{common("or")}</div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <OAuthButtons disabled={pending} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link href={`/${locale}`} className="hover:underline">
            {t("backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
