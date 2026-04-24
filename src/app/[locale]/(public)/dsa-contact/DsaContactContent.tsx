"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Placeholders rendered verbatim. They depend on the forening being formally
// constituted (`REGISTERED_ADDRESS`) and on metrics Ager does not yet publish
// (`AVG_MONTHLY_UE_USERS`). Replacing them is intentionally a two-file grep:
// the token here and the entry in `messages/{it,en}.json`.
export const REGISTERED_ADDRESS_PLACEHOLDER = "{{REGISTERED_ADDRESS}}";
export const AVG_MONTHLY_UE_USERS_PLACEHOLDER = "{{AVG_MONTHLY_UE_USERS}}";

export const DSA_AUTHORITIES_EMAIL = "dsa-authorities@agerculture.com";
export const DSA_USERS_EMAIL = "dsa-users@agerculture.com";

type Props = { locale: "it" | "en" };

export default function DsaContactContent({ locale }: Props) {
  const t = useTranslations("dsaContact");

  return (
    <main
      lang={locale}
      className="mx-auto w-full max-w-3xl px-4 py-10 leading-relaxed text-foreground"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("heading")}</h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t("intro")}</p>

      <Section title={t("authorities.title")}>
        <p>{t("authorities.intro")}</p>
        <dl className="mt-3 space-y-2">
          <Row label={t("authorities.emailLabel")}>
            <a
              href={`mailto:${DSA_AUTHORITIES_EMAIL}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {DSA_AUTHORITIES_EMAIL}
            </a>
            <span className="ml-2 text-xs text-muted-foreground">
              ({t("authorities.emailNote")})
            </span>
          </Row>
          <Row label={t("authorities.addressLabel")}>
            <code className="rounded bg-muted/40 px-1 font-mono text-sm">
              {REGISTERED_ADDRESS_PLACEHOLDER}
            </code>
            <span className="ml-2 text-xs text-muted-foreground">
              ({t("authorities.addressNote")})
            </span>
          </Row>
          <Row label={t("authorities.languagesLabel")}>{t("authorities.languages")}</Row>
          <Row label={t("authorities.slaLabel")}>{t("authorities.sla")}</Row>
        </dl>
      </Section>

      <Section title={t("users.title")}>
        <p>{t("users.intro")}</p>
        <dl className="mt-3 space-y-2">
          <Row label={t("users.emailLabel")}>
            <a
              href={`mailto:${DSA_USERS_EMAIL}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {DSA_USERS_EMAIL}
            </a>
            <span className="ml-2 text-xs text-muted-foreground">
              ({t("users.emailNote")})
            </span>
          </Row>
          <Row label={t("users.takedownLabel")}>
            <Link
              href={`/${locale}/takedown`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("users.takedownLinkText")}
            </Link>
          </Row>
          <Row label={t("users.privacyLabel")}>{t("users.privacyBody")}</Row>
          <Row label={t("users.languagesLabel")}>{t("users.languages")}</Row>
        </dl>
      </Section>

      <Section title={t("transparency.title")}>
        <p>{t("transparency.body")}</p>
        <dl className="mt-3 space-y-2">
          <Row label={t("transparency.sizeLabel")}>
            <code className="rounded bg-muted/40 px-1 font-mono text-sm">
              {AVG_MONTHLY_UE_USERS_PLACEHOLDER}
            </code>
            <span className="ml-2 text-xs text-muted-foreground">
              ({t("transparency.sizeNote")})
            </span>
          </Row>
          <Row label={t("transparency.reportLabel")}>{t("transparency.reportBody")}</Row>
        </dl>
      </Section>

      <Section title={t("otherAuthorities.title")}>
        <p>{t("otherAuthorities.intro")}</p>
        <ul className="mt-3 space-y-2 pl-5 list-disc">
          <li>
            <a
              href="https://www.agcom.it"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("otherAuthorities.agcomLabel")}
            </a>
          </li>
          <li>
            <a
              href="https://sdfi.dk/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("otherAuthorities.itstLabel")}
            </a>
          </li>
          <li>
            <a
              href="https://edpb.europa.eu/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("otherAuthorities.edpbLabel")}
            </a>
          </li>
          <li>
            <a
              href="https://www.datatilsynet.dk/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("otherAuthorities.datatilsynetLabel")}
            </a>
          </li>
          <li>
            <a
              href="https://www.garanteprivacy.it/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("otherAuthorities.garanteLabel")}
            </a>
          </li>
        </ul>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 font-medium text-foreground sm:w-56">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
