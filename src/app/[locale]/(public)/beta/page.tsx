import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BetaOnboarding from "@/features/beta/components/BetaOnboarding";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = locale === "en" ? "en" : "it";
  const t = await getTranslations({ locale: normalizedLocale, namespace: "beta.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // The beta onboarding is a private invite flow: keep it out of search results.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/${normalizedLocale}/beta`,
      languages: {
        it: "/it/beta",
        en: "/en/beta",
        "x-default": "/it/beta",
      },
    },
  };
}

export default function BetaPage() {
  return <BetaOnboarding />;
}
