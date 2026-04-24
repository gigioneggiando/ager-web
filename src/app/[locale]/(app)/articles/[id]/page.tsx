import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { getArticlePublic } from "@/lib/api/articles";
import ArticleActions from "./ArticleActions";
import ResilientImage from "@/components/media/ResilientImage";
import { normalizeImageUrl } from "@/lib/images/normalize";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const getArticleSafe = cache(async (articleId: number) => {
  try {
    return await getArticlePublic(articleId);
  } catch {
    return null;
  }
});

function truncateForMeta(text: string, maxLength: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: "it" | "en"; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const articleId = Number(id);
  if (!Number.isFinite(articleId)) {
    return { robots: { index: false, follow: false } };
  }

  const article = await getArticleSafe(articleId);
  if (!article) {
    return { robots: { index: false, follow: false } };
  }

  const title = truncateForMeta(article.title, 70);
  const descriptionSource = article.excerpt?.trim() || article.title;
  const description = truncateForMeta(descriptionSource, 160);
  const pagePath = `/${locale}/articles/${articleId}`;
  const pageUrl = `${siteUrl}${pagePath}`;
  const imageUrl = normalizeImageUrl(article.imageUrl, article.canonicalUrl ?? article.url) ?? undefined;

  return {
    title,
    description,
    alternates: {
      canonical: pagePath,
      languages: {
        it: `/it/articles/${articleId}`,
        en: `/en/articles/${articleId}`,
        "x-default": `/it/articles/${articleId}`,
      },
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: pageUrl,
      siteName: "Ager",
      locale,
      publishedTime: article.publishedAt ?? undefined,
      images: imageUrl ? [{ url: imageUrl, alt: article.title }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: "it" | "en"; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "articleDetail" });
  const tFeedCard = await getTranslations({ locale, namespace: "feed.card" });
  const articleId = Number(id);
  if (!Number.isFinite(articleId)) notFound();

  const article = await getArticleSafe(articleId);
  if (!article) notFound();

  const href = article.canonicalUrl ?? article.url;
  const normalizedImageUrl = normalizeImageUrl(article.imageUrl, href);
  const rawLang = (article.lang ?? "").trim();
  const primaryLang = rawLang ? rawLang.split(/[-_]/)[0].toLowerCase() : "";
  const languageLabel =
    primaryLang === "it"
      ? t("languageNames.it")
      : primaryLang === "en"
        ? t("languageNames.en")
        : rawLang
          ? rawLang.toUpperCase()
          : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-3 text-sm text-muted-foreground">
        <Link href={`/${locale}/search`} className="hover:underline">
          ← {t("backToSearch")}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold leading-snug">{article.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {article.sourceName && <span>{article.sourceName}</span>}
        {article.publishedAt && (
          <>
            {article.sourceName && <span>•</span>}
            <span>{new Date(article.publishedAt).toLocaleString(locale)}</span>
          </>
        )}

        {languageLabel && (
          <>
            {(article.sourceName || article.publishedAt) && <span>•</span>}
            <span>
              {t("languageLabel")}: {languageLabel}
            </span>
          </>
        )}

        {article.paywallDetected && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {tFeedCard("paywallBadge")}
          </span>
        )}
      </div>

      {normalizedImageUrl && (
        <div className="mt-4">
          <ResilientImage
            src={normalizedImageUrl}
            alt=""
            width={1200}
            height={630}
            className="w-full rounded-md object-cover"
          />
        </div>
      )}

      {article.excerpt && (
        <p className="mt-4 text-sm text-muted-foreground">{article.excerpt}</p>
      )}

      <ArticleActions href={href} />
    </div>
  );
}
