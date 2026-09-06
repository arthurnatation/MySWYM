import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, CircleHelp, Home, MessageCircle, Send, X } from "lucide-react";
import { PRICING_SUMMARY_FR } from "./lib/pricing.js";
import { closeSupportLive, fetchSupportThread, sendSupportLive } from "./lib/support-api.js";
import { getSupportSessionRef } from "./lib/support-context.js";

const FONT = "Geist, ui-sans-serif, system-ui, sans-serif";
const TRIAL_DAYS = 7;
const BLUE = "#006bfd";
/** Thème soft mist du widget. */
const MUTED = "#6b7c8f";
const ARTHUR_PHOTO = "/coach.webp";

/** FAQ rule-based, produit + vocabulaire / méthode natation MySWYM. */
const FAQ_RULES = [
  // ── Produit ──────────────────────────────────────────────
  {
    keys: ["gratuit", "free", "prix", "tarif", "coût", "cout", "abonnement", "premium", "payer", "paiement", "stripe", "combien"],
    answer:
      `À la création du compte : essai Premium ${TRIAL_DAYS} jours sans carte. Ensuite tes séances se mettent en pause jusqu'à l'abonnement. ${PRICING_SUMMARY_FR}. Détails sur la page Tarifs.`,
  },
  {
    keys: [
      "annuler abonnement",
      "se désabonner",
      "se desabonner",
      "désabonner",
      "desabonner",
      "désabonnement",
      "desabonnement",
      "gérer mon abonnement",
      "gerer mon abonnement",
      "annuler l'abonnement",
      "annuler l’abonnement",
      "annulation",
      "annuler",
      "résilier",
      "resilier",
      "résiliation",
      "resiliation",
      "rembours",
    ],
    answer:
      "Pour te désabonner : dans l’app, ouvre Profil (icône en bas) → le menu Paramètres → « Gérer mon abonnement ». Tu arrives sur Stripe : choisis Annuler l’abonnement. Tu restes Premium jusqu’à la fin de la période déjà payée, puis tes séances se mettent en pause (plus de prélèvement). Essai 7 jours sans carte : rien à résilier, ça s’arrête tout seul. Offre 4,99€/mois : engagement 12 mois (pas de remboursement ; une résiliation ou suppression de compte n’arrête pas les prélèvements avant la fin des 12 mois, hors cas légaux). Annuel 52,99€ : déjà payé pour l’année, pas de remboursement au prorata (hors cas légaux). Supprimer le compte ne coupe pas l’abonnement : passe d’abord par « Gérer mon abonnement ».",
  },
  {
    keys: ["objectif", "changer", "relancer", "nouveau plan", "onboarding", "plusieurs plan"],
    answer:
      "Un nouvel objectif se lance depuis le profil (relance de l'onboarding). Premium permet aussi de gérer plusieurs plans en parallèle.",
  },
  {
    keys: ["début", "debut", "débutant", "debutant", "jamais", "apprendre", "savoir nager", "école"],
    answer:
      "MySWYM convient dès que tu sais déjà nager. Le niveau découverte allège le vocabulaire (zones en français, repos en secondes). Ce n'est pas une école pour apprendre le geste de A à Z. L'app génère et structure tes séances.",
  },
  {
    keys: ["comment ça marche", "comment ca marche", "fonctionn", "personnalis", "générateur", "generateur"],
    answer:
      "Après le questionnaire (objectif, niveau, fréquence), un plan est généré semaine par semaine. Structure type : départ → technique → corps (zones) → retour au calme. Pas d'IA générative : logique coaching déterministe.",
  },
  {
    keys: ["contact", "humain", "équipe", "equipe", "écrire", "ecrire", "mail", "email", "support", "arthur"],
    answer:
      "Pour une question perso ou un souci sur une séance, écris ici. Arthur te répond dans cette conversation.",
  },
  {
    keys: ["compte", "connexion", "mot de passe", "inscription", "supprimer"],
    answer:
      "Connexion et inscription via /connexion et /inscription. Pour supprimer ton compte : Profil → Paramètres → « Supprimer mon compte ». Un souci ? Écris ici, Arthur te répond dans cette conversation.",
  },

  // ── Natation / méthode ───────────────────────────────────
  {
    keys: ["zone", "z1", "z2", "z3", "z4", "intensité", "intensite", "filière", "filiere"],
    answer:
      "Les zones guident l'effort : Z1 = aisance / récup active, Z2 = endurance aéro, Z3 = seuil (soutenu mais régulier), Z4 = vitesse / VO2.",
  },
  {
    keys: ["allure", "t100", "temps 100", "pace", "@", "mm:ss", "chron"],
    answer:
      "Les allures cibles partent de ton seul T100 (meilleur 100 m, départ dans l'eau). Pendant l'essai et en Premium : @mm:ss à côté des zones. Plus tu es rapide, plus les bandes aérobie sont calibrées.",
  },
  {
    keys: ["d…", "d...", "r…", "r...", "d ou r", "départ chron", "depart chron", "repos ", "intervalle fixe", "chronométré", "chronometre"],
    answer:
      "R… = repos simple entre reps (ex. R30\"). D… = départ chronométré (ex. D1'30) : tu repartis à intervalle fixe. Premium affiche l'allure cible si T100 connu. Sur un sprint, la récup doit rester complète : sinon c'est de l'endurance déguisée.",
  },
  {
    keys: ["structure", "échauff", "echauff", "retour calme", "rac", "bloc", "départ", "depart", "corps de séance", "corps de seance"],
    answer:
      "Séance type MySWYM : départ (souvent godilles en Z1) → bloc technique rotatif → corps physio (Z1–Z4 selon la filière) → fin / retour au calme. Eau libre : consignes spécifiques (sighting, combinaison), pas seulement des reps bassin.",
  },
  {
    keys: ["godille", "sculling", "scull"],
    answer:
      "Les godilles (sculling) : petits mouvements de main pour sentir l'appui et l'eau.",
  },
  {
    keys: ["grand chien", "petit chien", "chien"],
    answer:
      "Grand / petit chien = éducatifs de position et d'appui. MySWYM les utilise avec parcimonie (~1 séance sur 8 en focus) : on privilégie jambes et nage appliquée. Sur niveau découverte, l'app explique l'éducatif en ligne plutôt que le jargon seul.",
  },
  {
    keys: ["rattrapé", "rattrape", "catch-up", "catch up", "catchup"],
    answer:
      "Le rattrapé : un bras attend dans l'axe des épaules (pas mains qui se touchent) pendant que l'autre tire. Éducatif de timing et d'alignement, pas un exercice de vitesse.",
  },
  {
    keys: ["coulée", "coulee", "virage", "apnée", "apnee", "glisse"],
    answer:
      "Après un virage, on parle de coulée (glisse sous l'eau), pas de « sortie en apnée ». Sur BNSSA / pompiers, l'apnée dynamique et le matériel (palmes, masque, tuba) servent au parcours examen. C'est un autre contexte.",
  },
  {
    keys: ["jambes", "battement", "kick"],
    answer:
      "Focus jambes = éducatif court puis série jambes. Jamais deux gros blocs battements d'affilée. Si la séance est déjà centrée jambes, le départ ne rajoute pas encore du kick.",
  },
  {
    keys: ["sprint", "vitesse", "récup complète", "recup complete"],
    answer:
      "Sprint / vitesse : récup longue et complète entre les reps (souvent 1:3 à 1:6). Si tu raccourcis le repos, tu bascules en endurance. Ce n'est plus le même stimulus.",
  },
  {
    keys: ["seuil", "régular", "regular", "constance"],
    answer:
      "Au seuil (souvent Z3) : effort soutenu mais régulier. Vise la constance des temps sur les reps, pas un coup de collier puis un crash.",
  },
  {
    keys: ["sighting", "eau libre", "bouée", "bouee", "combinaison", "open water", "ow"],
    answer:
      "Eau libre : repères (sighting), combinaison, allure course. Les séances le mentionnent explicitement (« À faire en eau libre »). Triathlon : cues régularité / bouée sur les reps longues. Pas uniquement du fractionné bassin générique.",
  },
  {
    keys: ["bnssa", "pompier", "sauvetage", "remorquage", "palmes", "tuba", "masque"],
    answer:
      "BNSSA / tests pompiers : séances orientées examen (apnée, palmes + masque + tuba, remorquage, simulations parcours). Ce n'est pas de l'endurance loisir générique.",
  },
  {
    keys: ["bpjeps", "400 m", "400m", "7'40", "7:40"],
    answer:
      "BPJEPS AAN : focus 400 m NL (repère examen souvent < 7'40\"), fractionné et régularité des temps. Distinct du parcours sauvetage BNSSA.",
  },
  {
    keys: ["palme", "plaquette", "roulis", "rotation"],
    answer:
      "Sur roulis / rotation du corps : palmes OK, plaquettes non. Elles faussent l'appui. Les plaquettes servent plutôt d'autres blocs (force / traction), pas le travail de rotation.",
  },
  {
    keys: ["volume", "+10", "10 %", "10%", "progression", "charge", "trop dur", "trop facile", "feedback", "easy", "hard"],
    answer:
      "Le volume monte ~+10 % max d'une semaine à l'autre. Après une semaine, le feedback (facile / ok / dur) ajuste les semaines futures encore vierges (borné). Une séance trop dure ? Dis-le dans le retour. Premium peut aussi micro-ajuster au premier feedback séance.",
  },
  {
    keys: ["affûtage", "affutage", "taper", "semaine test", "chrono", "décharge", "decharge"],
    answer:
      "Décharges ~toutes les 4 semaines. Semaines test : chronos 100/200/400 pour mesurer l'évolution. Affûtage avant l'échéance (1 sem. dès 6 sem. de plan, 2 dès 10) : volume ↓, touches vitesse. Semaine compétition : 1 séance (≤3×/sem) ou 2 (>3), volume très bas, rappels ≤12,5 m. Le travail est déjà fait.",
  },
  {
    keys: ["bassin", "25 m", "25m", "50 m", "50m", "longueur"],
    answer:
      "Les distances sont calées sur ton bassin (25 ou 50 m) : pas de séries Nx25 en bassin 50. En 50 m, certaines variantes vitesse = 25 à bloc + 25 relâché sur la même longueur.",
  },
];

