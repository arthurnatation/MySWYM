/**
 * Opt-in newsletter compte (user_metadata), prêt pour les envois futurs.
 */

export const NEWSLETTER_META_KEY = "newsletter_opt_in";

export function isNewsletterOptedIn(user) {
  return user?.user_metadata?.[NEWSLETTER_META_KEY] === true;
}

/**
 * @param {boolean} enabled
 * @returns {Promise<{ user: object|null, error: Error|null }>}
 */
export async function setNewsletterOptIn(enabled) {
  const { supabase } = await import("../supabase.js");
  const { data, error } = await supabase.auth.updateUser({
    data: { [NEWSLETTER_META_KEY]: !!enabled },
  });
  if (error) return { user: null, error };
  return { user: data?.user || null, error: null };
}
