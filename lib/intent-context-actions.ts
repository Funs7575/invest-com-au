"use server";

/**
 * Server actions for the intent-country cookie.
 *
 * Lives in a separate file from `lib/intent-context.ts` because Next.js
 * requires the "use server" directive at the top of the file and that
 * marks every export as a server action. Keeping the read helpers
 * (which need to be importable into RSC server components) in a
 * non-action file avoids confusing the bundler.
 */

import { cookies } from "next/headers";
import {
  INTENT_COUNTRY_COOKIE,
  INTENT_COUNTRY_TTL_SECONDS,
  isKnownIntentCountry,
} from "./intent-context";

export async function setIntentCountryAction(code: string): Promise<void> {
  if (!isKnownIntentCountry(code)) return;
  const c = await cookies();
  c.set(INTENT_COUNTRY_COOKIE, code, {
    maxAge: INTENT_COUNTRY_TTL_SECONDS,
    httpOnly: false, // client may read for UX (e.g. analytics dimension)
    sameSite: "lax",
    path: "/",
  });
}

export async function clearIntentCountryAction(): Promise<void> {
  const c = await cookies();
  c.delete(INTENT_COUNTRY_COOKIE);
}
