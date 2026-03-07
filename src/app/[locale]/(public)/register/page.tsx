"use client";

import { z } from "zod";
import { getPasswordRuleIssues, PasswordSchema } from "@/lib/validation/password";
import { useAuthActions } from "@/lib/auth/session";
import { useRouter, useParams } from "next/navigation";
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
import { useEffect, useMemo, useState } from "react";
import { ApiError, getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import OAuthButtons from "@/components/auth/OAuthButtons";

const REQUEST_SCHEMA = z.object({
  username: z.string().min(1).max(30),
  email: z.email().max(254),
});

const TEMP_EMAIL_DETAIL_EN = "Temporary email addresses are not allowed";
const TEMP_EMAIL_DETAIL_IT = "Gli indirizzi email temporanei non sono consentiti.";

const RESEND_COOLDOWN_MS = 30_000;

export default function RegisterPage() {
  const { requestRegisterOtp, register } = useAuthActions();
  const router = useRouter();
  const params = useParams() as { locale?: string };
  const locale = params?.locale ?? "it";
  const isIt = locale === "it";

  const VERIFY_SCHEMA = useMemo(() => {
    const passwordIssueMessage = (v: string): string | null => {
      const issues = getPasswordRuleIssues(v);
      const first = issues[0];
      if (!first) return null;
      if (first === "minLength") return isIt ? "Minimo 8 caratteri." : "At least 8 characters.";
      if (first === "number") return isIt ? "Deve contenere almeno un numero." : "Must include at least one number.";
      return isIt
        ? "Deve contenere almeno un carattere speciale (es. !@#)."
        : "Must include at least one special character (e.g. !@#).";
    };

    return z.object({
      otpCode: z.string().regex(/^\d{6}$/, isIt ? "Il codice deve essere di 6 cifre" : "Code must be 6 digits"),
      // optional: if provided, must satisfy PasswordSchema
      password: z
        .string()
        .optional()
        .transform((v) => (v === "" ? undefined : v))
        .superRefine((v, ctx) => {
          if (v === undefined) return;
          const parsed = PasswordSchema.safeParse(v);
          if (!parsed.success) {
            ctx.addIssue({
              code: "custom",
              message: passwordIssueMessage(v) ?? (isIt ? "Password non valida." : "Invalid password."),
            });
            return;
          }

          const msg = passwordIssueMessage(v);
          if (msg) ctx.addIssue({ code: "custom", message: msg });
        }),
    });
  }, [isIt]);
  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [step, setStep] = useState<"request" | "verify">("request");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState<string>("");
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

  async function onRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setFieldErrors({});
    setInfo(null);

    const parsed = REQUEST_SCHEMA.safeParse({ username, email });
    if (!parsed.success) {
      setErrors(parsed.error.issues[0]?.message ?? (isIt ? "Controlla i dati inseriti." : "Please check your input."));
      return;
    }

    setPending(true);
    try {
      await requestRegisterOtp({ username: parsed.data.username, email: parsed.data.email });
      setInfo(isIt ? "Ti abbiamo inviato un codice via email." : "We sent you a code by email.");
      setStep("verify");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (e: unknown) {
      const err = e as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(isIt ? TEMP_EMAIL_DETAIL_IT : TEMP_EMAIL_DETAIL_EN);
      } else if (err?.status === 409) {
        if (err?.code === "email_already_registered") {
          setErrors(isIt ? "Email già registrata." : "Email already registered.");
        } else if (err?.code === "username_already_registered") {
          setErrors(isIt ? "Username già in uso." : "Username already taken.");
        } else {
          setErrors(err?.message ?? (isIt ? "Registrazione non disponibile." : "Registration not available."));
        }
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile inviare il codice." : "Unable to send the code."));
      }
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setFieldErrors({});

    const parsed = VERIFY_SCHEMA.safeParse({ otpCode, password });
    if (!parsed.success) {
      setErrors(parsed.error.issues[0]?.message ?? (isIt ? "Controlla i dati inseriti." : "Please check your input."));
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
    } catch (e: unknown) {
      const err = e as ApiError;
      if (err?.status === 401) {
        setErrors(isIt ? "Codice non valido o scaduto." : "Invalid or expired code.");
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(isIt ? TEMP_EMAIL_DETAIL_IT : TEMP_EMAIL_DETAIL_EN);
      } else if (err?.status === 400 && err?.code === "otp_username_mismatch") {
        setErrors(
          isIt
            ? "Lo username non coincide con la richiesta codice (usa lo stesso dello step precedente)."
            : "Username doesn't match the code request (use the same one from the previous step)."
        );
      } else if (err?.status === 422) {
        const fe = getProblemDetailsFieldErrors(err.details);
        setFieldErrors(fe);
        setErrors(isIt ? "Correggi i campi evidenziati." : "Please fix the highlighted fields.");
      } else {
        setErrors(err?.message ?? (isIt ? "Registrazione fallita." : "Register failed."));
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
      await requestRegisterOtp({ username, email });
      setInfo(isIt ? "Ti abbiamo inviato un codice via email." : "We sent you a code by email.");
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (e: unknown) {
      const err = e as ApiError;
      if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else if (err?.status === 400 && err?.code === "temporary_email_not_allowed") {
        setErrors(isIt ? TEMP_EMAIL_DETAIL_IT : TEMP_EMAIL_DETAIL_EN);
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile inviare il codice." : "Unable to send the code."));
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
              <CardTitle className="text-2xl">
                {isIt ? "Crea account" : "Create account"}
              </CardTitle>
            </div>
            <CardDescription>
              {isIt
                ? "Riceverai un codice via email per completare la registrazione."
                : "We’ll email you a code to complete your registration."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === "request" ? (
              <form onSubmit={onRequestCode} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Username</label>
                  <Input
                    name="username"
                    required
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={pending}
                  />
                </div>
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
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Username</label>
                  <Input name="username" value={username} disabled />
                  {fieldErrors.username?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.username[0]}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm">Email</label>
                  <Input name="email" type="email" value={email} disabled />
                  {fieldErrors.email?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>
                  )}
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
                  {fieldErrors.otpCode?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.otpCode[0]}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm">Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder={isIt ? "(opzionale)" : "(optional)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                  />
                  {fieldErrors.password?.[0] && (
                    <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isIt
                      ? "Se la imposti: almeno 8 caratteri, 1 numero, 1 carattere speciale."
                      : "If you set it: at least 8 characters, 1 number, 1 special character."}
                  </p>
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
                  {isIt ? "Modifica dati" : "Edit details"}
                </Button>
              </form>
            )}

            <div className="text-sm text-muted-foreground">
              {isIt ? "Hai già un account?" : "Already have an account?"}{" "}
              <Link href={`/${locale}/login`} className="hover:underline">
                {isIt ? "Accedi" : "Sign in"}
              </Link>
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

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link href={`/${locale}`} className="hover:underline">
            {isIt ? "Torna alla home" : "Back to home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
