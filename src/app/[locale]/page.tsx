import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type SocialLink = {
  name: string;
  href: string;
  description: string;
};

type PageProps = {
  params: Promise<{ locale: string }>;
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = locale === "en" ? "en" : "it";
  const isIt = normalizedLocale === "it";

  const title = isIt ? "Ager | Notizie vere. Idee chiare." : "Ager | Real news. Clear ideas.";
  const description = isIt
    ? "Ager unisce social e news feed per aiutarti a capire il mondo con meno rumore e piu chiarezza."
    : "Ager combines social and news feeds to help you understand the world with less noise and more clarity.";

  return {
    title,
    description,
    alternates: {
      canonical: `/${normalizedLocale}`,
      languages: {
        it: "/it",
        en: "/en",
        "x-default": "/it",
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${siteUrl}/${normalizedLocale}`,
      locale: normalizedLocale,
      siteName: "Ager",
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const isIt = locale === "it";

  const pageUrl = `${siteUrl}/${locale}`;
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ager",
    url: siteUrl,
    inLanguage: ["it", "en"],
  };
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: isIt ? "Ager - Notizie vere. Idee chiare." : "Ager - Real news. Clear ideas.",
    url: pageUrl,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: "Ager",
      url: siteUrl,
    },
  };

  const socialLinks: SocialLink[] = [
    {
      name: "X",
      href: "https://x.com/CultureAger",
      description: isIt
        ? "Informazioni rapide su come procede il lavoro in Ager."
        : "Quick updates on how Ager is progressing."
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/cultureager/",
      description: isIt
        ? "Contenuti visual, infografiche e anteprime del nostro lavoro."
        : "Visual content, infographics and previews of what we’re building."
    },
    {
      name: "Telegram",
      href: "https://t.me/+LlBLi7-kP6M4MGE0",
      description: isIt
        ? "Unisciti al nostro gruppo per aggiornamenti e discussioni in tempo reale."
        : "Join our group for real-time updates and discussions."
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@agerculture",
      description: isIt
        ? "Contenuti più leggeri sul nostro percorso come startup."
        : "Lighter content about our journey as a startup."
    },
    {
      name: "Discord",
      href: "https://discord.gg/daS7J6Q4",
      description: isIt
        ? "Per i veri nerd che vogliono aiutarci a costruire Ager dal lato tecnico."
        : "For builders who want to help on the technical side."
    },
    {
      name: "Substack",
      href: "https://substack.com/@agerculture?utm_campaign=profile&utm_medium=profile-page",
      description: isIt
        ? "Segui il progetto e ricevi aggiornamenti in formato newsletter."
        : "Follow the project and get updates via newsletter."
    }
  ];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
              <Image
                src="/favicon.ico"
                alt="Ager"
                width={18}
                height={18}
                className="h-[18px] w-[18px] object-contain"
                priority
              />
            </span>
            <span>Ager</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <a href="#values" className="text-muted-foreground hover:text-foreground">
              {isIt ? "Valori" : "Values"}
            </a>
            <a href="#social" className="text-muted-foreground hover:text-foreground">
              {isIt ? "Dove trovarci" : "Where to find us"}
            </a>
            <Link
              href={`/${locale}/philosophy`}
              className="text-muted-foreground hover:text-foreground"
            >
              {isIt ? "Filosofia" : "Philosophy"}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href="#social">{isIt ? "Scopri di più" : "Learn more"}</a>
            </Button>
            <Button asChild variant="secondary" className="hidden sm:inline-flex">
              <Link href={`/${locale}/feed`}>{isIt ? "Prova ora" : "Try now"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="space-y-5 lg:col-span-7">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {isIt ? "Notizie vere. Idee chiare." : "Real news. Clear ideas."}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {isIt
                ? "Qui per cambiare il mondo dell'informazione, pronti a creare il tuo nuovo punto di riferimento per capire il mondo."
                : "We’re here to rethink how you navigate information and build a new reference point for understanding the world."}
            </p>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {isIt
                ? "Non siamo un giornale: diamo ordine a quelli che già esistono."
                : "We’re not a newspaper: we bring order to what already exists."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/${locale}/feed`}>{isIt ? "Prova ora" : "Try now"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/philosophy`}>
                  {isIt ? "Leggi la nostra filosofia" : "Read our philosophy"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
                    <Image
                      src="/favicon.ico"
                      alt="Ager"
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] object-contain"
                    />
                  </span>
                  <CardTitle>{isIt ? "Su cosa si fonda Ager" : "What Ager is built on"}</CardTitle>
                </div>
                <CardDescription>
                  {isIt
                    ? "Una visione semplice: meno rumore, più comprensione."
                    : "A simple vision: less noise, more understanding."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">{isIt ? "Focus:" : "Focus:"}</span>{" "}
                  <span className="text-muted-foreground">
                    {isIt
                      ? "cultura (vera) degli utenti e un modo nuovo di concepire le notizie."
                      : "real user understanding and a new way to approach news."}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{isIt ? "Approccio:" : "Approach:"}</span>{" "}
                  <span className="text-muted-foreground">
                    {isIt
                      ? "unire gli aspetti migliori dei social e dei feed di notizie."
                      : "combine the best parts of social and news feeds."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="values" className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <div className="mb-8 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isIt ? "Su cosa si fonda Ager" : "Our values"}
            </h2>
            <p className="text-muted-foreground">
              {isIt
                ? "Tre pilastri per rendere l'informazione più utile."
                : "Three pillars to make information more useful."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{isIt ? "Niente più caos" : "No more chaos"}</CardTitle>
                <CardDescription>
                  {isIt
                    ? "Un modo nuovo di concepire le notizie."
                    : "A new way to approach the news."}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{isIt ? "Attenzione all'utente" : "User-first"}</CardTitle>
                <CardDescription>
                  {isIt
                    ? "L'obiettivo finale è la cultura (vera) degli utenti."
                    : "The end goal is real understanding for users."}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{isIt ? "Social + feed di notizie" : "Social + news feed"}</CardTitle>
                <CardDescription>
                  {isIt
                    ? "Gli aspetti migliori dei social e del mondo delle notizie in un solo posto."
                    : "The best parts of social and news in one place."}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section id="social" className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <div className="mb-8 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isIt ? "Seguici sui social" : "Follow us"}
            </h2>
            <p className="text-muted-foreground">
              {isIt
                ? "Resta aggiornato, scopri cosa stiamo creando e partecipa alle conversazioni."
                : "Stay updated, see what we’re building, and join the conversation."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {socialLinks.map((s) => (
              <Card key={s.href} className="transition-colors hover:bg-muted/30">
                <CardHeader>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <a href={s.href} target="_blank" rel="noreferrer">
                      {isIt ? "Apri" : "Open"}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {isIt
                  ? "Vuoi aiutarci a costruire Ager?"
                  : "Want to help us build Ager?"}
              </h2>
              <p className="text-muted-foreground">
                {isIt
                  ? "Scopri come puoi contribuire alla rivoluzione dell'informazione."
                  : "Learn how you can help shape the future of information."}
              </p>
            </div>
            <Button asChild size="lg">
              <a
                href="https://forms.gle/cGZ94Xw15YqXwVET8"
                target="_blank"
                rel="noreferrer"
              >
                {isIt ? "Scopri come" : "Learn more"}
              </a>
            </Button>
          </div>

          <div className="mt-10 border-t pt-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                    <Image
                      src="/favicon.ico"
                      alt="Ager"
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] object-contain"
                    />
                  </span>
                  <span>Ager</span>
                </div>
                <div className="text-muted-foreground text-sm">
                  {isIt
                    ? "Il futuro dell'informazione parte da qui."
                    : "The future of information starts here."}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm sm:items-end">
                <div className="text-muted-foreground">
                  {isIt
                    ? "© 2025 Ager — Tutti i diritti riservati"
                    : "© 2025 Ager — All rights reserved"}
                </div>
                <nav className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground sm:justify-end">
                  <Link className="hover:text-foreground" href={`/${locale}/bot`}>
                    Bot policy
                  </Link>
                  <Link className="hover:text-foreground" href={`/${locale}/takedown`}>
                    {isIt ? "Rimozione contenuti" : "Takedown"}
                  </Link>
                  <Link className="hover:text-foreground" href={`/${locale}/dsa-contact`}>
                    {isIt ? "Contatto DSA" : "DSA contact"}
                  </Link>
                  <a className="hover:text-foreground" href="mailto:ager.org@gmail.com">
                    {isIt ? "Contatti" : "Contact"}
                  </a>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