const FALLBACK =
  "Pas de réponse auto pour celle-ci. J’envoie ça à Arthur, il te répond ici.";

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchFaq(text) {
  const q = stripAccents(text.toLowerCase());
  let best = null;
  let bestScore = 0;
  for (const rule of FAQ_RULES) {
    let score = 0;
    for (const key of rule.keys) {
      const k = stripAccents(key);
      if (!k || !q.includes(k)) continue;
      score += 1 + Math.min(4, Math.floor(k.length / 3));
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return bestScore > 0 ? best.answer : FALLBACK;
}

const HELP_ARTICLES = [
  { title: "Essai, prix et abonnement", q: "prix abonnement" },
  { title: "Annuler ou se désabonner", q: "se désabonner" },
  { title: "Comment ça marche ?", q: "comment ça marche" },
  { title: "Zones Z1 à Z4", q: "zones z1 z2" },
  { title: "Allures et T100", q: "allure t100" },
  { title: "D… ou R… ?", q: "départ chronométré repos" },
  { title: "Godilles", q: "godilles" },
  { title: "Changer d’objectif", q: "changer objectif onboarding" },
].map((a) => ({ title: a.title, answer: matchFaq(a.q) }));

const WELCOME = {
  role: "bot",
  text: "Salut ! Tu parles à l’assistance MySWYM. Je peux t’aider sur le produit et la natation. Tu peux demander l’équipe à tout moment, Arthur te répond ici.",
};

function wantsHuman(text) {
  return /\b(parler\s+(à|a)\s+|contacter\s+(l['’]?équipe|arthur)|un\s+humain|l['’]équipe|aide\s+humaine)\b/i.test(
    String(text || ""),
  );
}

function toBubbleMessages(rows) {
  return (rows || []).map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "bot" : m.role,
    text: m.body || m.text || "",
  }));
}

