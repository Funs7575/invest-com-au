import Link from "next/link";

/**
 * Lead-capture CTA card for SMSF / vertical hub pages.
 *
 * Originally referenced by `app/smsf/{crypto,setup,property,investment-strategy}/page.tsx`
 * but the file was missing from the merged set, breaking the production
 * build (TS2307: Cannot find module '@/components/leads/HubLeadForm').
 *
 * This stub implements the documented prop contract used by all 4 callers:
 *
 *   <HubLeadForm
 *     heading="Speak to an SMSF crypto specialist"
 *     subheading="..."
 *     intent={{ need: "smsf", context: ["smsf_setup"] }}
 *     source="smsf_crypto"
 *     ctaLabel="Get matched with a specialist"
 *   />
 *
 * Behaviour: renders a branded card with the heading + subheading and a
 * CTA button that deep-links to /find-advisor with the intent pre-encoded
 * as query params + a tracking `?source=` for attribution. No JS required —
 * pure server component that lets the existing /find-advisor flow handle
 * the actual capture.
 *
 * Replaceable: any future, richer in-place form lands by swapping this
 * component's body. The prop shape stays stable.
 *
 * Created 2026-04-26 to unblock the main-branch build break discovered
 * during the P0-1 cron-silence Sprint 1 sweep.
 */

export interface HubLeadFormIntent {
  need: string;
  context?: string[];
}

export interface HubLeadFormProps {
  heading: string;
  subheading?: string;
  intent: HubLeadFormIntent;
  source: string;
  ctaLabel?: string;
}

function buildHref({ intent, source }: Pick<HubLeadFormProps, "intent" | "source">): string {
  const params = new URLSearchParams();
  params.set("need", intent.need);
  if (intent.context && intent.context.length > 0) {
    params.set("context", intent.context.join(","));
  }
  params.set("source", source);
  return `/find-advisor?${params.toString()}`;
}

export default function HubLeadForm({
  heading,
  subheading,
  intent,
  source,
  ctaLabel = "Get matched",
}: HubLeadFormProps) {
  const href = buildHref({ intent, source });
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 md:p-8 shadow-sm">
      <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
        {heading}
      </h3>
      {subheading ? (
        <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-5 max-w-2xl">
          {subheading}
        </p>
      ) : null}
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm md:text-base font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        data-source={source}
        data-intent-need={intent.need}
      >
        {ctaLabel}
      </Link>
      <p className="mt-3 text-xs text-slate-500">
        Free to enquire · Verified specialists · No obligation
      </p>
    </div>
  );
}
