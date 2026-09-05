import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import StickyCta from "./marketing/StickyCta.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import { usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import { LocalizedLink, useActiveLocale } from "./i18n/locale-routing.jsx";
import { withLocalePrefix } from "./i18n/locale-path.js";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/lp-accordion.jsx";
import { LEGAL_ENTITY } from "./lib/legal-entity.js";
import "./theme/public.css";

const CONTACT_EMAIL = LEGAL_ENTITY.email;

export default function ContactPage() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const crumbs = [{ label: tc("footer.home"), href: "/" }, { label: tc("nav.contact") }];
  const faqItems = [1, 2, 3].map((n) => ({
    id: `contact-faq-${n}`,
    q: t(`faq.q${n}`),
    a: t(`faq.a${n}`),
  }));

  usePageSeo({
    title: t("contactPage.metaTitle"),
    description: t("contactPage.metaDescription"),
    path: "/contact",
    jsonLd: breadcrumbJsonLd(crumbs),
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sendContact = async (e) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      company,
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("contactPage.sendError"));
      }
      setStatus("ok");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      navigate(withLocalePrefix("/merci", locale), { replace: true });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.message || t("contactPage.sendError"));
    }
  };

  const sending = status === "sending";

  return (
    <div className="ms-root">
      <PublicNav />
      <main className="ms-contact">
        <div className="ms-contact-wrap">
           <Breadcrumb items={crumbs} />
          <div className="ms-contact-grid">
            <section>
              <p className="ms-pricing-kicker">{t("contactPage.eyebrow")}</p>
              <h1 className="ms-pricing-h1">{t("contactPage.h1")}</h1>
              <p className="ms-pricing-lead">{t("contactPage.lead")}</p>
              <p className="ms-contact-direct">
                {t("contactPage.direct")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <Mail size={16} aria-hidden />
                  {CONTACT_EMAIL}
                </a>
              </p>

              <div className="ms-contact-faq">
                <h2 className="ms-contact-faq-title">{t("faq.label")}</h2>
                <Accordion type="single" collapsible className="ms-faq-list">
                  {faqItems.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="ms-faq-item">
                      <AccordionTrigger>
                        <span>{item.q}</span>
                        <ChevronDown size={16} color="var(--ms-primary)" aria-hidden />
                      </AccordionTrigger>
                      <AccordionContent>{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <p className="ms-contact-faq-more">
                  <LocalizedLink to="/faq" className="ms-contact-link">
                    {t("contactPage.allFaq")}
                    <ArrowRight size={14} aria-hidden />
                  </LocalizedLink>
                </p>
              </div>
            </section>

            <section className="ms-contact-card" aria-labelledby={`${formId}-title`}>
              <h2 id={`${formId}-title`} className="ms-contact-form-title">
                {t("contactPage.formTitle")}
              </h2>
              <p className="ms-contact-form-lead">{t("contactPage.formLead")}</p>

              <form className="ms-contact-form" onSubmit={sendContact} noValidate={false}>
                <div className="ms-sr-only">
                  <label htmlFor={`${formId}-company`}>{t("contactPage.honeypot")}</label>
                  <input
                    id={`${formId}-company`}
                    type="text"
                    name="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="ms-contact-row">
                  <Field
                    id={`${formId}-name`}
                    label={t("contactPage.name")}
                    autoComplete="name"
                    placeholder={t("contactPage.namePh")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={sending}
                  />
                  <Field
                    id={`${formId}-email`}
                    label={t("contactPage.email")}
                    type="email"
                    autoComplete="email"
                    placeholder={t("contactPage.emailPh")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={sending}
                  />
                </div>
                <Field
                  id={`${formId}-subject`}
                  label={t("contactPage.subject")}
                  autoComplete="off"
                  placeholder={t("contactPage.subjectPh")}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={sending}
                />
                <Field
                  id={`${formId}-message`}
                  label={t("contactPage.message")}
                  as="textarea"
                  placeholder={t("contactPage.messagePh")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={sending}
                />

                {status === "error" && (
                  <p className="ms-pricing-error" role="alert">
                    {errorMsg}
                  </p>
                )}

                <p className="ms-contact-privacy">{t("contactPage.privacy")}</p>

                <button type="submit" className="ms-btn" disabled={sending}>
                  {sending ? t("contactPage.sending") : t("contactPage.send")}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}

function Field({ id, label, as = "input", ...props }) {
  const Tag = as === "textarea" ? "textarea" : "input";
  return (
    <div className="ms-field">
      <label htmlFor={id}>{label}</label>
      <Tag
        id={id}
        className={as === "textarea" ? "ms-input ms-input-area" : "ms-input"}
        {...props}
      />
    </div>
  );
}
