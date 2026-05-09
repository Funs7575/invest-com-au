/**
 * Renders the "Government schemes & grants" section on a country
 * foreign-investment hub. Server-rendered (RSC) — pulls from
 * `country_schemes` via the anon Supabase client under RLS.
 *
 * Slotted into both rendering paths:
 *   - app/foreign-investment/[country]/page.tsx (DB-backed countries)
 *   - components/foreign-investment/CountryHubTemplate.tsx (hardcoded countries)
 *
 * Each card wraps its dated stat in <DatedStatBadge> so the V-NEW-01 CI
 * gate trips when stales_at falls behind. Emits one
 * GovernmentService JSON-LD per scheme for SEO.
 */

import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  type CountryScheme,
  type SchemeCategory,
  getSchemesForCountry,
  groupByCategory,
} from "@/lib/country-schemes";
import { governmentServiceJsonLd } from "@/lib/schema-markup";
import DatedStatBadge from "@/components/DatedStatBadge";
import SectionHeading from "@/components/SectionHeading";

interface CountrySchemesSectionProps {
  /** ISO-2 uppercase, e.g. "GB", "US", "IN". */
  countryCode: string;
  /** Long-form country name, e.g. "United Kingdom". */
  countryName: string;
  /** URL path of the host page, e.g. "/foreign-investment/united-kingdom". */
  pagePath: string;
}

const CATEGORY_BADGE: Record<SchemeCategory, string> = {
  visa_pathway: "bg-violet-50 text-violet-700 ring-violet-200",
  firb_threshold: "bg-amber-50 text-amber-700 ring-amber-200",
  tax_concession: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  super_rule: "bg-blue-50 text-blue-700 ring-blue-200",
  pension_transfer: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  first_home_buyer: "bg-rose-50 text-rose-700 ring-rose-200",
  investor_grant: "bg-teal-50 text-teal-700 ring-teal-200",
  dual_tax_treaty: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default async function CountrySchemesSection({
  countryCode,
  countryName,
  pagePath,
}: CountrySchemesSectionProps) {
  const schemes = await getSchemesForCountry(countryCode);
  if (schemes.length === 0) return null;

  const groups = groupByCategory(schemes);
  const audiencesPresent = Array.from(new Set(schemes.map((s) => s.audience)));

  return (
    <section
      id="schemes-and-grants"
      className="py-12 md:py-16 bg-white border-t border-slate-100"
    >
      <div className="container-custom">
        <SectionHeading
          eyebrow="Government schemes & grants"
          title={`Programmes ${countryName} investors should know`}
          sub="Visa pathways, tax concessions, FIRB rules, and pension/super arrangements that materially change cross-border outcomes. Each item is sourced and review-dated."
        />

        {audiencesPresent.length > 1 && (
          <p className="text-xs text-slate-500 mb-6">
            Covers:{" "}
            {audiencesPresent.map((a, i) => (
              <span key={a}>
                {i > 0 && " · "}
                <span className="font-medium text-slate-700">
                  {AUDIENCE_LABELS[a]}
                </span>
              </span>
            ))}
          </p>
        )}

        {groups.map(({ category, rows }) => (
          <div key={category} className="mb-8 last:mb-0">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((row) => (
                <SchemeCard key={row.id} row={row} />
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-slate-400 mt-6">
          General information only — not personal financial, tax, migration, or
          legal advice. Verify the current rules with the cited regulator before
          acting. Every claim links to its primary source and carries a
          review-by date.
        </p>

        {/* JSON-LD: one GovernmentService per scheme — search engines render rich results */}
        {schemes.map((row) => (
          <script
            key={`jsonld-${row.id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                governmentServiceJsonLd({
                  name: row.name,
                  description: row.summary,
                  serviceType: CATEGORY_LABELS[row.category],
                  countryName,
                  sourceName: row.source_name,
                  sourceUrl: row.source_url,
                  pagePath,
                }),
              ),
            }}
          />
        ))}
      </div>
    </section>
  );
}

function SchemeCard({ row }: { row: CountryScheme }) {
  return (
    <article className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-bold text-slate-900 leading-snug">
          {row.name}
        </h4>
        <span
          className={`shrink-0 text-[0.6rem] font-bold uppercase px-2 py-0.5 rounded-full ring-1 ring-inset ${CATEGORY_BADGE[row.category]}`}
        >
          {CATEGORY_LABELS[row.category]}
        </span>
      </div>

      {row.threshold_label && (
        <p className="text-xs font-semibold text-slate-700 mb-2">
          <DatedStatBadge
            value={row.threshold_label}
            sourcedAt={row.sourced_at}
            stalesAt={row.stales_at}
            source={row.source_name}
            sourceUrl={row.source_url}
            label={row.name}
          />
        </p>
      )}

      <p className="text-xs text-slate-600 leading-relaxed mb-3">
        {row.summary}
      </p>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span>Source:</span>
        <a
          href={row.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-blue-600 hover:underline"
        >
          {row.source_name}
        </a>
        <DatedStatBadge
          value=""
          sourcedAt={row.sourced_at}
          stalesAt={row.stales_at}
          source={row.source_name}
          sourceUrl={row.source_url}
          className="ml-auto"
        />
      </div>
    </article>
  );
}
