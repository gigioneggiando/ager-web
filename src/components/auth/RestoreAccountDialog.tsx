"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import { requestRestoreCode, restoreAccountByOtp } from "@/lib/api/restore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "it" | "en";
  email?: string; // optional prefill
};

function mapRestoreError(locale: "it" | "en", code?: string) {
  const it = locale === "it";
  switch (code) {
    case "user_not_found":
      return it ? "Utente non trovato." : "User not found.";
    case "invalid_otp":
      return it ? "Codice non valido o scaduto." : "Invalid or expired code.";
    case "account_not_deleted":
      return it ? "L’account non risulta eliminato." : "This account is not deleted.";
    default:
      return it ? "Impossibile ripristinare l’account." : "Unable to restore the account.";
  }
}

export default function RestoreAccountDialog({ open, onOpenChange, locale, email }: Props) {
  const isIt = locale === "it";
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const resendSecondsLeft = useMemo(() => {
    if (!resendAvailableAt) return 0;
    return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  }, [resendAvailableAt, now]);

  useEffect(() => {
    if (open) {
      // prefill email when opening
      setFormEmail(email ?? "");
      setOtpCode("");
      setStep("request");
      setResendAvailableAt(null);
    }
  }, [open, email]);

  useEffect(() => {
    if (!open || step !== "verify" || !resendAvailableAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [open, step, resendAvailableAt]);

  async function onRequestCode() {
    const e = formEmail.trim();

    if (!e) {
      toast(isIt ? "Inserisci l’email" : "Enter your email");
      return;
    }

    setIsPending(true);
    try {
      await requestRestoreCode(e);
      setStep("verify");
      setResendAvailableAt(Date.now() + 30_000);
      toast(
        isIt
          ? "Se l'account esiste, abbiamo inviato un codice"
          : "If the account exists, we sent a code"
      );
    } catch (err) {
      const e = err as ApiError;
      toast(isIt ? "Errore" : "Error", {
        description: mapRestoreError(locale, e.code) || e.message,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function onRestore() {
    const e = formEmail.trim();
    const code = otpCode.trim();

    if (!e) {
      toast(isIt ? "Inserisci l’email" : "Enter your email");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      toast(isIt ? "Inserisci un codice di 6 cifre" : "Enter a 6-digit code");
      return;
    }

    setIsPending(true);
    try {
      await restoreAccountByOtp(e, code);
      toast(isIt ? "Account ripristinato" : "Account restored", {
        description: isIt ? "Ora puoi effettuare il login." : "You can now log in.",
      });
      onOpenChange(false);
    } catch (err) {
      const e = err as ApiError;
      toast(isIt ? "Errore" : "Error", {
        description: mapRestoreError(locale, e.code) || e.message,
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isIt ? "Ripristina account" : "Restore account"}</DialogTitle>
          <DialogDescription>
            {isIt
              ? "Inserisci email e verifica con OTP per ripristinare l’account eliminato."
              : "Enter your email and verify with OTP to restore your deleted account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{isIt ? "Email" : "Email"}</label>
            <Input
              value={formEmail}
              onChange={(ev) => setFormEmail(ev.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {step === "verify" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">OTP</label>
              <Input
                value={otpCode}
                onChange={(ev) => setOtpCode(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            {isIt ? "Annulla" : "Cancel"}
          </Button>
          {step === "verify" && (
            <Button
              type="button"
              variant="secondary"
              onClick={onRequestCode}
              disabled={isPending || resendSecondsLeft > 0}
            >
              {isIt ? "Invia di nuovo" : "Resend"}
              {resendSecondsLeft > 0 ? ` (${resendSecondsLeft}s)` : ""}
            </Button>
          )}
          <Button onClick={step === "request" ? onRequestCode : onRestore} disabled={isPending}>
            {isPending
              ? (isIt ? "Invio…" : "Sending…")
              : step === "request"
                ? (isIt ? "Richiedi codice" : "Request code")
                : (isIt ? "Ripristina" : "Restore")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
