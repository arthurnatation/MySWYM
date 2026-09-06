import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import { LocalizedLink, useActiveLocale } from "./i18n/locale-routing.jsx";
import { withLocalePrefix } from "./i18n/locale-path.js";
import { SITE_ORIGIN, usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import { useTranslation } from "react-i18next";
import { articleCoverUrl, fetchArticleBySlug, fetchRelatedArticles } from "./blogData.js";
import { usePublicCta } from "./lib/use-auth-session.js";
import "./theme/public.css";

function ogImageForCover(cover) {
  if (!cover) return undefined;
  if (/^https?:\/\//i.test(cover)) return cover;
  return `${SITE_ORIGIN}${cover.startsWith("/") ? cover : `/${cover}`}`;
}

function ArticleSeo({ article, cover }) {
  const { t } = useTranslation("common");
  const crumbs = [
    { label: t("footer.home"), href: "/" },
    { label: t("nav.blog"), href: "/blog" },
    { label: article?.titre || t("nav.blog") },
  ];
  usePageSeo({
    title: article ? `${article.titre} | MySWYM` : "Article | MySWYM",
    description: article?.extrait || article?.titre || "Article natation MySWYM",
    path: article?.slug ? `/blog/${article.slug}` : "/blog",
    image: ogImageForCover(cover),
    jsonLd: breadcrumbJsonLd(crumbs),
  });
  return null;
}

function ArticleBody({ contenu }) {
  const blocks = String(contenu || "")
    .trim()
    .split(/\n\n+/);

  return (
    <>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="ms-post-h2">
              {trimmed.slice(3)}
            </h2>
          );
        }

        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
          return (
            <h3 key={i} className="ms-post-h3">
              {trimmed.slice(2, -2)}
            </h3>
          );
        }

        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="ms-post-p">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
          </p>
        );
      })}
    </>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const locale = useActiveLocale();
  const { t } = useTranslation("common");
  const cta = usePublicCta();
  const [article, setArticle] = useState(undefined);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setArticle(undefined);
    window.scrollTo(0, 0);

    fetchArticleBySlug(slug).then(async (data) => {
      if (cancelled) return;
      setArticle(data);
      if (data) {
        const rel = await fetchRelatedArticles(data.slug, data.categorie, 2);
        if (!cancelled) setRelated(rel);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (article === undefined) {
    return (
      <div className="ms-root">
        <PublicNav />
        <p className="ms-blog-loading">{t("pages.blogLoading")}</p>
      </div>
    );
  }

  if (!article) return <Navigate to={withLocalePrefix("/blog", locale)} replace />;

  const cover = articleCoverUrl(article);

  return (
    <div className="ms-root">
      <ArticleSeo article={article} cover={cover} />
      <PublicNav />

      <header className="ms-post-hero">
        <div className="ms-post-wrap">
          <Breadcrumb
            items={[
              { label: t("footer.home"), href: "/" },
              { label: t("nav.blog"), href: "/blog" },
              { label: article.titre },
            ]}
          />
          <LocalizedLink to="/blog" className="ms-contact-link">
            <ArrowLeft size={14} aria-hidden /> {t("pages.blogBack")}
          </LocalizedLink>
          {article.categorie ? <p className="ms-blog-tag ms-post-tag">{article.categorie}</p> : null}
          <h1 className="ms-post-title">{article.titre}</h1>
          <div className="ms-post-cover">
            <img src={cover} alt="" width={1200} height={675} />
          </div>
          {article.extrait ? <p className="ms-post-excerpt">{article.extrait}</p> : null}
        </div>
      </header>

      <article className="ms-post-body">
        <div className="ms-post-wrap">
          <ArticleBody contenu={article.contenu} />
          <div className="ms-post-cta">
            <h2>{t("pages.blogCtaTitle")}</h2>
            <p>{t("pages.blogCtaLead")}</p>
            <LocalizedLink to={cta.href} className="ms-btn">
              {t("pages.blogCta")} <ArrowRight size={15} aria-hidden />
            </LocalizedLink>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <aside className="ms-post-related">
          <div className="ms-post-wrap">
            <h2>{t("pages.blogRelated")}</h2>
            <div className="ms-post-related-grid">
              {related.map((p) => (
                <LocalizedLink key={p.slug} to={`/blog/${p.slug}`} className="ms-blog-card-link">
                  <article className="ms-blog-card ms-blog-card-sm">
                    <div className="ms-blog-card-media">
                      <img src={articleCoverUrl(p)} alt="" width={480} height={240} loading="lazy" />
                    </div>
                    <div className="ms-blog-card-body">
                      {p.categorie ? <span className="ms-blog-tag">{p.categorie}</span> : null}
                      <h3>{p.titre}</h3>
                      <span className="ms-blog-read">
                        {t("pages.blogRead")} <ChevronRight size={12} aria-hidden />
                      </span>
                    </div>
                  </article>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </aside>
      )}

      <Footer />
      <StickyCta />
    </div>
  );
}
