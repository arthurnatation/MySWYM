/**
 * Usage: node src/lib/newsletter-opt-in.test.js
 */
import { isNewsletterOptedIn } from "./newsletter-opt-in.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isNewsletterOptedIn(null) === false, "null");
assert(isNewsletterOptedIn({}) === false, "empty");
assert(isNewsletterOptedIn({ user_metadata: {} }) === false, "missing");
assert(isNewsletterOptedIn({ user_metadata: { newsletter_opt_in: false } }) === false, "false");
assert(isNewsletterOptedIn({ user_metadata: { newsletter_opt_in: true } }) === true, "true");
assert(isNewsletterOptedIn({ user_metadata: { newsletter_opt_in: "yes" } }) === false, "strict bool");

console.log("newsletter-opt-in.test.js OK");
