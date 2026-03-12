import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getArticlePublic } from "@/lib/api/articles";
import ArticleActions from "./ArticleActions";
import ResilientImage from "@/components/media/ResilientImage";
import { normalizeImageUrl } from "@/lib/images/normalize";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: "it" | "en"; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "articleDetail" });
  const articleId = Number(id);
  if (!Number.isFinite(articleId)) notFound();

  let article;
  try {
    article = await getArticlePublic(articleId);
  } catch {
    notFound();
  }

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
