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
    let color = "bg-gray-300";
    let label = t("weak");
    let textColor = "text-gray-600";

    if (score >= 4) {
      color = "bg-green-500";
      label = t("veryStrong");
      textColor = "text-green-700";
    } else if (score === 3) {
      color = "bg-green-400";
      label = t("strong");
      textColor = "text-green-600";
    } else if (score === 2) {
      color = "bg-yellow-500";
      label = t("fair");
      textColor = "text-yellow-700";
    } else if (score === 1) {
      color = "bg-orange-500";
      label = t("weak");
      textColor = "text-orange-700";
    } else {
      color = "bg-red-500";
      label = t("veryWeak");
      textColor = "text-red-700";
    }

    return { color, label, textColor, score };
  }, [strength, t]);

  if (!password || password.length < 1) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          {strengthInfo && (
            <div
              className={`h-full transition-all duration-300 ${strengthInfo.color}`}
              style={{ width: `${(strengthInfo.score / 4) * 100}%` }}
            />
          )}
          {loading && !strengthInfo && (
            <div className="h-full bg-gray-300 animate-pulse" style={{ width: "50%" }} />
          )}
        </div>
        {strengthInfo && (
          <span className={`text-xs font-medium ${strengthInfo.textColor}`}>
            {strengthInfo.label}
          </span>
        )}
      </div>

      {strength && (strength.warnings.length > 0 || strength.suggestions.length > 0) && (
        <div className="text-xs text-gray-600 space-y-0.5 mt-1">
          {strength.warnings.map((w, i) => (
            <div key={`w-${i}`} className="text-orange-600">
              ⚠️ {w}
            </div>
          ))}
          {strength.suggestions.map((s, i) => (
            <div key={`s-${i}`} className="text-blue-600">
              💡 {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