function seenStorageKey(userId) {
  return `myswym_support_seen_${userId || "anon"}`;
}

function readSeenId(userId) {
  try {
    return localStorage.getItem(seenStorageKey(userId)) || "";
  } catch {
    return "";
  }
}

function writeSeenId(userId, messageId) {
  if (!messageId) return;
  try {
    localStorage.setItem(seenStorageKey(userId), messageId);
  } catch {
    /* ignore */
  }
}

function lastAgentId(messages) {
  const agents = (messages || []).filter((m) => m.role === "agent");
  return agents.length ? agents[agents.length - 1].id : "";
}

function lastPreview(messages) {
  const rows = messages || [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const t = (rows[i].body || rows[i].text || "").trim();
    if (t) return t;
  }
  return "";
}

function roleLabel(role) {
  if (role === "agent") return "Arthur";
  if (role === "bot") return "Assistance";
  return "";
}

function firstNameOf(user) {
  const raw = user?.user_metadata?.firstname || user?.user_metadata?.first_name || "";
  return String(raw).trim();
}

function formatConvWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function ArthurAvatar({ size = 44, radius = 12 }) {
  return (
    <img
      src={ARTHUR_PHOTO}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "cover",
        objectPosition: "center 20%",
        display: "block",
        flexShrink: 0,
        background: BLUE,
      }}
    />
  );
}

