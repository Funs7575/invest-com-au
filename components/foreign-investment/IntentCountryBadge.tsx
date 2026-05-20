import Link from "next/link";
import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import ClearIntentCountryButton from "./ClearIntentCountryButton";
import {
  BADGE_BG,
  BADGE_BORDER,
  BADGE_DIVIDER,
  BADGE_LINK_HOVER,
  BADGE_TEXT,
} from "./banner-tokens";

/**
 * Reads the iv_intent_country cookie and renders a small badge
 * indicating that the surrounding page is filtered for that country.
 * Renders nothing when no cookie is set.
 *
 * Drop this into /compare, /advisors, /invest pages where the country
 * dimension shapes the default filter. The badge gives the user one
 * click to clear the filter (if they didn't realise it was applied)
 * and one click to revisit the country hub.
 */
export default async function IntentCountryBadge({
  className = "",
}: {
  className?: string;
}) {
  const code = await getIntentCountry();
  if (!code) return null;

  const meta = intentCountryMeta(code);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${BADGE_BG} border ${BADGE_BORDER} text-xs font-semibold ${BADGE_TEXT} ${className}`}
    >
      <span aria-hidden className="text-sm leading-none">
        {meta.flag}
      </span>
      <span>Browsing as {meta.label}</span>
      <span aria-hidden className={BADGE_DIVIDER}>
        ·
      </span>
      <Link
        href={`/foreign-investment/${meta.slug}`}
        className={`underline decoration-dotted ${BADGE_LINK_HOVER}`}
      >
        Hub
      </Link>
      <span aria-hidden className={BADGE_DIVIDER}>
        ·
      </span>
      <ClearIntentCountryButton
        className={`underline decoration-dotted ${BADGE_LINK_HOVER} cursor-pointer disabled:opacity-50`}
      >
        Clear
      </ClearIntentCountryButton>
    </div>
  );
}
