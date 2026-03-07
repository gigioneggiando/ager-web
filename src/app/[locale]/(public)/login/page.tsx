"use client";

import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { useAuthActions } from "@/lib/auth/session";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ApiError, getRetryAfterSeconds } from "@/lib/api/errors";
import OAuthButtons from "@/components/auth/OAuthButtons";

const REQUEST_SCHEMA = z.object({
  email: z.email().max(254),
});

const VERIFY_SCHEMA = z.object({
  otpCode: z
    .string()
    .regex(/^\d{6}$/),
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
  const { requestLoginOtp, login } = useAuthActions();
  const router = useRouter();
  const { locale } = useParams() as { locale: "it" | "en" };
  const searchParams = useSearchParams();
  const isIt = locale === "it";
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
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (step !== "verify" && !rateLimitUntil) return;
    if (step === "verify" && !resendAvailableAt && !rateLimitUntil) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [step, resendAvailableAt, rateLimitUntil]);

  const resendSecondsLeft = useMemo(() => {
    if (!resendAvailableAt) return 0;
    return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  }, [resendAvailableAt, now]);

  const canResend = step === "verify" && resendSecondsLeft === 0;
  const rateLimitSecondsLeft = useMemo(() => {
    if (!rateLimitUntil) return 0;
    return Math.max(0, Math.ceil((rateLimitUntil - now) / 1000));
  }, [rateLimitUntil, now]);

  const isRateLimited = rateLimitSecondsLeft > 0;

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

    // Force OTP flow and show the actionable message inline.
    setMethod("otp");
    resetOtpFlow();
    setErrors(null);
    setInfo(
      isIt
        ? "Apple/Google non ha condiviso la tua email. Per continuare, accedi con OTP via email."
        : "Apple/Google didn’t share your email. To continue, sign in with an email OTP."
    );
  }, [searchParams, isIt]);

  async function onRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = REQUEST_SCHEMA.safeParse({ email });
    if (!parsed.success) {
      setErrors(isIt ? "Inserisci una email valida." : "Enter a valid email.");
      return;
    }

    setPending(true);
    try {
      await requestLoginOtp(parsed.data.email);
      setInfo(
        isIt
          ? "Se l’account esiste riceverai un codice via email."
          : "If the account exists, you’ll receive a code by email."
      );
      setStep("verify");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (e: unknown) {
      const err = e as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile inviare il codice." : "Unable to send the code."));
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
      setErrors(isIt ? "Inserisci un codice di 6 cifre." : "Enter a 6-digit code.");
      return;
    }

    setPending(true);
    try {
      await login({ email, otpCode: parsed.data.otpCode });
      router.push(`/${locale}/feed`);
    } catch (e: unknown) {
      const err = e as ApiError;

      if (err?.status === 401 || err?.status === 403) {
        setErrors(isIt ? "Credenziali non valide." : "Invalid credentials.");
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile effettuare il login." : "Unable to sign in."));
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
      setInfo(
        isIt
          ? "Se l’account esiste riceverai un codice via email."
          : "If the account exists, you’ll receive a code by email."
      );
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (e: unknown) {
      const err = e as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile inviare il codice." : "Unable to send the code."));
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
      // keep it simple & localized
      if (!email.trim()) setErrors(isIt ? "Inserisci la tua email." : "Enter your email.");
      else if (!password.trim()) setErrors(isIt ? "Inserisci la password." : "Enter your password.");
      else setErrors(isIt ? "Controlla i dati inseriti." : "Please check your input.");
      return;
    }

    setPending(true);
    try {
      await login({ email: parsed.data.email, password: parsed.data.password });
      router.push(`/${locale}/feed`);
    } catch (e: unknown) {
      const err = e as ApiError;

      if (err?.status === 401 || err?.status === 403) {
        setErrors(isIt ? "Credenziali non valide." : "Invalid credentials.");
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile effettuare il login." : "Unable to sign in."));
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
              <CardTitle className="text-2xl">{isIt ? "Accedi" : "Sign in"}</CardTitle>
            </div>
            <CardDescription>
              {isIt
                ? "Continua con email e codice, oppure con password."
                : "Continue with email and a code, or with your password."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {method === "password" ? (
              <form onSubmit={onPasswordLogin} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Email</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">{isIt ? "Password" : "Password"}</label>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                  />
                </div>
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {isIt ? `Attendi ${rateLimitSecondsLeft}s prima di riprovare.` : `Wait ${rateLimitSecondsLeft}s before retrying.`}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <Button type="submit" disabled={pending || isRateLimited} className="w-full">
                  {pending
                    ? isIt
                      ? "Accesso..."
                      : "Signing in..."
                    : isIt
                      ? "Accedi"
                      : "Sign in"}
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
                  {isIt ? "Accedi con codice invece" : "Use code instead"}
                </Button>
              </form>
            ) : step === "request" ? (
              <form onSubmit={onRequestCode} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Email</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending}
                  />
                </div>
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {isIt ? `Attendi ${rateLimitSecondsLeft}s prima di riprovare.` : `Wait ${rateLimitSecondsLeft}s before retrying.`}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <Button type="submit" disabled={pending || isRateLimited} className="w-full">
                  {pending
                    ? isIt
                      ? "Invio..."
                      : "Sending..."
                    : isIt
                      ? "Richiedi codice"
                      : "Request code"}
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
                  {isIt ? "Accedi con password invece" : "Sign in with password instead"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Email</label>
                  <Input name="email" type="email" value={email} disabled />
                </div>
                <div>
                  <label className="mb-1 block text-sm">OTP</label>
                  <Input
                    name="otpCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={isIt ? "6 cifre" : "6 digits"}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={pending}
                  />
                </div>
                {info && <p className="text-sm text-muted-foreground">{info}</p>}
                {isRateLimited && (
                  <p className="text-sm text-muted-foreground">
                    {isIt ? `Attendi ${rateLimitSecondsLeft}s prima di riprovare.` : `Wait ${rateLimitSecondsLeft}s before retrying.`}
                  </p>
                )}
                {errors && <p className="text-sm text-destructive">{errors}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={pending || isRateLimited} className="flex-1">
                    {pending
                      ? isIt
                        ? "Verifica..."
                        : "Verifying..."
                      : isIt
                        ? "Verifica"
                        : "Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending || isRateLimited || !canResend}
                    onClick={onResend}
                    className="flex-1"
                  >
                    {isIt ? "Invia di nuovo" : "Resend"}
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
                    {isIt ? "Cambia email" : "Change email"}
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
                    {isIt ? "Accedi con password invece" : "Sign in with password instead"}
                  </Button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between text-sm">
              <Link
                href={`/${locale}/forgot-password`}
                className="text-muted-foreground hover:underline"
              >
                {isIt ? "Password dimenticata?" : "Forgot password?"}
              </Link>

              <div className="text-muted-foreground">
                {isIt ? "Non hai un account?" : "Don’t have an account?"}{" "}
                <Link href={`/${locale}/register`} className="hover:underline">
                  {isIt ? "Registrati" : "Sign up"}
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">{isIt ? "Oppure" : "Or"}</div>
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
