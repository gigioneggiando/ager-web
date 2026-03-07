"use client";

import Link from "next/link";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError, getProblemDetailsFieldErrors, getRetryAfterSeconds } from "@/lib/api/errors";
import { getPasswordRuleIssues, PasswordSchema } from "@/lib/validation/password";
import { requestPasswordResetOtp, resetPassword } from "@/lib/api/auth";

const REQUEST_SCHEMA = z.object({
  email: z.email().max(254),
});

export default function ForgotPasswordPage() {
  const { locale } = useParams() as { locale: "it" | "en" };
  const isIt = locale === "it";
  const router = useRouter();

  const RESET_SCHEMA = useMemo(() => {
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

    return z
      .object({
        otpCode: z.string().regex(/^\d{6}$/),
        newPassword: z.string().superRefine((v, ctx) => {
          // Keep backend/client aligned by re-using the shared schema as a baseline,
          // but show localized, user-friendly messages.
          const shared = PasswordSchema.safeParse(v);
          if (!shared.success) {
            const msg = passwordIssueMessage(v) ?? (isIt ? "Password non valida." : "Invalid password.");
            ctx.addIssue({ code: "custom", message: msg });
            return;
          }

          const msg = passwordIssueMessage(v);
          if (msg) ctx.addIssue({ code: "custom", message: msg });
        }),
        confirmNewPassword: z.string(),
      })
      .superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmNewPassword) {
          ctx.addIssue({
            code: "custom",
            path: ["confirmNewPassword"],
            message: isIt ? "Le password non coincidono." : "Passwords do not match.",
          });
        }
      });
  }, [isIt]);

  const [step, setStep] = useState<"request" | "reset">("request");
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  function resetMessages() {
    setInfo(null);
    setErrors(null);
    setFieldErrors({});
  }

  useEffect(() => {
    if (!rateLimitUntil) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rateLimitUntil]);

  const rateLimitSecondsLeft = useMemo(() => {
    if (!rateLimitUntil) return 0;
    return Math.max(0, Math.ceil((rateLimitUntil - now) / 1000));
  }, [rateLimitUntil, now]);

  const isRateLimited = rateLimitSecondsLeft > 0;

  useEffect(() => {
    // Clear field errors when switching steps
    setInfo(null);
    setErrors(null);
    setFieldErrors({});
  }, [step]);

  const backToLoginHref = `/${locale}/login`;

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
      await requestPasswordResetOtp(parsed.data.email);
      setInfo(
        isIt
          ? "Se l’account esiste riceverai un codice via email."
          : "If the account exists, you’ll receive a code by email."
      );
      setStep("reset");
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

  function friendly400(err: ApiError): string {
    const code = err.code ?? "";
    if (code && err.message === code) {
      if (code.includes("password")) return isIt ? "Password non valida." : "Invalid password.";
      if (code.includes("otp") || code.includes("code")) return isIt ? "Codice non valido." : "Invalid code.";
      if (code.includes("email")) return isIt ? "Email non valida." : "Invalid email.";
      return isIt ? "Richiesta non valida." : "Invalid request.";
    }
    return err.message || (isIt ? "Richiesta non valida." : "Invalid request.");
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMessages();

    const parsed = RESET_SCHEMA.safeParse({ otpCode, newPassword, confirmNewPassword });
    if (!parsed.success) {
      setErrors(isIt ? "Controlla i dati inseriti." : "Please check your input.");
      // best-effort: map zod errors to fields
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
      toast(isIt ? "Password aggiornata" : "Password updated");
      router.push(backToLoginHref);
    } catch (e: unknown) {
      const err = e as ApiError;

      if (err?.status === 401) {
        setErrors(isIt ? "Codice non valido o scaduto." : "Invalid or expired code.");
      } else if (err?.status === 403) {
        setErrors(isIt ? "Account disabilitato/eliminato." : "Account disabled/deleted.");
      } else if (err?.status === 429) {
        const retryAfter = getRetryAfterSeconds(err) ?? 60;
        setRateLimitUntil(Date.now() + retryAfter * 1000);
        setErrors(isIt ? `Troppi tentativi. Riprova tra ${retryAfter}s.` : `Too many attempts. Try again in ${retryAfter}s.`);
      } else if (err?.status === 422) {
        const fe = getProblemDetailsFieldErrors(err.details);
        setFieldErrors(fe);
        setErrors(isIt ? "Correggi i campi evidenziati." : "Please fix the highlighted fields.");
      } else if (err?.status === 400 && err?.code) {
        setErrors(friendly400(err));
      } else {
        setErrors(err?.message ?? (isIt ? "Impossibile aggiornare la password." : "Unable to reset password."));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-2 text-2xl font-bold">{isIt ? "Password dimenticata" : "Forgot password"}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {isIt
          ? "Riceverai un codice via email e potrai impostare una nuova password."
          : "You'll receive a code by email and you can set a new password."}
      </p>

      {step === "request" ? (
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
            {fieldErrors.email?.[0] && <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>}
          </div>

          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          {isRateLimited && (
            <p className="text-sm text-muted-foreground">
              {isIt ? `Attendi ${rateLimitSecondsLeft}s prima di riprovare.` : `Wait ${rateLimitSecondsLeft}s before retrying.`}
            </p>
          )}
          {errors && <p className="text-sm text-destructive">{errors}</p>}

          <Button type="submit" disabled={pending || isRateLimited}>
            {pending
              ? isIt
                ? "Invio..."
                : "Sending..."
              : isIt
                ? "Richiedi codice"
                : "Request code"}
          </Button>

          <div className="pt-1 text-sm">
            <Link href={backToLoginHref} className="text-muted-foreground hover:underline">
              {isIt ? "Torna al login" : "Back to login"}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onReset} className="space-y-3">
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
            {fieldErrors.otpCode?.[0] && <p className="text-sm text-destructive">{fieldErrors.otpCode[0]}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm">{isIt ? "Nuova password" : "New password"}</label>
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={pending}
            />
            {fieldErrors.newPassword?.[0] && <p className="text-sm text-destructive">{fieldErrors.newPassword[0]}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {isIt
                ? "Requisiti: almeno 8 caratteri, 1 numero, 1 carattere speciale."
                : "Requirements: at least 8 characters, 1 number, 1 special character."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm">{isIt ? "Conferma nuova password" : "Confirm new password"}</label>
            <Input
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              disabled={pending}
            />
            {fieldErrors.confirmNewPassword?.[0] && (
              <p className="text-sm text-destructive">{fieldErrors.confirmNewPassword[0]}</p>
            )}
          </div>

          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          {isRateLimited && (
            <p className="text-sm text-muted-foreground">
              {isIt ? `Attendi ${rateLimitSecondsLeft}s prima di riprovare.` : `Wait ${rateLimitSecondsLeft}s before retrying.`}
            </p>
          )}
          {errors && <p className="text-sm text-destructive">{errors}</p>}

          <Button type="submit" disabled={pending || isRateLimited}>
            {pending
              ? isIt
                ? "Aggiornamento..."
                : "Updating..."
              : isIt
                ? "Aggiorna password"
                : "Update password"}
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
            {isIt ? "Cambia email" : "Change email"}
          </Button>
        </form>
      )}
    </main>
  );
}
