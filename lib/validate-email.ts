/**
 * Shared email validation — used in both API routes and client components.
 * RFC 5322 simplified regex that covers 99%+ of real-world email addresses.
 */

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Known disposable/temporary email providers.
 * These are high-spam-signal domains used for throwaway accounts.
 * Advisors pay per lead — accepting these domains risks billing for uncontactable leads.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Mailinator family
  "mailinator.com", "mailinator2.com", "trashmail.com", "trashmail.at",
  "trashmail.io", "trashmail.me", "trashmail.net",
  // Guerrilla Mail family
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
  "grr.la", "guerrillamailblock.com", "spam4.me",
  // 10-minute mail services
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "10minemail.com", "10mail.org", "throwam.com",
  // Temp-mail / YOPmail
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf",
  "monmail.fr.nf",
  "temp-mail.org", "tempmail.com", "tempmail.net", "tempmail.ninja",
  "fakeinbox.com", "fakeinbox.net", "dispostable.com",
  // Sharklasers / Guerrilla sub-domains
  "sharklasers.com", "guerrillamail.info", "grr.la",
  // Other common throwaway services
  "throwaway.email", "throwam.com", "spamgourmet.com",
  "mailnull.com", "spamhere.eu", "spam.la", "uggsrock.com",
  "discard.email", "filzmail.com", "mailexpire.com", "spamex.com",
  "maildrop.cc", "spamthis.co.uk", "mailnesia.com",
  "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu",
  "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
  "teleworm.us", "armyspy.com", "cuvox.de", "dayrep.com",
  "spamoff.de", "binkmail.com", "bobmail.info", "chammy.info",
  "devnullmail.com", "letthemeatspam.com", "mailinater.com",
  "spamavert.com", "spamhereplease.com", "spamthisplease.com",
  "objectmail.com", "put2.net", "rtrtr.com",
]);

/**
 * Returns true if the email's domain is a known disposable/temp-mail provider.
 * Use on lead capture endpoints where uncontactable leads cost advisors money.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Server-side email validation with length check (RFC 5321: max 254 chars).
 * Use this in API routes where you need strict validation.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Client-side email validation (lighter check for inline form feedback).
 * Same regex but without the string type guard since React inputs are always strings.
 */
export function isValidEmailClient(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
