"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/i18n/useAppLocale";
import BetaMark from "./BetaMark";
import BetaSocials from "./BetaSocials";
import { BetaButton, BetaLinkButton } from "./BetaUI";
import {
  StepDone,
  StepEmail,
  StepHow,
  StepIntro,
  StepNotYet,
  type EmailStepState,
} from "./BetaSteps";

const TOTAL_STEPS = 5;
/** Dots and the footnote are only shown while the onboarding is still running. */
const STEPS_WITH_PROGRESS = 4;
const COMPLETED_KEY = "ager.beta.onboarding.completed";
const SWIPE_THRESHOLD_PX = 48;

/** Deliberately permissive: the real check happens server side (F2). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function BetaOnboarding() {
  const t = useTranslations("beta");
  const { locale } = useAppLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EmailStepState>({
    email: "",
    contactConsent: false,
    updatesConsent: false,
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const headingAnchorRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 0), TOTAL_STEPS - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (step === 3) {
      // TODO(F2): submit to /api/beta-signup before advancing.
      if (!EMAIL_RE.test(form.email.trim())) {
        setEmailError(t("email.invalid"));
        return;
      }
      setEmailError(null);
    }
    goTo(step + 1);
  }, [step, form.email, goTo, t]);

  const handleBack = useCallback(() => goTo(step - 1), [step, goTo]);

  // Arrow keys on desktop.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handleBack]);

  // Move focus to the top of the new screen so screen readers announce it.
  useEffect(() => {
    headingAnchorRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== TOTAL_STEPS - 1) return;
    try {
      window.localStorage.setItem(COMPLETED_KEY, new Date().toISOString());
    } catch {
      // Private browsing or storage disabled: not worth failing the flow.
    }
  }, [step]);

  const isLastStep = step === TOTAL_STEPS - 1;
  const showProgress = step < STEPS_WITH_PROGRESS;
  const ctaLabel = [
    t("intro.cta"),
    t("how.cta"),
    t("notYet.cta"),
    t("email.cta"),
    t("done.cta"),
  ][step];

  return (
    <div
      className="beta-theme flex min-h-dvh flex-col"
      style={{ backgroundColor: "var(--beta-bg)" }}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const delta = (e.changedTouches[0]?.clientX ?? start) - start;
        if (delta <= -SWIPE_THRESHOLD_PX) handleNext();
        if (delta >= SWIPE_THRESHOLD_PX) handleBack();
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-12 sm:max-w-lg sm:pt-16">
        <div className="flex justify-center">
          <BetaMark label={t("markAlt")} />
        </div>

        {/* Screen body, vertically centred like the mockups */}
        <div className="flex flex-1 flex-col justify-center py-10">
          <div ref={headingAnchorRef} tabIndex={-1} className="outline-none">
            {step === 0 ? <StepIntro /> : null}
            {step === 1 ? <StepHow /> : null}
            {step === 2 ? <StepNotYet /> : null}
            {step === 3 ? (
              <StepEmail
                state={form}
                onChange={(next) => {
                  setForm((current) => ({ ...current, ...next }));
                  if (next.email !== undefined) setEmailError(null);
                }}
                error={emailError}
              />
            ) : null}
            {step === 4 ? <StepDone /> : null}
          </div>

          {/* On the last screen the CTA and the contacts belong with the title */}
          {isLastStep ? (
            <div className="space-y-12 pt-8">
              <BetaLinkButton href={`/${locale}/feed`}>{ctaLabel}</BetaLinkButton>
              <BetaSocials />
            </div>
          ) : null}
        </div>

        {/* Call to action */}
        {showProgress ? (
          <div className="space-y-4">
            <BetaButton onClick={handleNext}>{ctaLabel}</BetaButton>
            <nav aria-label={t("progressLabel")} className="flex justify-center gap-2">
                {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={t("goToStep", { step: index + 1 })}
                    aria-current={index === step ? "step" : undefined}
                    className="h-1.5 w-1.5 rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={
                      {
                        backgroundColor:
                          index === step ? "var(--beta-ink)" : "var(--beta-muted)",
                        "--tw-ring-color": "var(--beta-ink)",
                        "--tw-ring-offset-color": "var(--beta-bg)",
                      } as React.CSSProperties
                    }
                  />
                ))}
            </nav>
            <p
              className="text-balance text-center text-[11px] leading-snug"
              style={{ color: "var(--beta-muted)" }}
            >
              {t("footnote")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
