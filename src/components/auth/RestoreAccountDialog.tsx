"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";
import { useCountdown } from "@/lib/useCountdown";
import { requestRestoreCode, restoreAccountByOtp } from "@/lib/api/restore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "it" | "en";
  email?: string; // optional prefill
};

function mapRestoreError(t: ReturnType<typeof useTranslations<"auth.restoreDialog">>, code?: string) {
  switch (code) {
    case "user_not_found":
      return t("errors.userNotFound");
    case "invalid_otp":
      return t("errors.invalidOtp");
    case "account_not_deleted":
      return t("errors.accountNotDeleted");
    default:
      return t("errors.fallback");
  }
}

export default function RestoreAccountDialog(props: Props) {
  const { open, onOpenChange, email } = props;
  const t = useTranslations("auth.restoreDialog");
  const common = useTranslations("common");
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const { secondsLeft: resendSecondsLeft } = useCountdown(resendAvailableAt, {
    enabled: open && step === "verify",
  });

  useEffect(() => {
    if (open) {
      // prefill email when opening
      setFormEmail(email ?? "");
      setOtpCode("");
      setStep("request");
      setResendAvailableAt(null);
    }
  }, [open, email]);

  async function onRequestCode() {
    const e = formEmail.trim();

    if (!e) {
      toast(t("enterEmail"));
      return;
    }

    setIsPending(true);
    try {
      await requestRestoreCode(e);
      setStep("verify");
      setResendAvailableAt(Date.now() + 30_000);
      toast(t("requestSuccess"));
    } catch (err) {
      const e = err as ApiError;
      toast(t("errors.fallback"), {
        description: mapRestoreError(t, e.code) || e.message,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function onRestore() {
    const e = formEmail.trim();
    const code = otpCode.trim();

    if (!e) {
      toast(t("enterEmail"));
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      toast(t("enterSixDigitCode"));
      return;
    }

    setIsPending(true);
    try {
      await restoreAccountByOtp(e, code);
      toast(t("restoredTitle"), {
        description: t("restoredDescription"),
      });
      onOpenChange(false);
    } catch (err) {
      const e = err as ApiError;
      toast(t("errors.fallback"), {
        description: mapRestoreError(t, e.code) || e.message,
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{common("email")}</label>
            <Input
              value={formEmail}
              onChange={(ev) => setFormEmail(ev.target.value)}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {step === "verify" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{common("otp")}</label>
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
            {common("cancel")}
          </Button>
          {step === "verify" && (
            <Button
              type="button"
              variant="secondary"
              onClick={onRequestCode}
              disabled={isPending || resendSecondsLeft > 0}
            >
              {t("resend")}
              {resendSecondsLeft > 0 ? ` (${resendSecondsLeft}s)` : ""}
            </Button>
          )}
          <Button onClick={step === "request" ? onRequestCode : onRestore} disabled={isPending}>
            {isPending ? t("sending") : step === "request" ? t("requestCode") : t("restore")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
