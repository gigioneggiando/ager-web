"use client";

import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useAuthActions } from "@/lib/auth/session";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense, useEffect, useState } from "react";
import { ApiError, getRetryAfterSeconds } from "@/lib/api/errors";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { useAppLocale } from "@/i18n/useAppLocale";
import { useCountdown } from "@/lib/useCountdown";

const REQUEST_SCHEMA = z.object({
  email: z.email().max(254),
});

const VERIFY_SCHEMA = z.object({
  otpCode: z.string().regex(/^\d{6}$/),
});

const PASSWORD_SCHEMA = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

const RESEND_COOLDOWN_MS = 30_000;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const t = useTranslations("auth.login");
  const common = useTranslations("common");
  const { requestLoginOtp, login } = useAuthActions();
  const router = useRouter();
  const { locale } = useAppLocale();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);

  const { secondsLeft: resendSecondsLeft } = useCountdown(resendAvailableAt, {
    enabled: step === "verify",
  });
  const { secondsLeft: rateLimitSecondsLeft, isActive: isRateLimited } = useCountdown(rateLimitUntil);

  const canResend = step === "verify" && resendSecondsLeft === 0;

  function resetOtpFlow() {
    setStep("request");
    setOtpCode("");
    setResendAvailableAt(null);
  }

  function resetMessages() {
    setErrors(null);
    setInfo(null);
  }

  useEffect(() => {
    const fallback = searchParams.get("fallback");
    if (fallback !== "external_auth_email_missing") return;

    setMethod("otp");
    resetOtpFlow();
    setErrors(null);
    setInfo(t("fallbackExternalEmailMissing"));
  }, [searchParams, t]);

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
      await requestLoginOtp(parsed.data.email);
      setInfo(t("info.codeSent"));
      setStep("verify");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
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

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = VERIFY_SCHEMA.safeParse({ otpCode });
    if (!parsed.success) {
      setErrors(t("errors.invalidCode"));
      return;
    }

    setPending(true);
    try {
      await login({ email, otpCode: parsed.data.otpCode });
      router.push(`/${locale}/feed`);
    } catch (error: unknown) {
      const err = error as ApiError;

      if (err?.status === 401 || err?.status === 403) {
        setErrors(t("errors.invalidCredentials"));
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else {
        setErrors(err?.message ?? t("errors.signInFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    resetMessages();
    setPending(true);
    try {
      await requestLoginOtp(email);
      setInfo(t("info.codeSent"));
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
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

  async function onPasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = PASSWORD_SCHEMA.safeParse({ email, password });
    if (!parsed.success) {
      if (!email.trim()) setErrors(t("errors.enterEmail"));
      else if (!password.trim()) setErrors(t("errors.enterPassword"));
      else setErrors(t("errors.checkInput"));
      return;
    }

    setPending(true);
    try {
      await login({ email: parsed.data.email, password: parsed.data.password });
      router.push(`/${locale}/feed`);
    } catch (error: unknown) {
      const err = error as ApiError;

      if (err?.status === 401 || err?.status === 403) {
        setErrors(t("errors.invalidCredentials"));
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(t("errors.tooManyAttempts", { seconds: retryAfter }));
      } else {
        setErrors(err?.message ?? t("errors.signInFailed"));
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
            {method === "password" ? (
              <form onSubmit={onPasswordLogin} className="space-y-3">
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
                <div>
                  <label className="mb-1 block text-sm">{common("password")}</label>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={pending}
                  />
                </div>
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <Button type="submit" disabled={pending || isRateLimited} className="w-full">
                  {pending ? t("signInLoading") : t("title")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="w-full"
                  onClick={() => {
                    setMethod("otp");
                    resetMessages();
                    resetOtpFlow();
                  }}
                >
                  {t("useCodeInstead")}
                </Button>
              </form>
            ) : step === "request" ? (
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
                </div>
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {t("errors.waitBeforeRetry", { seconds: rateLimitSecondsLeft })}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <Button type="submit" disabled={pending || isRateLimited} className="w-full">
                  {pending ? t("sendLoading") : t("requestCode")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="w-full"
                  onClick={() => {
                    setMethod("password");
                    resetMessages();
                    resetOtpFlow();
                  }}
                >
                  {t("usePasswordInstead")}
                </Button>
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-3">
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
                </div>
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
                    disabled={pending || isRateLimited || !canResend}
                    onClick={onResend}
                    className="flex-1"
                  >
                    {t("resend")}
                    {resendSecondsLeft > 0 ? ` (${resendSecondsLeft}s)` : ""}
                  </Button>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      resetMessages();
                      resetOtpFlow();
                    }}
                  >
                    {t("changeEmail")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      setMethod("password");
                      resetMessages();
                      resetOtpFlow();
                    }}
                  >
                    {t("usePasswordInstead")}
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between text-sm">
              <Link href={`/${locale}/forgot-password`} className="text-muted-foreground hover:underline">
                {t("forgotPassword")}
              </Link>

              <div className="text-muted-foreground">
                {t("noAccount")}{" "}
                <Link href={`/${locale}/register`} className="hover:underline">
                  {t("signUp")}
                </Link>
              </div>
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
      </div>
    </main>
  );
}