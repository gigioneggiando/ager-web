import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DsaContactContent from "./DsaContactContent";

// DSA single point of contact page required by Regulation (EU) 2022/2065 art. 11-12.
// Kept under the (public) route group so no auth is ever required — supervisory
// authorities must be able to reach this information without a login.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dsaContact.meta" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
    // No trackers, no analytics — the page must be readable by regulators without beacons.
    other: { "referrer-policy": "strict-origin-when-cross-origin" },
  };
}

export default async function DsaContactPage({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}) {
  const { locale } = await params;
  return <DsaContactContent locale={locale} />;
}
