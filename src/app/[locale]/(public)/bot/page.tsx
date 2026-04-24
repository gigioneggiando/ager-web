import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BotPolicyContent from "./BotPolicyContent";

// Public bot-policy page. Linked from the AgerBot User-Agent:
//   AgerBot/1.0 (+https://agerculture.com/bot)
// Kept under the (public) route group so no auth is ever required.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "botPolicy.meta" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
    // No trackers, no analytics — publishers should be able to read this without a beacon firing.
    other: { "referrer-policy": "strict-origin-when-cross-origin" },
  };
}

export default async function BotPage({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}) {
  const { locale } = await params;
  return <BotPolicyContent locale={locale} />;
}
