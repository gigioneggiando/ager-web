"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { BetaLead, BetaTitle } from "./BetaUI";

const bold = (chunks: React.ReactNode) => <strong className="font-semibold">{chunks}</strong>;

/** 1 - What Ager is. */
export function StepIntro() {
  const t = useTranslations("beta.intro");
  return (
    <div className="space-y-4">
      <BetaTitle>{t("title")}</BetaTitle>
      <BetaLead>{t.rich("body", { b: bold })}</BetaLead>
    </div>
  );
}

/** 2 - The three promises. */
export function StepHow() {
  const t = useTranslations("beta.how");
  const items = [1, 2, 3] as const;

  return (
    <div className="space-y-8">
      <BetaTitle>{t("title")}</BetaTitle>
      <ol className="space-y-7">
        {items.map((n) => (
          <li key={n} className="flex gap-3">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: "var(--beta-ink)", color: "var(--beta-bg)" }}
              aria-hidden
            >
              {n}
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-bold sm:text-lg" style={{ color: "var(--beta-ink)" }}>
                {t(`item${n}.title`)}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--beta-body)" }}>
                {t(`item${n}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 3 - What the beta does not have yet. */
export function StepNotYet() {
  const t = useTranslations("beta.notYet");
  return (
    <div className="space-y-6">
      <BetaTitle>{t("title")}</BetaTitle>
      <BetaLead>{t("body")}</BetaLead>
      <div className="flex justify-center pt-2">
        <Image
          src="/beta/feed-mockup.png"
          alt={t("mockupAlt")}
          width={196}
          height={326}
          className="h-auto w-44 sm:w-52"
          priority={false}
        />
      </div>
    </div>
  );
}

export type EmailStepState = {
  email: string;
  contactConsent: boolean;
  updatesConsent: boolean;
};

/** 4 - The email form. */
export function StepEmail({
  state,
  onChange,
  error,
}: {
  state: EmailStepState;
  onChange: (next: Partial<EmailStepState>) => void;
  error: string | null;
}) {
  const t = useTranslations("beta.email");

  return (
    <div className="space-y-8">
      <BetaTitle>{t("title")}</BetaTitle>
      <BetaLead>{t.rich("body", { b: bold })}</BetaLead>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="beta-email" className="sr-only">
            {t("fieldLabel")}
          </label>
          <input
            id="beta-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={t("placeholder")}
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "beta-email-error" : undefined}
            className="w-full rounded-full border bg-transparent px-6 py-4 text-center text-base outline-none placeholder:opacity-70 focus-visible:ring-2"
            style={
              {
                borderColor: error ? "var(--beta-accent)" : "var(--beta-line)",
                color: "var(--beta-ink)",
                "--tw-ring-color": "var(--beta-ink)",
              } as React.CSSProperties
            }
          />
          {error ? (
            <p id="beta-email-error" role="alert" className="px-2 text-center text-xs" style={{ color: "var(--beta-ink)" }}>
              {error}
            </p>
          ) : null}
        </div>

        <BetaCheckbox
          id="beta-consent-contact"
          checked={state.contactConsent}
          onChange={(checked) => onChange({ contactConsent: checked })}
          label={t("consentContact")}
        />
        <BetaCheckbox
          id="beta-consent-updates"
          checked={state.updatesConsent}
          onChange={(checked) => onChange({ updatesConsent: checked })}
          label={t("consentUpdates")}
        />
      </div>
    </div>
  );
}

function BetaCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3 px-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border focus-visible:ring-2"
        style={
          {
            accentColor: "var(--beta-accent)",
            borderColor: "var(--beta-line)",
            "--tw-ring-color": "var(--beta-ink)",
          } as React.CSSProperties
        }
      />
      <label htmlFor={id} className="cursor-pointer text-xs leading-snug" style={{ color: "var(--beta-body)" }}>
        {label}
      </label>
    </div>
  );
}

/** 5 - Done, with the contacts. */
export function StepDone() {
  const t = useTranslations("beta.done");
  return (
    <div className="space-y-2">
      <BetaTitle className="text-xl sm:text-2xl">{t("title")}</BetaTitle>
    </div>
  );
}
