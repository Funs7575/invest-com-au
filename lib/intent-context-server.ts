/**
 * Server-only intent-country helpers — split from `lib/intent-context.ts`
 * because that module is imported by client components (Step 12 added
 * the quiz prefill which needs the slug↔quizKey map). Importing
 * `next/headers` from anywhere a client bundle reaches fails the
 * Turbopack build with "next/headers is only available in Server
 * Components".
 *
 * Pure helpers (registry, slug/iso/quizKey lookups, type guard) stay
 * in lib/intent-context.ts and are safe for both client and server
 * use. The cookie reader lives here.
 */

import { cookies } from "next/headers";
import {
  INTENT_COUNTRY_COOKIE,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "./intent-context";

/**
 * Read the user's intent country from the cookie. Returns null if
 * the cookie isn't set or if the value isn't a known country code.
 *
 * Server-side only — uses next/headers cookies(). Calling this from
 * a child Server Component opts that subtree into dynamic rendering
 * while leaving the rest of the route's ISR shell intact.
 */
export async function getIntentCountry(): Promise<IntentCountryCode | null> {
  const c = await cookies();
  const raw = c.get(INTENT_COUNTRY_COOKIE)?.value;
  if (!raw) return null;
  return isKnownIntentCountry(raw) ? raw : null;
}
