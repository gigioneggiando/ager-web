"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Inter } from "next/font/google";
import { useAppLocale } from "@/i18n/useAppLocale";
import BetaMark from "./BetaMark";
import { useInvisibleCaptcha } from "./useInvisibleCaptcha";
import { Box, Cta, CtaLink } from "./BetaUI";
import {
  StepDone,
  StepEmail,
  StepHow,
  StepIntro,
  StepNotYet,
  type EmailStepState,
} from "./BetaSteps";

/** The design is set in Inter; next/font self-hosts it, so the CSP is untouched. */
const inter = Inter({ subsets: ["latin"], display: "swap" });

/** The beta feed lives on the app subdomain, not on this site. */
const FEED_BASE_URL = "https://app.agerculture.com";

const TOTAL_STEPS = 5;
/** Dots and the footnote only run while the onboarding does. */
const STEPS_WITH_PROGRESS = 4;
const COMPLETED_KEY = "ager.beta.onboarding.completed";
const SWIPE_THRESHOLD_PX = 48;

/** Deliberately permissive: the authoritative check is server side. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? "";

/** Figma coordinates that differ from screen to screen. */
const CTA_TOP = [654, 654, 654, 652, 408];

export default function BetaOnboarding() {
  const t = useTranslations("beta");
  const { locale } = useAppLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EmailStepState>({
    email: "",
    contactConsent: false,
    updatesConsent: false,
    company: "",
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { containerId: captchaContainerId, getToken } = useInvisibleCaptcha(CAPTCHA_SITE_KEY);
  // How long the visitor spent on the form: bots submit almost instantly.
  const openedAt = useRef<number | null>(null);
  const stepAnchorRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((next: number) => {
    setStep(Math.min(Math.max(next, 0), TOTAL_STEPS - 1));
  }, []);

  const submitSignup = useCallback(async () => {
    if (!EMAIL_RE.test(form.email.trim())) {
      setEmailError(t("email.invalid"));
      return;
    }

    setEmailError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          contactConsent: form.contactConsent,
          updatesConsent: form.updatesConsent,
          company: form.company,
          locale,
          elapsedMs: Date.now() - (openedAt.current ?? Date.now()),
          captchaToken: await getToken(),
        }),
      });

      if (!res.ok) {
        setEmailError(t("email.failed"));
        return;
      }

      goTo(4);
    } catch {
      setEmailError(t("email.failed"));
    } finally {
      setSubmitting(false);
    }
  }, [form, locale, getToken, goTo, t]);

  const handleNext = useCallback(() => {
    if (step === 3) {
      void submitSignup();
      return;
    }
    goTo(step + 1);
  }, [step, submitSignup, goTo]);

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

  // Move focus to the new screen so screen readers announce it.
  useEffect(() => {
    stepAnchorRef.current?.focus();
  }, [step]);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

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
      className={`beta-theme grid min-h-dvh place-items-center overflow-hidden ${inter.className}`}
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
      {/* tabIndex only exists so focus can be moved here between screens */}
      <div className="beta-stage relative outline-none" ref={stepAnchorRef} tabIndex={-1}>
        {/* The mark sits lower and larger on the opening screen */}
        {step === 0 ? (
          <BetaMark size={67} top={213} label={t("markAlt")} />
        ) : (
          <BetaMark size={44} top={69} label={t("markAlt")} />
        )}

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

        {isLastStep ? (
          <CtaLink top={CTA_TOP[step]} href={`${FEED_BASE_URL}/${locale}`}>
            {ctaLabel}
          </CtaLink>
        ) : (
          <Cta top={CTA_TOP[step]} onClick={handleNext} disabled={submitting}>
            {ctaLabel}
          </Cta>
        )}

        <div id={captchaContainerId} />

        {showProgress ? (
          <>
            <Box left={176} top={720} width={50} height={6}>
              <nav aria-label={t("progressLabel")} className="flex items-center" style={{ gap: 5 }}>
                {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={t("goToStep", { step: index + 1 })}
                    aria-current={index === step ? "step" : undefined}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                    style={
                      {
                        width: 6,
                        height: 6,
                        backgroundColor:
                          index === step ? "var(--beta-navy)" : "var(--beta-dot-idle)",
                        "--tw-ring-color": "var(--beta-navy)",
                        "--tw-ring-offset-color": "var(--beta-bg)",
                      } as React.CSSProperties
                    }
                  />
                ))}
              </nav>
            </Box>

            <Box left={65} top={734} width={272} height={22}>
              <p
                className="text-center"
                style={{ fontSize: 9, lineHeight: "11px", color: "var(--beta-ink)" }}
              >
                {t("footnote")}
              </p>
            </Box>
          </>
        ) : null}
      </div>
    </div>
  );
}
