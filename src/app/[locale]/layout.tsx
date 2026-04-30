import { NextIntlClientProvider } from "next-intl";
import "../globals.css";
import Providers from "../providers";
import { notFound } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import LocaleAutoDetect from "@/components/layout/LocaleAutoDetect";

// Statically declare the supported locales so /en and /it are built
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "it" }];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale !== "en" && locale !== "it") {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}.json`)).default;

  // Next-intl provides context here; Providers no longer touches intl.
   return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <LocaleAutoDetect />
        {children}
        <Toaster position="bottom-right" richColors /> {/* works just like before */}
      </Providers>
    </NextIntlClientProvider>
  );
}
