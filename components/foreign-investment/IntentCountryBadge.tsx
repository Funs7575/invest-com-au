import Link from "next/link";
import { getIntentCountry, intentCountryMeta } from "@/lib/intent-context";
import ClearIntentCountryButton from "./ClearIntentCountryButton";

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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 ${className}`}
    >
      <span aria-hidden className="text-sm leading-none">
        {meta.flag}
      </span>
      <span>Filtered for {meta.label}</span>
      <span aria-hidden className="text-amber-300">
        ·
      </span>
      <Link
        href={`/foreign-investment/${meta.slug}`}
        className="underline decoration-dotted hover:text-amber-700"
      >
        Hub
      </Link>
      <span aria-hidden className="text-amber-300">
        ·
      </span>
      <ClearIntentCountryButton className="underline decoration-dotted hover:text-amber-700 cursor-pointer disabled:opacity-50">
        Clear
      </ClearIntentCountryButton>
    </div>
  );
}
