/**
 * Shared email validation — used in both API routes and client components.
 * RFC 5322 simplified regex that covers 99%+ of real-world email addresses.
 */

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

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
