"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Exact User-Agent the RSS worker sends. Kept as a literal constant so changing the wire value
// and the documented value drift becomes a single grep, not a game of whisper down the lane.
export const AGER_BOT_USER_AGENT = "AgerBot/1.0 (+https://agerculture.com/bot)";

type Props = { locale: "it" | "en" };

export default function BotPolicyContent({ locale }: Props) {
  const t = useTranslations("botPolicy");

  return (
    <main
      lang={locale}
      className="mx-auto w-full max-w-3xl px-4 py-10 leading-relaxed text-foreground"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("heading")}</h1>

      <Section title={t("whoWeAre.title")}>
        <p>
          {t("whoWeAre.body")}{" "}
          <Link href={`/${locale}/philosophy`} className="underline underline-offset-4 hover:text-foreground">
            {locale === "it" ? "Filosofia" : "Philosophy"}
          </Link>
          .
        </p>
      </Section>

      <Section title={t("whatItDoes.title")}>
        <p>{t("whatItDoes.body")}</p>
      </Section>

      <Section title={t("userAgent.title")}>
        <p>{t("userAgent.body")}</p>
        <pre className="mt-3 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-sm">
          <code>{AGER_BOT_USER_AGENT}</code>
        </pre>
      </Section>

      <Section title={t("frequency.title")}>
        <p>{t("frequency.body")}</p>
      </Section>

      <Section title={t("respects.title")}>
        <p>{t("respects.intro")}</p>
        <ul className="mt-3 space-y-2 pl-5 list-disc">
          <li>
            <a
              href="https://www.rfc-editor.org/rfc/rfc9309.html"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("respects.robotsLabel")}
            </a>
            {" — "}
            {t("respects.robotsDesc")}
          </li>
          <li>
            <a
              href="https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("respects.tdmrepLabel")}
            </a>
            {" — "}
            {t("respects.tdmrepDesc")}
          </li>
          <li>
            <a
              href="https://datatracker.ietf.org/doc/draft-canel-robots-txt-ai/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("respects.aiTxtLabel")}
            </a>
            {" — "}
            {t("respects.aiTxtDesc")}
          </li>
        </ul>
      </Section>

      <Section title={t("ipRange.title")}>
        <p>{t("ipRange.body")}</p>
      </Section>

      <Section title={t("optOut.title")}>
        <p>{t("optOut.intro")}</p>
        <ol className="mt-3 space-y-3 pl-5 list-decimal">
          <li>
            <strong>{t("optOut.robotsLabel")}</strong>
            {" — "}
            {t("optOut.robotsBody")}
          </li>
          <li>
            <strong>{t("optOut.tdmrepLabel")}</strong>
            {" — "}
            {t("optOut.tdmrepBody")}
          </li>
          <li>
            <strong>{t("optOut.emailLabel")}</strong>
            {" — "}
            <a
              href="mailto:takedown@agerculture.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              takedown@agerculture.com
            </a>
            {" — "}
            {t("optOut.emailBody")}
          </li>
        </ol>
      </Section>

      <Section title={t("takedown.title")}>
        <p>{t("takedown.body")}</p>
        <p className="mt-3">
          <Link
            href={`/${locale}/takedown`}
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-muted"
          >
            {t("takedown.linkText")} →
          </Link>
        </p>
      </Section>

      <Section title={t("partnership.title")}>
        <p>
          {t("partnership.body").replace("partnerships@agerculture.com", "")}
          <a
            href="mailto:partnerships@agerculture.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            partnerships@agerculture.com
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 text-xs text-muted-foreground">{t("footer.updated")}</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 text-sm text-muted-foreground sm:text-base">{children}</div>
    </section>
  );
}
