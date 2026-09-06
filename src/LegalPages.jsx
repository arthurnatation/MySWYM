import PublicNav from "./PublicNav.jsx";
import Footer from "./Footer.jsx";
import Breadcrumb from "./marketing/Breadcrumb.jsx";
import CookiePreferencesPanel from "./marketing/CookiePreferences.jsx";
import { LocalizedLink } from "./i18n/locale-routing.jsx";
import { usePageSeo, breadcrumbJsonLd } from "./lib/seo.js";
import { useTranslation } from "react-i18next";
import { LEGAL_ENTITY } from "./lib/legal-entity.js";
import "./theme/public.css";

const host = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
};

function LegalLayout({ title, subtitle, path, description, children, after }) {
  const { t } = useTranslation("common");
  const crumbs = [{ label: t("footer.home"), href: "/" }, { label: title }];
  usePageSeo({
    title: `${title} | MySWYM`,
    description: description || subtitle,
    path,
    jsonLd: breadcrumbJsonLd(crumbs),
  });
  return (
    <div className="ms-root">
      <PublicNav />
      <main className="ms-legal-main">
        <div className="ms-legal-wrap">
           <Breadcrumb items={crumbs} />
          <p className="ms-pricing-kicker">{t("footer.legal")}</p>
          <h1 className="ms-legal-h1">{title}</h1>
          <p className="ms-legal-lead">{subtitle}</p>
          <p className="ms-legal-meta">{t("pages.legalUpdated", { date: LEGAL_ENTITY.lastUpdated })}</p>
          <p className="ms-legal-meta ms-legal-meta-last">{t("pages.legalFrNotice")}</p>
          <div className="ms-legal-card">{children}</div>
          {after ? <div className="ms-legal-after">{after}</div> : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function H({ children }) {
  return <h2 className="ms-legal-h2">{children}</h2>;
}

function H3({ children }) {
  return <h3 className="ms-legal-h3">{children}</h3>;
}

function P({ children }) {
  return <p className="ms-legal-p">{children}</p>;
}

function Ul({ items }) {
  return (
    <ul className="ms-legal-ul">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

function Strong({ children }) {
  return <strong className="ms-legal-strong">{children}</strong>;
}

function Mail({ to }) {
  return <a className="ms-legal-a" href={`mailto:${to}`}>{to}</a>;
}

function PublisherBlock() {
  const { tradeName, commercialName, publisher, legalForm, email, siret, address, vatNumber, apeCode } = LEGAL_ENTITY;
  return (
    <Ul items={[
      <>Éditeur / vendeur : <Strong>{publisher}</Strong>, {legalForm}, nom commercial <Strong>{commercialName || tradeName}</Strong>, éditeur de l’application <Strong>{tradeName}</Strong></>,
      <>Contact : <Mail to={email} /></>,
      <>SIRET : {siret}</>,
      <>Adresse : {address}</>,
      apeCode ? <>Code APE : {apeCode}</> : null,
      <>TVA : {vatNumber}</>,
    ].filter(Boolean)} />
  );
}

function MediatorBlock() {
  const { mediatorName, mediatorWebsite, mediatorAddress, email } = LEGAL_ENTITY;
  const pending = !mediatorName || String(mediatorName).includes("À CONFIRMER");
  if (pending) {
    return (
      <P>
        <span className="ms-legal-warn">
          [MÉDIATEUR À CONFIRMER]
        </span>
        {" "}Les coordonnées du médiateur de la consommation seront publiées ici dès inscription.
        En attendant, adressez votre réclamation écrite à <Mail to={email} />.
      </P>
    );
  }
  return (
    <Ul items={[
      <>Médiateur : {mediatorName}</>,
      mediatorWebsite ? <>Site : <a href={mediatorWebsite} className="ms-legal-a">{mediatorWebsite}</a></> : null,
      mediatorAddress ? <>Adresse : {mediatorAddress}</> : null,
    ].filter(Boolean)} />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MENTIONS LÉGALES (LCEN)
═══════════════════════════════════════════════════════════════════════════ */
export function MentionsLegalesPage() {
  const { tradeName, commercialName, publisher, email, site, supportEmail, subprocessors } = LEGAL_ENTITY;
  return (
    <LegalLayout title="Mentions légales" subtitle={`Informations légales | ${site.replace("https://", "")}`} path="/mentions-legales" description="Éditeur, hébergeur et mentions légales du site MySWYM.">
      <P>
        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN),
        les informations suivantes sont portées à la connaissance des utilisateurs.
      </P>

      <H>1. Éditeur du site et de l’application</H>
      <PublisherBlock />
      <P>
        Directeur de la publication : <Strong>{publisher}</Strong> ({commercialName}).
      </P>

      <H>2. Hébergement et sous-traitants techniques</H>
      <Ul items={[
        <>Front / CDN : <Strong>{host.name}</Strong> : {host.address}. Site : {host.website}. DPA : <a href="https://vercel.com/legal/dpa" className="ms-legal-a">vercel.com/legal/dpa</a>.</>,
        <>Authentification, base de données et stockage : <Strong>Supabase</Strong>. DPA : <a href="https://supabase.com/legal/dpa" className="ms-legal-a">supabase.com/legal/dpa</a>.</>,
        <>Paiements : <Strong>Stripe</Strong> (MySWYM ne stocke pas les numéros de carte). DPA : <a href="https://stripe.com/legal/dpa" className="ms-legal-a">stripe.com/legal/dpa</a>.</>,
      ]} />
      {(subprocessors || []).length > 0 && (
        <P>
          Sous-traitants principaux : {(subprocessors || []).map((s) => s.name).join(", ")}.
        </P>
      )}

      <H>3. Contact</H>
      <P>
        Questions générales : <Mail to={email} /> · Support : <Mail to={supportEmail} />.
      </P>

      <H>4. Propriété intellectuelle</H>
      <P>
        L’ensemble des éléments du site et de l’application {tradeName} (textes, visuels, logo, structure, code,
        modèles de séances, méthodologie d’entraînement) est protégé par le Code de la propriété intellectuelle.
        Toute reproduction, représentation, extraction ou exploitation non autorisée est interdite.
      </P>

      <H>5. Documents connexes</H>
      <Ul items={[
        <LocalizedLink key="cgu" to="/cgu" className="ms-legal-a">Conditions générales d’utilisation (CGU)</LocalizedLink>,
        <LocalizedLink key="cgv" to="/cgv" className="ms-legal-a">Conditions générales de vente (CGV)</LocalizedLink>,
        <LocalizedLink key="priv" to="/politique-confidentialite" className="ms-legal-a">Politique de confidentialité</LocalizedLink>,
        <LocalizedLink key="cook" to="/politique-cookies" className="ms-legal-a">Politique de cookies</LocalizedLink>,
      ]} />
    </LegalLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   POLITIQUE DE CONFIDENTIALITÉ
═══════════════════════════════════════════════════════════════════════════ */
export function PolitiqueConfidentialitePage() {
  const { tradeName, publisher, email, supportEmail, dpoEmail, site } = LEGAL_ENTITY;
  return (
    <LegalLayout title="Politique de confidentialité" subtitle={`Traitement des données personnelles | ${tradeName}`} path="/politique-confidentialite" description="Données collectées, finalités, droits RGPD et contact pour MySWYM.">
      <P>
        La présente politique décrit comment {publisher} ({tradeName}) traite vos données personnelles
        lorsque vous utilisez {site} et l’application associée, conformément au Règlement (UE) 2016/679 (RGPD)
        et à la loi n° 78-17 du 6 janvier 1978 modifiée (« Informatique et Libertés »).
      </P>
      <P>
        Cette politique est cohérente avec le fonctionnement réel du produit au {LEGAL_ENTITY.lastUpdated}.
        Si une fonctionnalité évolue, la présente page sera mise à jour.
      </P>

      <H>1. Responsable du traitement</H>
      <PublisherBlock />
      <P>Contact données personnelles / droits : <Mail to={dpoEmail || email} />.</P>

      <H>2. Données collectées et finalités</H>
      <P>Le tableau ci-dessous résume les traitements principaux :</P>

      <H3>2.1 Compte et authentification</H3>
      <Ul items={[
        "Données : e-mail, mot de passe (hashé par le prestataire d’auth), éventuels prénom / avatar, métadonnées de connexion.",
        "Connexion sociale : Google (Apple annoncé comme à venir dans le produit) : identité et e-mail transmis via Supabase Auth si vous choisissez ce mode.",
        "Finalité : création et sécurisation du compte, accès au service.",
        "Base légale : exécution du contrat (art. 6.1.b RGPD).",
        "Durée : durée du compte ; suppression à la demande ou après inactivité prolongée (voir §5).",
      ]} />

      <H3>2.2 Profil sportif et plans d’entraînement</H3>
      <Ul items={[
        "Données : objectif, niveau, fréquence, durée de séance, longueur de bassin, matériel, allures, historique de séances, feedback de difficulté.",
        "Finalité : génération rule-based des plans / séances et adaptation progressive.",
        "Base légale : exécution du contrat.",
        "Important : MySWYM n’utilise pas d’IA générative pour créer les séances dans l’application ; le moteur est fondé sur des règles métier.",
      ]} />

      <H3>2.3 Données de santé (article 9 RGPD)</H3>
      <P>
        MySWYM traite certaines <Strong>données concernant la santé</Strong> uniquement avec votre
        <Strong> consentement explicite</Strong> (art. 9.2.a RGPD), recueilli via un écran dédié dans l’application
        (case non pré-cochée, distincte de l’acceptation des CGU).
      </P>
      <Ul items={[
        "Données concernées : (i) fréquence cardiaque par séance (notamment synchronisée via Strava lorsque vous connectez votre compte et avez consenti) ; (ii) historique de blessures / gênes déclarées (zone du corps + niveau de gravité en liste fermée) ; (iii) indicateur de douleur en feedback de séance (oui/non).",
        "Finalité : adaptation des séances (intensité / volume) et prévention du risque de blessure : aucun diagnostic médical, aucun traitement, aucun dispositif médical.",
        "Base légale : consentement explicite (art. 9.2.a), distinct du contrat / des CGU. Le refus n’empêche pas d’utiliser le service (sans adaptation santé).",
        "Caractère facultatif : vous pouvez refuser, retirer votre consentement à tout moment, ou choisir « Aucune blessure ».",
        "Minimisation : pas de champ texte libre pour un diagnostic ou un traitement ; listes fermées uniquement. Ces champs sont exclus des outils d’analytics tiers (PostHog, etc.).",
        "Destinataires : hébergement Supabase (sous-traitant) sous RLS ; pas de revente ; Strava uniquement si vous connectez votre compte.",
        "Durée de conservation : pendant la durée du compte ; suppression sous 30 jours sur demande (effacement / retrait du consentement) ; purge après 24 mois d’inactivité du compte.",
        <>Droits : accès, rectification, effacement, portabilité, retrait du consentement : exerçables par e-mail à <Mail to={email} /> ; réponse sous 1 mois (art. 12 RGPD).</>,
      ]} />

      <H3>2.4 Abonnement et paiement</H3>
      <Ul items={[
        "Données côté MySWYM : identifiants Stripe (customer / subscription), statut d’accès Premium, dates d’essai / fin de période, codes de parrainage.",
        "Données de carte : traitées exclusivement par Stripe ; MySWYM ne stocke pas le numéro de carte ni le CVC.",
        "Finalité : facturation, gestion d’abonnement, lutte contre la fraude d’abonnement, obligations comptables.",
        "Bases légales : exécution du contrat ; obligation légale (conservation comptable) ; intérêt légitime (prévention fraude abonnement).",
      ]} />

      <H3>2.5 Strava (optionnel)</H3>
      <Ul items={[
        "Données : tokens OAuth, activités synchronisées (distance, durée, etc. selon ce que Strava expose).",
        "Fréquence cardiaque : stockée uniquement si vous avez donné le consentement santé (art. 9) ; sinon la FC n’est pas conservée côté MySWYM.",
        "Finalité : lier des activités à votre historique MySWYM.",
        "Base légale : exécution du contrat pour les données d’activité non sensibles ; consentement art. 9 pour la FC.",
        "Durée : jusqu’à déconnexion Strava ou suppression du compte.",
      ]} />

      <H3>2.6 Buddy Matching (profil public sans numéro affiché)</H3>
      <Ul items={[
        "Données affichées : prénom, ville / zone, rayon, niveau, objectif, types de sortie, disponibilités, bio, avatar.",
        "Condition d’apparition : profil publié avec ville, numéro enregistré et consentement de principe de partage (le numéro n’est pas affiché dans l’annuaire).",
        "Finalité : apparaître dans l’annuaire Buddy et permettre aux autres membres de proposer une mise en relation.",
        "Base légale : exécution du contrat / intérêt légitime pour l’annuaire ; le numéro de téléphone n’est jamais affiché sur ce profil public.",
      ]} />

      <H3>2.7 Mise en relation et numéro de téléphone</H3>
      <P>
        Lorsque vous utilisez la fonctionnalité de mise en relation (Buddy), {tradeName} peut traiter un numéro
        de téléphone / WhatsApp aux conditions suivantes :
      </P>
      <Ul items={[
        "Base légale : consentement (art. 6.1.a RGPD), distinct du consentement de compte et du consentement données de santé (art. 9).",
        "Finalité limitée : faciliter la prise de contact pour une séance commune après acceptation mutuelle d’une mise en relation.",
        "Visibilité conditionnelle : le numéro n’est jamais consultable librement sur l’annuaire ; il n’est révélé aux deux parties qu’après acceptation mutuelle et consentement explicite de partage de chaque partie pour cette mise en relation.",
        "Absence de réutilisation : le numéro n’est pas utilisé à des fins publicitaires, de prospection, ni revendable à des tiers ; l’éditeur ne le publie pas.",
        "Droit de retrait : vous pouvez masquer votre numéro, révoquer le partage pour une mise en relation, ou quitter une mise en relation à tout moment depuis votre profil / l’onglet Relations ; le retrait du consentement n’affecte pas la licéité du traitement antérieur.",
        "Vérification : e-mail vérifié requis pour les demandes ; un code (SMS Twilio si configuré, sinon e-mail) confirme le numéro (phone_verified).",
        "Signalements / blocages : comptes signalés, compteur de signalements, suspension automatique Buddy au-delà du seuil (3 signalements) ; blocs mutuels.",
        "Durée : pendant la durée du compte / de la mise en relation ; suppression avec le compte ou sur retrait.",
      ]} />

      <H3>2.8 Support, contact et e-mails transactionnels</H3>
      <Ul items={[
        "Données : messages envoyés via le formulaire de contact, e-mails de bienvenue, vérification, confirmation d’abonnement, reset mot de passe.",
        "Prestataire e-mail : Resend (sous-traitant).",
        "Base légale : exécution du contrat / intérêt légitime (support) / obligation légale le cas échéant.",
      ]} />

      <H3>2.9 Mesure d’audience (PostHog), non essentiel</H3>
      <Ul items={[
        "Données : événements produit agrégés / pseudonymisés (niveau, objectif, fréquence, etc.), identifiant technique, pages vues.",
        "Exclusions techniques : e-mail, notes, contenu complet de séance, notes de blessure ne sont pas envoyés comme propriétés d’événement.",
        "Base légale : consentement (bannière cookies).",
        "Hébergement configuré : PostHog EU (eu.i.posthog.com) lorsque la clé est active.",
      ]} />

      <H3>2.10 Événements de conversion internes (Supabase)</H3>
      <Ul items={[
        "Données : nom d’événement funnel (ex. signup_started, checkout_started), chemin, referrer, propriétés non sensibles, user_id si connecté.",
        "Finalité : mesurer le parcours d’inscription / paiement pour faire fonctionner et améliorer le service.",
        "Base légale : intérêt légitime (art. 6.1.f) pour la mesure première partie nécessaire à l’exploitation : distincte de PostHog.",
        "Ces événements peuvent être enregistrés même si les cookies non essentiels sont refusés, car ils ne reposent pas sur des traceurs publicitaires tiers.",
      ]} />

      <H3>2.11 Données techniques</H3>
      <Ul items={[
        "Logs de sécurité, préférences locales (consentement cookies, caches de plan avant connexion, code ?ref=), session d’auth.",
        "Polices : Geist et Space Grotesk auto-hébergées (pas de requête Google Fonts sur le site public).",
        "Vercel Speed Insights : métriques de performance du site (voir politique cookies).",
      ]} />

      <H3>2.12 Avis publics (landing)</H3>
      <Ul items={[
        "Données : prénom, note (1-5), texte de l’avis, e-mail facultatif (non publié).",
        "Finalité : afficher des avis réels sur le site après modération manuelle ; aucun avis n’est publié automatiquement.",
        "Base légale : intérêt légitime (art. 6.1.f) pour la preuve sociale, ou consentement du dépôt du formulaire.",
        "Durée : jusqu’à suppression de l’avis ou du compte / sur demande.",
        "Pas de Google Analytics : la mesure d’audience reste PostHog (si consentement cookies).",
      ]} />

      <H>3. Destinataires / sous-traitants</H>
      <Ul items={[
        <>Supabase : auth, base de données, stockage avatars : DPA : <a href="https://supabase.com/legal/dpa" className="ms-legal-a">supabase.com/legal/dpa</a>.</>,
        <>Stripe : paiement et portail client : DPA : <a href="https://stripe.com/legal/dpa" className="ms-legal-a">stripe.com/legal/dpa</a>.</>,
        <>Vercel : hébergement front : DPA : <a href="https://vercel.com/legal/dpa" className="ms-legal-a">vercel.com/legal/dpa</a>.</>,
        "PostHog : analytics produit (si consentement cookies) : sans données de santé.",
        "Resend : envoi d’e-mails.",
        "Google : OAuth uniquement (si choisi). Les polices du site public sont auto-hébergées.",
        "Strava : uniquement si connecté.",
      ]} />
      <P>
        Des transferts hors UE peuvent avoir lieu (notamment États-Unis via Vercel, Stripe, Google).
        Des garanties appropriées sont recherchées auprès des prestataires (ex. clauses contractuelles types / DPA).
      </P>

      <H>4. Transferts hors Union européenne</H>
      <P>
        Lorsque des données sont traitées hors UE/EEE, {tradeName} s’appuie sur les mécanismes prévus par le RGPD
        (décision d’adéquation, clauses contractuelles types, ou autre garantie appropriée).
        Pour toute question : <Mail to={email} />.
      </P>

      <H>5. Durées de conservation</H>
      <Ul items={[
        "Compte, profil sportif, plans : durée d’utilisation du compte ; purge après 24 mois d’inactivité.",
        "Données de santé (FC, blessures) : durée du compte ; suppression sous 30 jours sur demande / retrait du consentement ; purge après 24 mois d’inactivité.",
        "Données de facturation / preuves de transaction : durée légale comptable (en pratique jusqu’à 10 ans).",
        "Strava : jusqu’à déconnexion ou suppression du compte.",
        "Consentement cookies : jusqu’à retrait ou effacement des données du navigateur.",
        "Buddy / numéro de téléphone : durée du compte ou jusqu’au retrait du consentement / masquage ; connexions et signalements purgés avec le compte.",
        "Logs de sécurité : durée limitée nécessaire à la sécurité.",
      ]} />

      <H>6. Vos droits</H>
      <P>
        Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition,
        de portabilité, et du droit de retirer votre consentement à tout moment (sans affecter la licéité
        du traitement antérieur). Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).
      </P>
      <P>
        Pour exercer vos droits (y compris données de santé) : <Mail to={email} /> : réponse sous 1 mois.
        Vous pouvez aussi supprimer votre compte depuis les paramètres de l’application.
      </P>

      <H>7. Sécurité</H>
      <P>
        Accès authentifié (JWT), écriture des droits d’abonnement côté serveur, paiements via Stripe,
        politiques d’accès en base (RLS) sur les données utilisateur. Aucune mesure n’est infaillible ;
        signalez tout incident à <Mail to={supportEmail} />.
      </P>

      <H>8. Mineurs</H>
      <P>
        Le service est réservé aux personnes âgées de <Strong>18 ans et plus</Strong>.
        Aucune inscription n’est autorisée pour les mineurs. Lors de la création de compte, vous confirmez avoir 18 ans révolus.
        {tradeName} ne collecte pas volontairement de données de mineurs ; en cas de doute, le compte pourra être fermé.
      </P>

      <H>9. Communications marketing</H>
      <P>
        Les e-mails transactionnels (compte, paiement, sécurité) sont envoyés indépendamment d’un consentement marketing.
        Aucune campagne publicitaire e-mail / SMS marketing automatisée grand public n’est présentée comme active
        dans le produit au moment de cet audit, hors outils internes. Toute communication commerciale future
        respectera le consentement ou l’intérêt légitime applicable et un mécanisme de désinscription.
      </P>

      <H>10. Modifications</H>
      <P>
        Cette politique peut être mise à jour. La date en tête de page fait foi. En cas de changement substantiel,
        une information pourra être affichée dans l’application ou envoyée par e-mail.
      </P>

      <H>11. Contact</H>
      <P><Mail to={email} /> · <Mail to={supportEmail} /></P>
    </LegalLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CGU
═══════════════════════════════════════════════════════════════════════════ */
export function CguPage() {
  const { tradeName, email, supportEmail, site, publisher } = LEGAL_ENTITY;
  return (
    <LegalLayout title="CGU" subtitle={`Conditions générales d'utilisation | ${tradeName}`} path="/cgu" description="Conditions générales d'utilisation de l'application MySWYM.">
      <P>
        Les présentes Conditions générales d’utilisation (CGU) régissent l’accès et l’utilisation de {site}
        et de l’application {tradeName}, édités par {publisher}.
        En créant un compte ou en utilisant le service, vous acceptez ces CGU.
        Les conditions commerciales de l’abonnement Premium sont détaillées dans les{" "}
        <LocalizedLink to="/cgv" className="ms-legal-a">CGV</LocalizedLink>.
      </P>

      <H>1. Objet du service</H>
      <P>
        {tradeName} est un <Strong>service numérique de génération de séances et de plans d’entraînement de natation</Strong>,
        fondé sur un moteur de règles métier (rule-based). Ce n’est pas :
      </P>
      <Ul items={[
        "un service médical, un dispositif médical, un diagnostic ou un suivi thérapeutique ;",
        "un kinésithérapeute, médecin, ou tout professionnel de santé ;",
        "une école de natation garantissant l’apprentissage du geste de A à Z ;",
        "un coach présent physiquement au bord du bassin ou en eau libre ;",
        "une garantie de performance, de résultat (chrono, diplôme, perte de poids, réussite d’examen) ou de sécurité sportive.",
      ]} />
      <P>
        Les contenus proposés sont des <Strong>recommandations d’entraînement à titre informatif et éducatif</Strong>.
        Vous restez seul responsable de la décision de les suivre et des conditions dans lesquelles vous pratiquez.
      </P>

      <H>2. Accès et éligibilité</H>
      <Ul items={[
        "Le service est destiné aux personnes majeures (18 ans révolus).",
        "Vous devez disposer de la capacité juridique pour contracter.",
        "Certaines fonctionnalités (génération de plan, détail des exercices, départs chronométrés, adaptation feedback) nécessitent un abonnement Premium : voir CGV et page Tarifs.",
        "Sans abonnement actif, un aperçu limité (squelette) peut rester visible, sans accès complet aux exercices ni génération de nouveaux programmes.",
      ]} />

      <H>3. Compte utilisateur</H>
      <Ul items={[
        "Création : e-mail + mot de passe, ou connexion Google (Apple à venir si activé).",
        "Exactitude : vous vous engagez à fournir des informations exactes et à les tenir à jour.",
        "Déclaration sur l’honneur (santé) : lorsque vous renseignez des données de santé (FC, blessure / gêne), vous certifiez l’exactitude des informations fournies, à l’inscription et à chaque mise à jour.",
        <>Sécurité : vous maintenez la confidentialité de vos identifiants et notifiez {tradeName} en cas d’usage non autorisé (<Mail to={email} />).</>,
        "Usage personnel : un compte = une personne physique ; le partage d’un accès Premium à des tiers non autorisés est interdit.",
        <>Suspension / résiliation par {tradeName} : en cas de violation des CGU, usage frauduleux, fausses déclarations répétées, tentative d’accès non autorisé aux données d’autrui, fraude (paiement, parrainage), atteinte à la sécurité, ou injonction légale.</>,
        <>Suppression : vous pouvez supprimer votre compte depuis les paramètres de l’application ou en écrivant à <Mail to={email} />.</>,
      ]} />

      <H>4. Utilisation autorisée et interdite</H>
      <P>Vous vous engagez à utiliser le service de manière loyale et conforme à la loi. Sont notamment interdits :</P>
      <Ul items={[
        "toute atteinte à la sécurité, intrusion, scraping abusif, reverse engineering malveillant, surcharge des serveurs ;",
        "usurpation d’identité, fraude au paiement ou au parrainage, multi-comptes destinés à contourner l’essai ou la facturation ;",
        "revente, republication massive ou extraction automatisée des contenus / plans sans accord écrit ;",
        "diffusion de contenus illicites via les canaux de contact ou de mise en relation ;",
        "toute utilisation du service comme substitut à un avis médical.",
      ]} />

      <H>5. Génération des programmes</H>
      <P>
        Les plans sont générés automatiquement à partir des informations que vous renseignez (objectif, niveau,
        fréquence, bassin, matériel, éventuelle blessure/gêne, feedbacks). Le moteur adapte ensuite certaines séances
        selon des règles internes (progression, récupération, sécurité douleur, etc.).
      </P>
      <P>
        <Strong>MySWYM ne régénère pas silencieusement les semaines déjà générées d’un plan existant</Strong>
        au détriment de votre progression, sauf action explicite de votre part ou migration technique nécessaire
        communiquée. Les métadonnées de version de plan ne remplacent pas cette règle de préservation.
      </P>

      <H>6. Sport, santé et sécurité : avertissements</H>
      <P>
        <Strong>Avertissement médical :</Strong> les plans générés sont fournis à titre indicatif et ne remplacent pas
        l’avis d’un professionnel de santé. L’utilisateur est seul responsable de vérifier son aptitude physique,
        y compris par un certificat médical si nécessaire, avant de suivre le programme.
      </P>
      <P>
        La natation et l’entraînement sportif comportent des risques intrinsèques (blessures, malaise, noyade,
        conditions de bassin ou d’eau libre, etc.). Avant de suivre un programme :
      </P>
      <Ul items={[
        "évaluez votre aptitude physique ; en cas de doute, pathologie, grossesse, reprise après blessure ou arrêt prolongé, consultez un professionnel de santé ;",
        "arrêtez immédiatement l’exercice en cas de douleur anormale, essoufflement inhabituel, douleur thoracique, vertiges ou tout symptôme inquiétant, et consultez un professionnel de santé ;",
        "en eau libre : ne nagez jamais seul, respectez les conditions météo / courant / température, et les consignes locales de sécurité ;",
        "en piscine : respectez le règlement intérieur et les consignes des maîtres-nageurs ;",
        "utilisez un matériel adapté et en bon état.",
      ]} />
      <P>
        Si vous déclarez une blessure / gêne ou une douleur en feedback (après consentement art. 9), {tradeName} peut seulement
        <Strong> réduire l’intensité proposée</Strong>. Cela ne constitue ni un diagnostic, ni une prise en charge médicale,
        ni une garantie d’absence de risque.
      </P>

      <H>7. Contenu et propriété intellectuelle</H>
      <Ul items={[
        "Contenus {tradeName} (textes, modèles, UI, logo, code) : propriété de l’éditeur ou de ses concédants ; licence d’usage personnel non exclusive pendant la durée d’accès.",
        "Plans générés : destinés à votre usage personnel ; pas de revente ni extraction massive.",
        "Contenus utilisateur (notes, messages, avatar, données Buddy) : vous conservez vos droits ; vous concédez à {tradeName} une licence limitée pour héberger et afficher ces contenus aux fins du service.",
        "Vous garantissez disposer des droits nécessaires sur les contenus que vous fournissez.",
      ]} />

      <H>8. Disponibilité du service</H>
      <P>
        {tradeName} s’efforce d’assurer une disponibilité continue mais ne garantit pas un service ininterrompu
        (maintenance, incidents, dépendances Supabase / Stripe / Vercel / réseaux). Des bugs peuvent survenir.
        En cas d’indisponibilité prolongée imputable à {tradeName}, un avoir ou une prolongation pourra être étudié
        au cas par cas : sans préjudice des droits légaux du consommateur.
      </P>

      <H>9. Mise en relation entre utilisateurs (Buddy)</H>
      <P>
        AquaPlan / {tradeName} facilite la mise en relation entre utilisateurs souhaitant partager une séance.
        L’éditeur n’est pas responsable du comportement des utilisateurs lors de ces rencontres et décline toute
        responsabilité en cas d’incident survenu en dehors de l’application. Tout utilisateur peut être suspendu
        en cas de signalement fondé.
      </P>
      <Ul items={[
        "Le numéro de téléphone n’est jamais visible sur le profil public ; il n’est échangé qu’après acceptation mutuelle et consentement explicite de partage (distinct du compte et des données de santé).",
        "Avant la première mise en relation, un avertissement de sécurité est affiché (lieu public, informer un proche, etc.).",
        "Vous pouvez masquer votre numéro, quitter une mise en relation, bloquer ou signaler un utilisateur à tout moment.",
        "Un compteur de signalements est tenu ; au-delà d’un seuil, l’accès Buddy peut être suspendu automatiquement, sans préjudice d’autres mesures (blocage, résiliation).",
        "Un e-mail vérifié est requis ; une vérification du numéro de téléphone peut être exigée pour limiter les faux comptes.",
      ]} />

      <H>10. Responsabilité</H>
      <P>
        {tradeName} est tenu d’une obligation de moyens pour la fourniture du service numérique.
        Dans les limites autorisées par le droit français :
      </P>
      <Ul items={[
        "l’éditeur ne peut être tenu responsable des dommages résultant d’une pratique sportive inadaptée, d’un non-respect des consignes de sécurité, ou de conditions indépendantes de sa volonté (réseau, matériel de l’utilisateur, piscine, milieu naturel) ;",
        "l’éditeur ne peut être tenu responsable des conséquences d’informations erronées ou volontairement falsifiées fournies par l’utilisateur (y compris données de santé) ;",
        "l’éditeur ne garantit aucun résultat sportif ;",
        "l’éditeur n’est pas responsable des échanges, rendez-vous ou incidents entre utilisateurs hors application dans le cadre de la mise en relation Buddy (voir §9) ;",
        "rien dans les présentes CGU n’exclut ni ne limite la responsabilité en cas de faute intentionnelle ou lourde, d’atteinte à la vie / intégrité physique lorsqu’elle résulte d’une faute de l’éditeur, ni les droits impératifs du consommateur.",
      ]} />
      <P>
        En dehors des cas où la responsabilité ne peut être limitée, la responsabilité de {tradeName} est limitée
        au montant total payé par l’utilisateur au titre des 12 derniers mois précédant le fait générateur
        (ou 50 € si aucun paiement) : <Strong>sous réserve des dispositions impératives applicables aux consommateurs</Strong>.
      </P>

      <H>11. Services tiers</H>
      <P>
        Stripe, Strava, Google, Supabase et autres prestataires ont leurs propres conditions.
        {tradeName} n’est pas responsable du fonctionnement de ces services tiers au-delà de son obligation de moyens
        dans le cadre de l’intégration.
      </P>

      <H>12. Modification des CGU</H>
      <P>
        {tradeName} peut modifier les CGU. La date de mise à jour figure en tête de page.
        En cas de modification substantielle, les utilisateurs disposant d’un compte pourront être informés
        (e-mail ou notification in-app). La poursuite de l’utilisation après entrée en vigueur vaut acceptation,
        sans préjudice du droit de résilier le compte / l’abonnement si vous refusez les nouvelles conditions.
      </P>

      <H>13. Droit applicable et litiges</H>
      <P>
        Droit français. À défaut d’accord amiable, les tribunaux compétents selon les règles de procédure applicables,
        sous réserve des dispositions protectrices du consommateur (y compris le droit de saisir les tribunaux
        de son lieu de résidence).
      </P>
      <P>Contact : <Mail to={email} /> · <Mail to={supportEmail} /></P>
    </LegalLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CGV
═══════════════════════════════════════════════════════════════════════════ */
export function CgvPage() {
  const { tradeName, email, supportEmail, site } = LEGAL_ENTITY;
  return (
    <LegalLayout title="CGV" subtitle={`Conditions générales de vente | offre Premium ${tradeName}`} path="/cgv" description="Conditions générales de vente de l'offre Premium MySWYM.">
      <P>
        Les présentes Conditions générales de vente (CGV) s’appliquent aux abonnements Premium souscrits sur {site}
        par des consommateurs. Elles complètent les CGU. En cas de contradiction sur un point commercial,
        les CGV prévalent pour l’abonnement.
      </P>

      <H>1. Prestataire</H>
      <PublisherBlock />
      <P>Support : <Mail to={supportEmail} /> · Contact : <Mail to={email} />.</P>

      <H>2. Description du service Premium</H>
      <P>L’abonnement Premium donne accès, selon l’offre souscrite, notamment à :</P>
      <Ul items={[
        "la génération de plans d’entraînement complets ;",
        "le détail des exercices et consignes ;",
        "l’adaptation basée sur le feedback ;",
        "les départs chronométrés (notation D…) ;",
        "le suivi de ton plan actif (selon offre) ;",
        "les fonctionnalités Premium listées sur la page Tarifs au moment de la commande.",
      ]} />
      <P>
        Sans essai en cours ni abonnement actif, l’accès aux séances est en pause : aucun plan ni séance n’est visible.
      </P>

      <H>3. Offres et prix (TTC)</H>
      <Ul items={[
        "Essai 7 jours : offert à la création du compte, sans saisie de carte bancaire, une seule fois par compte (anti-abus). L’essai commence à la première connexion. À son terme, l’accès est interrompu (aucun contenu d’entraînement visible) jusqu’à souscription d’un abonnement payant.",
        "Mensuel sans engagement : 9,99 € TTC / mois après l’essai : sans engagement de durée ; reconduction tacite mensuelle ; résiliable à tout moment via le portail client Stripe ; accès jusqu’à la fin de la période déjà payée.",
        "Mensuel avec engagement 12 mois : 4,99 € TTC / mois après l’essai. En souscrivant, tu t’engages pour 12 mois, facturés chaque mois. Pendant ces 12 mois : aucun remboursement des mensualités, et aucune demande de résiliation ou de suppression de compte n’interrompt l’engagement ni les prélèvements avant la fin des 12 mois, hors cas légaux (rétractation encore ouverte, défaut du prestataire, autres droits impératifs). Même règle que sur la page Tarifs.",
        "Annuel : 52,99 € TTC / an : prépaiement 12 mois en un seul paiement (sans essai sur ce tunnel). Pas de remboursement au prorata une fois facturé, hors cas légaux (rétractation encore ouverte, défaut du prestataire, autres droits impératifs).",
        "Offre biennale héritée (24 mois) : Price ID Stripe legacy uniquement (plus commercialisée sur Tarifs). Conservée pour d’éventuels abonnés historiques. Les droits légaux du consommateur restent applicables.",
      ]} />
      <P>
        Prix en euros TTC. TVA : {LEGAL_ENTITY.vatNumber}.
        {" "}MySWYM peut modifier ses tarifs pour les renouvellements futurs ; le prix de la période en cours reste inchangé.
        En cas de hausse au renouvellement, une information préalable sera fournie dans la mesure du possible
        (objectif : au moins 15 jours avant).
      </P>

      <H>4. Commande et paiement</H>
      <Ul items={[
        "Le paiement est traité exclusivement par Stripe (carte bancaire).",
        "Avant redirection vers Stripe Checkout, l’application présente le prix, la périodicité, le renouvellement automatique et les liens CGU/CGV.",
        "La validation du paiement vaut commande. L’essai sans carte ne constitue pas une commande payante.",
        "Un e-mail / reçu Stripe confirme la transaction ; un e-mail de confirmation d’abonnement peut également être envoyé par MySWYM.",
      ]} />

      <H>5. Exécution et accès</H>
      <P>
        L’essai de 7 jours est ouvert dès la première connexion après création du compte, sans carte.
        L’accès Premium payant est ouvert dès validation du paiement (sous réserve du bon
        fonctionnement des webhooks Stripe). En cas de retard technique, contactez <Mail to={supportEmail} />.
      </P>

      <H>6. Renouvellement et résiliation</H>
      <Ul items={[
        "Pendant l’essai 7 jours sans carte : aucune résiliation Stripe n’est nécessaire ; l’accès s’arrête automatiquement au bout de 7 jours et l’accès aux séances est en pause.",
        "Mensuel sans engagement : renouvellement automatique sauf résiliation avant la date de renouvellement ; accès maintenu jusqu’à la fin de la période payée.",
        "Mensuel avec engagement 12 mois : les prélèvements continuent jusqu’à la fin des 12 mois. Une résiliation via le portail Stripe ou une suppression de compte avant cette échéance n’arrête pas l’engagement ni les mensualités restantes, hors cas légaux.",
        "Annuel / biennal (legacy) : prépaiement de la période ; reconduction éventuelle à l’échéance selon les conditions affichées au checkout Stripe ; résiliation avant renouvellement pour éviter une nouvelle période.",
        "Résiliation (hors engagement 12 mois en cours) : depuis Profil → Paramètres → « Gérer mon abonnement » (portail Stripe), ou via les outils Stripe Customer Portal.",
        "La suppression du compte n’équivaut pas à une résiliation anticipée de l’offre engagée 12 mois, ni à un remboursement.",
      ]} />

      <H>7. Droit de rétractation (14 jours)</H>
      <P>
        Conformément aux articles L221-18 et suivants du Code de la consommation, le consommateur dispose d’un délai
        de 14 jours pour se rétracter d’un contrat conclu à distance, sans motif, à compter de la souscription.
      </P>
      <P>
        <Strong>Commencement anticipé / contenu numérique ou service numérique :</Strong> si vous demandez
        expressément l’exécution immédiate de l’accès Premium pendant le délai de rétractation et reconnaissez
        perdre votre droit de rétractation une fois le service pleinement exécuté (accès ouvert),
        le droit de rétractation peut ne plus s’appliquer dans les conditions de l’article L221-28 du Code de la consommation.
      </P>
      <P>
        Ce consentement est recueilli dans l’application <Strong>avant</Strong> la redirection vers Stripe Checkout.
        À défaut de renonciation valable, ou si les conditions légales ne sont pas réunies, le droit de rétractation
        demeure. Pour l’exercer lorsqu’il est encore ouvert : écrivez à <Mail to={email} /> en indiquant votre e-mail de compte.
        Un formulaire type peut être demandé au support (modèle libre accepté).
      </P>

      <H>8. Remboursements</H>
      <Ul items={[
        "Essai résilié à temps : 0 €.",
        "Mensuel sans engagement : pas de remboursement au prorata de la période en cours après prélèvement, hors cas légaux.",
        "Mensuel avec engagement 12 mois : aucun remboursement des mensualités pendant l’engagement, hors cas légaux.",
        "Annuel / biennal (legacy) : pas de remboursement au prorata une fois facturé, hors cas légaux.",
        "Cas légaux : rétractation ouverte, défaut de conformité, indisponibilité substantielle imputable à MySWYM, ou autre droit impératif.",
      ]} />

      <H>9. Échec de paiement</H>
      <P>
        En cas d’échec de paiement au renouvellement, Stripe / MySWYM peuvent retenter le prélèvement.
        L’accès Premium peut être suspendu si le paiement n’est pas régularisé. Aucune « période de grâce »
        contractuelle fixe n’est garantie au-delà du comportement Stripe configuré : [À DOCUMENTER côté Stripe Billing].
      </P>

      <H>10. Programme de parrainage</H>
      <Ul items={[
        "Réservé aux comptes Premium en règle.",
        "Filleul : réduction typiquement de 20 % sur la première facture éligible (coupon Stripe), sous réserve d’éligibilité et de non-cumul.",
        "Parrain : crédit commercial d’un montant équivalent à 4,99 € sur le solde client Stripe après paiement réussi du filleul, une fois par filleul éligible.",
        "MySWYM peut refuser, suspendre ou annuler un avantage en cas de fraude, auto-parrainage, abus ou non-respect des CGU/CGV.",
      ]} />

      <H>11. Garanties légales</H>
      <P>
        Le consommateur bénéficie de la garantie légale de conformité applicable aux contenus et services numériques
        (Code de la consommation), sans préjudice d’autres droits. MySWYM s’engage à fournir le service Premium
        conforme à la description contractuelle.
      </P>

      <H>12. Responsabilité</H>
      <P>
        Les limitations de responsabilité des CGU s’appliquent, sans pouvoir écarter les responsabilités
        et garanties légales impératives au profit du consommateur. Les plans sont fournis à titre indicatif
        et ne remplacent pas l’avis d’un professionnel de santé. L’éditeur ne peut être tenu responsable
        des conséquences d’informations erronées ou volontairement falsifiées fournies par l’utilisateur.
      </P>

      <H>13. Réclamations et médiation</H>
      <P>
        Toute réclamation : <Mail to={supportEmail} /> ou <Mail to={email} />.
        En cas de litige de consommation non résolu dans un délai raisonnable après réclamation écrite,
        vous pouvez recourir gratuitement à un médiateur de la consommation :
      </P>
      <MediatorBlock />
      <P>
        Vous pouvez aussi utiliser la plateforme européenne de règlement en ligne des litiges :
        https://ec.europa.eu/consumers/odr
      </P>

      <H>14. Droit applicable</H>
      <P>
        Droit français. Tribunaux compétents selon les règles protectrices du consommateur.
      </P>
    </LegalLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   POLITIQUE COOKIES
═══════════════════════════════════════════════════════════════════════════ */
export function PolitiqueCookiesPage() {
  const { email, tradeName } = LEGAL_ENTITY;
  return (
    <LegalLayout
      title="Politique de cookies"
      subtitle={`Cookies et traceurs | ${tradeName}`}
      path="/politique-cookies"
      description="Cookies, PostHog et gestion du consentement sur MySWYM. Pas de Google Analytics."
      after={<CookiePreferencesPanel />}
    >
      <P>
        Cette politique décrit les cookies et traceurs utilisés sur {tradeName}, conformément aux lignes directrices
        de la CNIL relatives aux cookies et autres traceurs, à l’article 82 de la loi n° 78-17 du 6 janvier 1978
        (« Informatique et Libertés ») et au règlement (UE) 2016/679 (RGPD).
      </P>
      <P>
        Vous pouvez <a href="#parametrage-cookies" className="ms-legal-a">paramétrer, accepter ou refuser</a> les
        traceurs non essentiels à tout moment, en bas de cette page. Le refus est présenté de la même manière que l’acceptation.
      </P>

      <H>1. Qu’est-ce qu’un cookie / stockage local ?</H>
      <P>
        Un cookie ou un stockage local (localStorage / sessionStorage) est une donnée enregistrée sur votre appareil
        pour faire fonctionner le site, mémoriser un choix, ou, le cas échéant, mesurer l’audience.
      </P>

      <H>2. Traceurs strictement nécessaires (pas de consentement requis)</H>
      <Ul items={[
        "Session d’authentification Supabase (maintien de connexion sécurisée).",
        "Préférence de consentement cookies (clé locale myswym_cookie_consent_v1).",
        "Caches techniques de plans / onboarding avant connexion, code de parrainage (?ref= → myswym_ref).",
        "Identifiants de session internes nécessaires au fonctionnement (ex. myswym_session_id_v1 pour événements première partie).",
      ]} />

      <H>3. Traceurs soumis à consentement</H>
      <H3>3.1 PostHog (mesure d’audience produit)</H3>
      <Ul items={[
        "Fournisseur : PostHog (hébergement EU configuré : eu.i.posthog.com).",
        "Finalité : comprendre l’usage du produit (funnel, rétention, bugs UX).",
        "Type : cookies / localStorage selon configuration posthog-js (persistence localStorage+cookie).",
        "Dépôt : uniquement après activation de la mesure d’audience (bannière, popup ou module en bas de cette page).",
        "Refus : « Tout refuser », ou désactivation de la catégorie Mesure d’audience.",
        "Durée : selon configuration PostHog / jusqu’au retrait du consentement.",
      ]} />

      <H3>3.2 Polices (auto-hébergées)</H3>
      <Ul items={[
        "Polices : Geist et Space Grotesk, servies depuis le même domaine que le site (fichiers woff2).",
        "Aucune requête vers fonts.googleapis.com / fonts.gstatic.com sur le site public.",
        "Pas de transfert d’adresse IP vers Google du fait des polices.",
      ]} />

      <H3>3.3 Vercel Speed Insights</H3>
      <Ul items={[
        "Fournisseur : Vercel.",
        "Finalité : métriques de performance (Core Web Vitals).",
        "Dépôt : uniquement après activation de la catégorie Performance.",
        "Statut : mesure de performance soumise à consentement.",
      ]} />

      <H>4. Ce que MySWYM n’utilise pas (à date d’audit)</H>
      <Ul items={[
        "Pas de Meta Pixel / Facebook Pixel détecté dans le front grand public.",
        "Pas de Google Analytics (gtag) détecté.",
        "Pas de publicité comportementale tierce détectée.",
      ]} />

      <H>5. Gestion de votre choix</H>
      <P>
        Le consentement aux traceurs non essentiels est recueilli lors de votre première visite (bannière),
        via le lien « Gérer les cookies » du pied de page, et via le <Strong>module de paramétrage</Strong> situé
        en bas de la présente page. Ces trois points d’entrée ont la même valeur.
      </P>
      <P>
        Conformément aux recommandations de la CNIL, <Strong>accepter et refuser ont la même présentation</Strong>{" "}
        (même couleur, même taille, même graisse). Vous pouvez aussi activer ou désactiver chaque finalité
        (mesure d’audience, performance). Les cookies marketing ne sont pas utilisés : l’option correspondante
        reste désactivée.
      </P>
      <P>
        Vous pouvez retirer ou modifier votre consentement à tout moment, sans frais, aussi facilement que vous l’avez
        donné. Le retrait n’affecte pas la licéité du traitement effectué avant ce retrait
        (RGPD, article 7, paragraphe 3).
      </P>
      <P>
        Votre choix est mémorisé localement (clé <code>myswym_cookie_consent_v1</code>). Les traceurs strictement
        nécessaires ne sont pas soumis à consentement. PostHog n’envoie des événements qu’après acceptation de la
        mesure d’audience. Les événements funnel stockés en base Supabase (<code>conversion_events</code>) sont
        distincts et documentés dans la politique de confidentialité.
      </P>
      <P>
        <a href="#parametrage-cookies" className="ms-legal-a">Aller au paramétrage des cookies</a>
      </P>

      <H>6. Contact</H>
      <P><Mail to={email} /></P>
    </LegalLayout>
  );
}
