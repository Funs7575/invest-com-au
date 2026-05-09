/**
 * Country Mode persistent banner.
 *
 * Server component — reads the iv_intent_country cookie. If set, renders
 * a thin sticky-under-nav strip telling the user they're in country
 * mode plus two escape hatches: switch country (opens the flag selector
 * via custom event) or view global (server action clears the cookie).
 *
 * If the cookie isn't set, returns null so non-country-mode users see
 * the homepage exactly as before. Mounted once in app/layout.tsx so it
 * appears site-wide.
 */

import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import { clearIntentCountryAction } from "@/lib/intent-context-actions";
import CountryModeBannerSwitchButton from "./CountryModeBannerSwitchButton";

export default async function CountryModeBanner() {
  const code = await getIntentCountry();
  if (!code) return null;
  const meta = intentCountryMeta(code);

  return (
    <div
      className="bg-amber-50 border-b border-amber-100"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs sm:text-sm">
        <p className="text-slate-800">
          <span aria-hidden className="mr-1.5">{meta.flag}</span>
          You&rsquo;re viewing Invest.com.au for <strong>{meta.label}</strong>.
        </p>
        <div className="flex items-center gap-4">
          <CountryModeBannerSwitchButton />
          <form action={clearIntentCountryAction}>
            <button
              type="submit"
              className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
            >
              Back to Australia <span aria-hidden>🇦🇺</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
