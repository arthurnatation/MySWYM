import { LEGAL_LINKS, CHECKOUT_RENEWAL_NOTICE, CHECKOUT_WITHDRAWAL_LABEL, CHECKOUT_CGV_LABEL_PREFIX } from "./lib/legal-copy.js";
import { checkoutGatesReady, checkoutGatesError } from "./lib/checkout-legal.js";
import { LocalizedLink } from "./i18n/locale-routing.jsx";

export { checkoutGatesReady, checkoutGatesError };

const linkStyle = { fontWeight: 700, textDecoration: "none" };
const boxStyle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 10,
  fontSize: 12,
  lineHeight: 1.45,
};

/**
 * Cases à cocher pré-checkout (rétractation + acceptation CGV/CGU).
 * Requis avant redirection Stripe.
 */
export default function CheckoutLegalGates({
  acceptTerms,
  onAcceptTerms,
  acceptWithdrawal,
  onAcceptWithdrawal,
  ink = "#0f1b2d",
  muted = "#4a5d72",
  linkColor = "#006bfd",
  idPrefix = "checkout-legal",
}) {
  const termsId = `${idPrefix}-terms`;
  const withdrawalId = `${idPrefix}-withdrawal`;

  const stopLinkToggle = (event) => {
    event.stopPropagation();
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: muted, lineHeight: 1.45, margin: "0 0 10px" }}>
        {CHECKOUT_RENEWAL_NOTICE}
      </p>
      <label htmlFor={termsId} style={{ ...boxStyle, color: muted }}>
        <input
          id={termsId}
          type="checkbox"
          checked={!!acceptTerms}
          onChange={(e) => onAcceptTerms(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <span>
          {CHECKOUT_CGV_LABEL_PREFIX}{" "}
          <LocalizedLink to={LEGAL_LINKS.cgv} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: linkColor }} onClick={stopLinkToggle}>CGV</LocalizedLink>
          {" "}et les{" "}
          <LocalizedLink to={LEGAL_LINKS.cgu} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: linkColor }} onClick={stopLinkToggle}>CGU</LocalizedLink>.
        </span>
      </label>
      <label htmlFor={withdrawalId} style={boxStyle}>
        <input
          id={withdrawalId}
          type="checkbox"
          checked={!!acceptWithdrawal}
          onChange={(e) => onAcceptWithdrawal(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <span style={{ color: ink }}>{CHECKOUT_WITHDRAWAL_LABEL}</span>
      </label>
    </div>
  );
}