/** Mascotte MySWYM. Accueil du widget seulement, le fil garde la photo d'Arthur. */
function LoutreAvatar({ height = 92 }) {
  return (
    <img
      src="/loutre-chatbox.webp"
      alt=""
      width={Math.round((height * 480) / 427)}
      height={height}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

/**
 * Widget support type Intercom : Accueil / Aide / Messages, chat persisté vers Arthur.
 */
export default function SupportBubble({ aboveBottomNav = false, user = null }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState("tabs");
  const [faqMessages, setFaqMessages] = useState([WELCOME]);
  const [thread, setThread] = useState({ conversation: null, messages: [] });
  const [conversations, setConversations] = useState([]);
  const [startFresh, setStartFresh] = useState(false);
  const [forceLive, setForceLive] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(false);
  const [helpOpen, setHelpOpen] = useState(null);
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const activeIdRef = useRef(null);
  const startFreshRef = useRef(false);
  const fetchGen = useRef(0);
  const userId = user?.id || null;
  const firstName = firstNameOf(user);

  useEffect(() => {
    const openFromEvent = (e) => {
      const detail = e?.detail || {};
      setOpen(true);
      if (detail.tab === "messages" || detail.tab === "help" || detail.tab === "home") {
        setTab(detail.tab);
        setView("tabs");
      }
    };
    window.addEventListener("myswym:open-support", openFromEvent);
    return () => window.removeEventListener("myswym:open-support", openFromEvent);
  }, []);

  const conversation = thread.conversation;
  const liveOpen = conversation?.status === "open";
  const showClosed = conversation?.status === "closed" && !startFresh;
  const liveMode = liveOpen || showClosed;
  const messages = liveMode ? toBubbleMessages(thread.messages) : faqMessages;
  const history = conversations.length ? conversations : (thread.conversation ? [thread.conversation] : []);
  const hasHistory = history.length > 0;
  const openConversation = history.find((c) => c.status === "open") || null;
  const busy = typing || sending;

  const applyThread = (json, { markSeen = false, pin = false } = {}) => {
    if (!json?.ok) return;
    const incoming = json.conversation || null;
    const nextMessages = json.messages || [];
    const nextList = json.conversations || [];
    if (Array.isArray(json.conversations)) setConversations(nextList);
    if (!pin && startFreshRef.current) return;
    if (!pin && activeIdRef.current && incoming?.id && incoming.id !== activeIdRef.current) {
      return;
    }
    setThread({
      conversation: incoming,
      messages: nextMessages,
    });
    if (incoming?.id) activeIdRef.current = incoming.id;
    const agentId =
      lastAgentId(nextMessages) ||
      nextList.find((c) => c.last_role === "agent")?.last_message_id ||
      "";
    if (markSeen) {
      writeSeenId(userId, agentId);
      setUnread(false);
    } else if (agentId && agentId !== readSeenId(userId)) {
      setUnread(true);
    } else {
      setUnread(false);
    }
  };

  const refreshThread = async ({ markSeen = false, conversationId } = {}) => {
    if (startFreshRef.current && !conversationId) return null;
    const gen = ++fetchGen.current;
    const id = conversationId ?? activeIdRef.current;
    const json = await fetchSupportThread(id || undefined);
    if (gen !== fetchGen.current) return json;
    applyThread(json, { markSeen });
    return json;
  };

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    fetchSupportThread().then((json) => {
      if (!cancelled) applyThread(json, { markSeen: false });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || open) return undefined;
    const interval = window.setInterval(() => {
      fetchSupportThread().then((json) => applyThread(json, { markSeen: false }));
    }, 20000);
    return () => window.clearInterval(interval);
  }, [userId, open]);

  useEffect(() => {
    if (!open || view !== "chat" || startFresh) return undefined;
    refreshThread({ markSeen: true });
    const interval = window.setInterval(() => {
      refreshThread({ markSeen: true });
    }, liveOpen ? 4000 : 12000);
    return () => window.clearInterval(interval);
  }, [open, view, liveOpen, userId, startFresh]);

  useEffect(() => {
    if (!open || view !== "chat") return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open, view]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const close = () => {
    setOpen(false);
    clearTimeout(typingTimer.current);
    setTyping(false);
  };

  const openPanel = () => {
    if (open) {
      close();
      return;
    }
    setView("tabs");
    setTab("home");
    setOpen(true);
    setError("");
  };

  const beginFresh = () => {
    fetchGen.current += 1;
    startFreshRef.current = true;
    setStartFresh(true);
    setForceLive(false);
    setFaqMessages([WELCOME]);
    setError("");
    activeIdRef.current = null;
    setThread({ conversation: null, messages: [] });
  };

  const openChat = (opts = {}) => {
    setView("chat");
    setError("");
    if (opts.fresh) beginFresh();
    if (opts.live) setForceLive(true);
  };

  const openHistory = (conv) => {
    if (!conv?.id) {
      openChat({ fresh: true });
      return;
    }
    fetchGen.current += 1;
    startFreshRef.current = false;
    setStartFresh(false);
    setForceLive(false);
    setError("");
    activeIdRef.current = conv.id;
    setView("chat");
    fetchSupportThread(conv.id).then((json) => applyThread(json, { markSeen: true, pin: true }));
  };

  const backToTabs = () => {
    setView("tabs");
    setTab("messages");
    setForceLive(false);
    setError("");
  };

  const escalate = async (text, prior) => {
    setSending(true);
    setError("");
    try {
      const json = await sendSupportLive(text, prior, getSupportSessionRef());
      if (!json.ok) {
        setInput(text);
        setError(json.error || "Impossible d’envoyer. Réessaie dans un instant.");
        return false;
      }
      fetchGen.current += 1;
      if (json.conversation?.id) activeIdRef.current = json.conversation.id;
      startFreshRef.current = false;
      setStartFresh(false);
      setForceLive(false);
      applyThread(json, { markSeen: true, pin: true });
      if (!Array.isArray(json.conversations)) {
        await refreshThread({ markSeen: true, conversationId: json.conversation?.id });
      }
      return true;
    } catch {
      setInput(text);
      setError("Impossible d’envoyer. Réessaie dans un instant.");
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || typing || sending) return;
    setInput("");

    if (liveOpen) {
      await escalate(text);
      return;
    }

    if (showClosed) {
      setError("Cette conversation est clôturée. Ouvre-en une nouvelle.");
      return;
    }

    const prior = faqMessages.map((m) => ({ role: m.role, text: m.text }));
    const goLive = forceLive || wantsHuman(text) || matchFaq(text) === FALLBACK;
    setFaqMessages((m) => [...m, { role: "user", text }]);

    if (goLive) {
      const ok = await escalate(text, prior);
      if (!ok) setFaqMessages((m) => [...m, { role: "bot", text: FALLBACK }]);
      return;
    }

    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setFaqMessages((m) => [...m, { role: "bot", text: matchFaq(text) }]);
      setTyping(false);
    }, 420);
  };

  const closeThread = async () => {
    if (!conversation?.id || !liveOpen) return;
    setSending(true);
    const json = await closeSupportLive(conversation.id);
    setSending(false);
    if (json.ok) {
      applyThread(json, { markSeen: true });
      if (!Array.isArray(json.conversations)) {
        await refreshThread({ markSeen: true, conversationId: conversation.id });
      }
    } else setError(json.error || "Impossible de clôturer.");
  };

  const askQuestion = () => {
    if (openConversation) openHistory(openConversation);
    else openChat({ fresh: true });
  };

  const tabBtn = (id, label, Icon) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTab(id)}
        aria-current={active ? "page" : undefined}
        className={`support-nav-btn${active ? " is-active" : ""}`}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Icon size={20} color={active ? BLUE : MUTED} />
          {id === "messages" && unread ? (
            <span aria-hidden className="support-nav-dot" />
          ) : null}
        </span>
        {label}
      </button>
    );
  };

  const AskButton = ({ label = "Poser une question" }) => (
    <button type="button" onClick={askQuestion} className="support-ask-btn">
      {label}
      <MessageCircle size={16} color="#fff" />
    </button>
  );

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Fermer l’aide" : "Aide et support"}
        aria-expanded={open}
        onClick={openPanel}
        className={[
          aboveBottomNav ? "support-fab" : "support-fab support-fab--bare",
          open ? "is-open" : "",
        ].filter(Boolean).join(" ")}
      >
        {open ? <ChevronDown size={26} color="currentColor" /> : <MessageCircle size={24} color="currentColor" />}
        {!open && unread ? (
          <span aria-label="Nouveau message" className="support-fab-badge" />
        ) : null}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aide MySWYM"
          className={aboveBottomNav ? "support-widget" : "support-widget support-widget--bare"}
          style={{ fontFamily: FONT }}
        >
          {view === "chat" ? (
            <>
              <div className="support-widget-head">
                <button type="button" aria-label="Retour" onClick={backToTabs} className="support-icon-btn">
                  <ArrowLeft size={18} color="currentColor" />
                </button>
                <ArthurAvatar size={34} radius={12} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="support-widget-title" style={{ fontSize: 15 }}>
                    Arthur
                  </div>
                  <div className="support-widget-subtitle">
                    L’équipe peut aussi aider
                  </div>
                </div>
                <button type="button" aria-label="Fermer" onClick={close} className="support-icon-btn">
                  <X size={18} color="currentColor" />
                </button>
              </div>

              <div ref={listRef} className="support-chat-list">
                {messages.map((msg, i) => {
                  const label = roleLabel(msg.role);
                  const kind =
                    msg.role === "user"
                      ? "user"
                      : msg.role === "system"
                        ? "system"
                        : msg.role === "agent"
                          ? "agent"
                          : "bot";
                  return (
                    <div
                      key={msg.id || `${msg.role}-${i}`}
                      className={`support-bubble support-bubble--${kind}`}
                    >
                      {label ? <div className="support-bubble-label">{label}</div> : null}
                      {msg.text}
                    </div>
                  );
                })}
                {busy ? (
                  <div className="support-typing" aria-live="polite">
                    …
                  </div>
                ) : null}
              </div>

              <div className="support-composer">
                {error ? (
                  <p style={{ color: "#c2410c", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>{error}</p>
                ) : null}
                {showClosed ? (
                  <button type="button" onClick={() => beginFresh()} className="support-ask-btn" style={{ width: "100%" }}>
                    Nouvelle conversation
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send();
                    }}
                    className="support-composer-row"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Poser une question…"
                      aria-label="Poser une question"
                      disabled={busy}
                      className="support-composer-input"
                    />
                    <button
                      type="submit"
                      aria-label="Envoyer"
                      disabled={busy || !input.trim()}
                      className="support-send-btn"
                    >
                      <Send size={16} color="#fff" />
                    </button>
                  </form>
                )}
                {liveOpen ? (
                  <button
                    type="button"
                    onClick={closeThread}
                    disabled={busy}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "8px",
                      minHeight: 40,
                      background: "none",
                      border: "none",
                      color: MUTED,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: busy ? "default" : "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    Clôturer la conversation
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="support-widget-head support-widget-head--tabs">
                <h3 className="support-widget-title">
                  {tab === "home" ? "Accueil" : tab === "help" ? "Aide" : "Messages"}
                </h3>
                <button type="button" aria-label="Fermer" onClick={close} className="support-icon-btn">
                  <X size={18} color="currentColor" />
                </button>
              </div>

              <div className="support-widget-body">
                {tab === "home" && (
                  <div className="support-home">
                    <div className="support-home-mascot" aria-hidden>
                      <LoutreAvatar height={96} />
                    </div>
                    <h4 className="support-home-title">
                      {firstName ? `Salut ${firstName}` : "Salut"}
                    </h4>
                    <p className="support-home-lead">
                      Moi c’est la loutre MySWYM, bras droit d’Arthur, et la seule ici
                      qui n’a jamais eu besoin de palmes. Comment je peux t’aider ?
                    </p>
                    {hasHistory ? (
                      <button
                        type="button"
                        onClick={() => openHistory(history[0])}
                        className="support-card"
                      >
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="support-card-title">
                            {formatConvWhen(history[0]?.updated_at) || "Dernière conversation"}
                          </span>
                          <span className="support-card-meta">
                            {history[0]?.last_body || lastPreview(thread.messages) || "Continuer"}
                          </span>
                        </span>
                        <ChevronRight size={16} color={MUTED} />
                      </button>
                    ) : null}
                    <AskButton />
                  </div>
                )}

                {tab === "help" && (
                  <div style={{ padding: "4px 0 16px" }}>
                    {HELP_ARTICLES.map((article, i) => {
                      const openArticle = helpOpen === i;
                      return (
                        <div key={article.title} className="support-help-item">
                          <button
                            type="button"
                            onClick={() => setHelpOpen(openArticle ? null : i)}
                            className="support-help-trigger"
                          >
                            {article.title}
                            <ChevronRight
                              size={16}
                              color={MUTED}
                              style={{
                                transform: openArticle ? "rotate(90deg)" : "none",
                                transition: "transform 150ms ease",
                                flexShrink: 0,
                              }}
                            />
                          </button>
                          {openArticle ? (
                            <p className="support-help-answer">{article.answer}</p>
                          ) : null}
                        </div>
                      );
                    })}
                    <div style={{ padding: "18px 16px 4px", textAlign: "center" }}>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED }}>
                        Tu ne trouves pas ? Écris-nous.
                      </p>
                      <AskButton />
                    </div>
                  </div>
                )}

                {tab === "messages" && (
                  <div
                    style={{
                      minHeight: "100%",
                      display: "flex",
                      flexDirection: "column",
                      padding: "12px 16px 18px",
                    }}
                  >
                    {hasHistory ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {history.map((conv) => {
                          const preview = conv.last_body || (conv.id === conversation?.id ? lastPreview(thread.messages) : "");
                          const isOpen = conv.status === "open";
                          return (
                            <button
                              key={conv.id}
                              type="button"
                              onClick={() => openHistory(conv)}
                              className="support-card"
                              style={{ marginBottom: 0, minHeight: 72 }}
                            >
                              <span style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                                  <span className="support-card-title">
                                    {formatConvWhen(conv.updated_at)}
                                  </span>
                                  {isOpen ? (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, flexShrink: 0 }}>
                                      Ouverte
                                    </span>
                                  ) : null}
                                </span>
                                <span className="support-card-meta" style={{ fontSize: 13 }}>
                                  {preview || (isOpen ? "Conversation en cours" : "Conversation clôturée")}
                                </span>
                              </span>
                              {unread && isOpen ? (
                                <span
                                  aria-label="Non lu"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: BLUE,
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <ChevronRight size={16} color={MUTED} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="support-empty">
                        <MessageCircle size={36} color="#9aa8b6" />
                        <div className="support-empty-title">Aucun message</div>
                        <p className="support-empty-text">
                          Les messages de l’équipe s’affichent ici
                        </p>
                        <AskButton />
                      </div>
                    )}
                    {hasHistory && !openConversation ? (
                      <div style={{ marginTop: "auto", paddingTop: 18, textAlign: "center" }}>
                        <AskButton />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <nav aria-label="Support" className="support-nav">
                {tabBtn("home", "Accueil", Home)}
                {tabBtn("help", "Aide", CircleHelp)}
                {tabBtn("messages", "Messages", MessageCircle)}
              </nav>
            </>
          )}
        </div>
      )}
    </>
  );
}
