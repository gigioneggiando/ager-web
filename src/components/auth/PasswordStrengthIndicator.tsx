"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { getPasswordStrength } from "@/lib/api/auth";
import type { PasswordStrengthResponse } from "@/lib/auth/types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

type Props = {
  password: string;
  locale?: "en" | "it";
};

export default function PasswordStrengthIndicator({ password }: Props) {
  const t = useTranslations("auth.passwordStrength");
  const debouncedPassword = useDebouncedValue(password, 300);
  const [strength, setStrength] = useState<PasswordStrengthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedPassword || debouncedPassword.length < 1) {
      setStrength(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPasswordStrength(debouncedPassword)
      .then((res) => {
        if (!cancelled) {
          setStrength(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStrength(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedPassword]);

  const strengthInfo = useMemo(() => {
    if (!strength) return null;

    const score = strength.score;
    let color = "bg-muted";
    let label = t("weak");
    let feedbackType: "success" | "warning" | "error" | "muted" = "muted";

    if (score >= 4) {
      color = "bg-green-500 dark:bg-green-400";
      label = t("veryStrong");
      feedbackType = "success";
    } else if (score === 3) {
      color = "bg-green-400 dark:bg-green-300";
      label = t("strong");
      feedbackType = "success";
    } else if (score === 2) {
      color = "bg-yellow-500 dark:bg-yellow-300";
      label = t("fair");
      feedbackType = "warning";
    } else if (score === 1) {
      color = "bg-orange-500 dark:bg-yellow-400";
      label = t("weak");
      feedbackType = "warning";
    } else {
      color = "bg-red-500 dark:bg-red-400";
      label = t("veryWeak");
      feedbackType = "error";
    }

    return { color, label, feedbackType, score };
  }, [strength, t]);

  if (!password || password.length < 1) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/70">
          {strengthInfo && (
            <div
              className={`h-full transition-all duration-300 ${strengthInfo.color}`}
              style={{ width: `${(strengthInfo.score / 4) * 100}%` }}
            />
          )}
          {loading && !strengthInfo && (
            <div className="h-full animate-pulse bg-muted" style={{ width: "50%" }} />
          )}
        </div>
        {strengthInfo && (
          <span
            className="text-xs font-medium"
            style={{
              color: `hsl(var(--feedback-${strengthInfo.feedbackType}-fg))`
            }}
          >
            {strengthInfo.label}
          </span>
        )}
      </div>

      {strength && ((strength.warnings?.length ?? 0) > 0 || (strength.suggestions?.length ?? 0) > 0) && (
        <div className="mt-1 space-y-0.5 text-xs">
          {(strength.warnings ?? []).map((w, i) => (
            <div
              key={`w-${i}`}
              style={{ color: "hsl(var(--feedback-warning-fg))" }}
            >
              ⚠️ {w}
            </div>
          ))}
          {(strength.suggestions ?? []).map((s, i) => (
            <div
              key={`s-${i}`}
              style={{ color: "hsl(var(--feedback-success-fg))" }}
            >
              💡 {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
