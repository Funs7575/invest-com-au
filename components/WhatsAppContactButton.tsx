/**
 * WhatsApp contact button (W5.25).
 *
 * Server component. Reads the visitor's intent country + the
 * `WHATSAPP_LEAD_NUMBER` env var; only renders for HK/IN/CN/SG visitors
 * AND when the env var is set. Otherwise returns null — graceful
 * degradation to the standard contact flow.
 *
 * Mount points: `app/advisors/[slug]/page.tsx` (profile contact block),
 * `app/find-advisor/[location]/page.tsx` (matched-advisor card).
 */

import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import {
  buildAdvisorWaMessage,
  buildWhatsAppUrl,
  getWhatsAppLeadNumber,
  isWhatsAppIntakeCountry,
} from "@/lib/whatsapp";

interface Props {
  /** Optional advisor name to include in the prefilled message. */
  advisorName?: string;
  /** Pathname this button was rendered on — surfaces in the WA message
   *  for routing-hub triage. */
  sourcePath: string;
  /** Visual variant. `compact` for cards, `full` for profile pages. */
  variant?: "compact" | "full";
}

export default async function WhatsAppContactButton({
  advisorName,
  sourcePath,
  variant = "full",
}: Props) {
  const intentCountry = await getIntentCountry();
  if (!isWhatsAppIntakeCountry(intentCountry)) return null;

  const phone = getWhatsAppLeadNumber();
  if (!phone) return null;

  // intentCountry is non-null here per the guard above.
  const meta = intentCountryMeta(intentCountry!);
  const message = buildAdvisorWaMessage({
    advisorName,
    intentCountryLabel: meta.label,
    sourcePath,
  });
  const href = buildWhatsAppUrl(phone, message);

  if (variant === "compact") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
        data-source="whatsapp_advisor_click_compact"
        data-country={intentCountry}
      >
        <span aria-hidden>💬</span>
        WhatsApp
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors"
      data-source="whatsapp_advisor_click_full"
      data-country={intentCountry}
    >
      <span aria-hidden>💬</span>
      Contact via WhatsApp
      <span className="text-xs opacity-80 font-normal">
        · {meta.flag} {meta.label}
      </span>
    </a>
  );
}
