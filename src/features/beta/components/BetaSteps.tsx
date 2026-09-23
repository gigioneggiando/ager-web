"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import BetaSocials from "./BetaSocials";
import { Box, Title } from "./BetaUI";

const bold = (chunks: React.ReactNode) => <strong className="font-bold">{chunks}</strong>;

const INK = "var(--beta-ink)";

/** 12/15 body copy. */
const body12: React.CSSProperties = { fontSize: 12, lineHeight: "15px", color: INK };
/** 16/19, used for the longer paragraph on the email screen. */
const body16: React.CSSProperties = { fontSize: 16, lineHeight: "19px", color: INK };

/** 1 - What Ager is. */
export function StepIntro() {
  const t = useTranslations("beta.intro");
  return (
    <>
      <Title top={381} color="var(--beta-navy)">
        {t("title")}
      </Title>
      <Box left={30} top={437} width={342}>
        <p className="text-center" style={body12}>
          {t.rich("body", { b: bold })}
        </p>
      </Box>
    </>
  );
}

/** 2 - The three promises. */
export function StepHow() {
  const t = useTranslations("beta.how");
  const items = [
    { n: 1, top: 307 },
    { n: 2, top: 396 },
    { n: 3, top: 485 },
  ] as const;

  return (
    <>
      <Title top={201}>{t("title")}</Title>
      {items.map(({ n, top }) => (
        <Box key={n} left={40} top={top} width={322} height={56}>
          <span
            className="absolute left-0 top-0 flex items-center justify-center rounded-full font-bold text-white"
            style={{
              width: 20,
              height: 20,
              backgroundColor: "var(--beta-navy)",
              fontSize: 15,
              lineHeight: "18px",
            }}
            aria-hidden
          >
            {n}
          </span>
          <h2
            className="absolute top-0 font-bold"
            style={{ left: 32, fontSize: 16, lineHeight: "19px", color: INK }}
          >
            {t(`item${n}.title`)}
          </h2>
          <p className="absolute" style={{ left: 32, top: 26, width: 290, ...body12 }}>
            {t(`item${n}.body`)}
          </p>
        </Box>
      ))}
    </>
  );
}

/** 3 - What the beta does not have yet. */
export function StepNotYet() {
  const t = useTranslations("beta.notYet");
  return (
    <>
      <Title top={201}>{t("title")}</Title>
      <Box left={56} top={246} width={290}>
        <p className="text-center" style={body12}>
          {t("body")}
        </p>
      </Box>
      <Box left={101} top={313} width={200} height={333}>
        <Image
          src="/beta/feed-mockup.png"
          alt={t("mockupAlt")}
          width={900}
          height={1561}
          className="h-full w-full object-contain"
          style={{ filter: "drop-shadow(8px 11px 16.3px rgba(0, 0, 0, 0.25))" }}
        />
      </Box>
    </>
  );
}

export type EmailStepState = {
  email: string;
  contactConsent: boolean;
  updatesConsent: boolean;
  /** Honeypot: stays empty unless a bot fills the form. */
  company: string;
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
    <>
      <Title top={201}>{t("title")}</Title>
      <Box left={56} top={322} width={290}>
        <p className="text-center" style={body16}>
          {t.rich("body", { b: bold })}
        </p>
      </Box>

      <Box top={495} width={253} height={60}>
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
          className="h-full w-full rounded-[35px] border text-center outline-none focus-visible:ring-2"
          style={
            {
              padding: "17px 24px",
              backgroundColor: "var(--beta-bg)",
              borderColor: error ? "var(--beta-accent)" : "var(--beta-cta)",
              color: INK,
              fontSize: 20,
              lineHeight: "24px",
              "--tw-ring-color": "var(--beta-navy)",
            } as React.CSSProperties
          }
        />
      </Box>

      {error ? (
        <Box left={56} top={559} width={290}>
          <p
            id="beta-email-error"
            role="alert"
            className="text-center"
            style={{ fontSize: 10, lineHeight: "12px", color: INK }}
          >
            {error}
          </p>
        </Box>
      ) : null}

      {/* Honeypot: off-screen, skipped by keyboard and hidden from assistive tech */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        aria-hidden
        autoComplete="off"
        value={state.company}
        onChange={(e) => onChange({ company: e.target.value })}
        className="pointer-events-none absolute opacity-0"
        style={{ left: -9999, top: 0, width: 1, height: 1 }}
      />

      <Consent
        id="beta-consent-contact"
        top={573}
        checked={state.contactConsent}
        onChange={(checked) => onChange({ contactConsent: checked })}
        label={t("consentContact")}
      />
      <Consent
        id="beta-consent-updates"
        top={611}
        checked={state.updatesConsent}
        onChange={(checked) => onChange({ updatesConsent: checked })}
        label={t("consentUpdates")}
      />
    </>
  );
}

/** 15x15 square, filled when checked - the design's own checkbox. */
function Consent({
  id,
  top,
  checked,
  onChange,
  label,
}: {
  id: string;
  top: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Box left={81} top={top} width={240} height={24}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute left-0 top-0 cursor-pointer appearance-none rounded-[2px] border focus-visible:ring-2 focus-visible:ring-offset-1"
        style={
          {
            width: 15,
            height: 15,
            borderColor: "var(--beta-accent)",
            backgroundColor: checked ? "var(--beta-accent)" : "transparent",
            "--tw-ring-color": "var(--beta-navy)",
            "--tw-ring-offset-color": "var(--beta-bg)",
          } as React.CSSProperties
        }
      />
      {checked ? (
        <svg
          viewBox="0 0 15 15"
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: 15, height: 15 }}
          aria-hidden
        >
          <path
            d="M3 8 L6 11 L12 4"
            fill="none"
            stroke="var(--beta-bg)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      <label
        htmlFor={id}
        className="absolute top-0 cursor-pointer"
        style={{ left: 27, width: 213, fontSize: 10, lineHeight: "12px", color: INK }}
      >
        {label}
      </label>
    </Box>
  );
}

/** 5 - Done, with the contacts. */
export function StepDone() {
  const t = useTranslations("beta.done");
  return (
    <>
      <Title top={342}>{t("title")}</Title>
      <BetaSocials />
    </>
  );
}
