import { getTranslations } from "next-intl/server";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "layout.header" });

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle
          labels={{
            theme: t("theme"),
            system: t("themeSystem"),
            light: t("themeLight"),
            dark: t("themeDark"),
          }}
        />
      </div>
      {children}
    </div>
  );
}
