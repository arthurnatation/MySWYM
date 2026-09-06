import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import { usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import {
  BLOG_CATEGORIES,
  PAGE_SIZE,
  articleCoverUrl,
  fetchPublishedArticles,
} from "./blogData.js";
import { usePublicCta } from "./lib/use-auth-session.js";
import "./theme/public.css";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ArticleCard({ article, t }) {
  const cover = articleCoverUrl(article);
  return (
    <LocalizedLink to={`/blog/${article.slug}`} className="ms-blog-card-link">
      <article className="ms-blog-card">
        <div className="ms-blog-card-media">
          <img src={cover} alt={article.titre || ""} width={640} height={400} loading="lazy" />
        </div>
        <div className="ms-blog-card-body">
          {article.categorie ? <span className="ms-blog-tag">{article.categorie}</span> : null}
          <h2>{article.titre}</h2>
          {article.extrait ? <p>{article.extrait}</p> : null}
          <span className="ms-blog-read">
            {t("pages.blogRead")} <ArrowRight size={14} aria-hidden />
          </span>
        </div>
      </article>
    </LocalizedLink>
  );
}

export default function Blog() {
  const { t } = useTranslation("common");
  const cta = usePublicCta();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorie = searchParams.get("categorie") || null;
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const crumbs = [{ label: t("footer.home"), href: "/" }, { label: t("nav.blog") }];

  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  usePageSeo({
    title: t("pages.blogMetaTitle"),
    description: t("pages.blogMetaDesc"),
    path: "/blog",
    jsonLd: breadcrumbJsonLd(crumbs),
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublishedArticles({ categorie, page }).then((res) => {
      if (cancelled) return;
      setArticles(res.articles);
      setTotal(res.total);
      setPageCount(res.pageCount);
      setLoading(false);
      if (res.page !== page) {
        const next = new URLSearchParams(searchParams);
        if (res.page <= 1) next.delete("page");
        else next.set("page", String(res.page));
        setSearchParams(next, { replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [categorie, page]);

  const setCategorie = (cat) => {
    const next = new URLSearchParams();
    if (cat) next.set("categorie", cat);
    setSearchParams(next);
  };

  const goPage = (p) => {
    const next = new URLSearchParams(searchParams);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="ms-root">
      <PublicNav />
      <header className="ms-blog-hero">
        <div className="ms-blog-wrap">
           <Breadcrumb items={crumbs} />
          <p className="ms-pricing-kicker">{t("nav.blog")}</p>
          <h1 className="ms-pricing-h1">
            {t("pages.blogHeading")}
            <br />
            {t("pages.blogHeading2")}
          </h1>
          <p className="ms-pricing-lead">{t("pages.blogLead")}</p>
        </div>
      </header>

      <main className="ms-blog-main">
        <div className="ms-blog-wrap">
          <div className="ms-blog-filters" role="group" aria-label={t("pages.blogFilterAria")}>
            <FilterChip active={!categorie} onClick={() => setCategorie(null)} label={t("pages.blogAll")} />
            {BLOG_CATEGORIES.map((cat) => (
              <FilterChip key={cat} active={categorie === cat} onClick={() => setCategorie(cat)} label={cat} />
            ))}
          </div>

          {loading ? (
            <div className="ms-blog-grid" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((n) => (
                <div key={n} className="ms-blog-skel" />
              ))}
              <p className="ms-sr-only">{t("pages.blogListLoading")}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="ms-blog-empty">
              <p className="ms-blog-empty-title">{t("pages.blogEmptyTitle")}</p>
              <p>{t("pages.blogEmptyBody")}</p>
            </div>
          ) : (
            <>
              <div className="ms-blog-grid">
                {articles.map((article) => (
                  <ArticleCard key={article.id || article.slug} article={article} t={t} />
                ))}
              </div>

              {pageCount > 1 && (
                <nav className="ms-blog-pager" aria-label={t("pages.blogPagination")}>
                  <button type="button" className="ms-btn ms-btn-ghost" onClick={() => goPage(page - 1)} disabled={page <= 1}>
                    <ChevronLeft size={16} aria-hidden /> {t("pages.blogPrev")}
                  </button>
                  <span>
                    {t("pages.blogPage", { page, count: pageCount })}
                    {" · "}
                    {t("pages.blogArticleCount", { count: total })}
                  </span>
                  <button type="button" className="ms-btn ms-btn-ghost" onClick={() => goPage(page + 1)} disabled={page >= pageCount}>
                    {t("pages.blogNext")} <ChevronRight size={16} aria-hidden />
                  </button>
                </nav>
              )}

              {pageCount === 1 && total > 0 && total <= PAGE_SIZE && (
                <p className="ms-blog-count">{t("pages.blogArticleCount", { count: total })}</p>
              )}
            </>
          )}
        </div>
      </main>

      <section className="ms-pricing-final">
        <div className="ms-blog-wrap">
          <h2 className="ms-pricing-h2">{t("pages.blogCtaTitle")}</h2>
          <p className="ms-pricing-sub">{t("pages.blogCtaLead")}</p>
          <LocalizedLink to={cta.href} className="ms-btn">
            {t("pages.blogCta")} <ArrowRight size={15} aria-hidden />
          </LocalizedLink>
        </div>
      </section>

      <Footer />
      <StickyCta />
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button type="button" className={`ms-blog-chip${active ? " is-on" : ""}`} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}
