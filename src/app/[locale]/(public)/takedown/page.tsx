import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TakedownForm from "./TakedownForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "takedown.meta" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: true, follow: true },
  };
}

export default async function TakedownPage({
  params,
}: {
  params: Promise<{ locale: "it" | "en" }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "takedown" });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("heading")}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t("intro")}</p>
      <TakedownForm locale={locale} />
    </div>
  );
}
