import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { PAST_PERFORMANCE_WARNING, SUPER_WARNING_SHORT } from "@/lib/compliance";
import { fundBySlug, similarFunds, superFundsMeta, type SuperFund } from "@/lib/super-funds";

export const revalidate = 86400;
// On-demand ISR over the file-backed extract, same as /adviser-register.
export function generateStaticParams() {
  return [];
}

const meta = superFundsMeta();

function fmtAbn(abn: string): string {
  return abn.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fund = fundBySlug(slug);
  // notFound() here (not just in the page) so blocking ISR renders emit a
  // real 404 status — the parent segment's loading.tsx streams otherwise.
  if (!fund) notFound();
  return {
    title: `${fund.name} — Performance, Fees & Size (${CURRENT_YEAR})`,
    description: `${fund.name} (${fund.fundType.toLowerCase()} fund) reported figures from APRA's fund-level statistics: 10-year return, operating expenses, total assets and member numbers.`,
    alternates: { canonical: absoluteUrl(`/super/funds/${fund.slug}`) },
    ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
  };
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium text-right">{value}</dd>
    </div>
  );
}

function ReturnCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
        {value === undefined ? "—" : `${value.toFixed(1)}%`}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default async function SuperFundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fund: SuperFund | null = fundBySlug(slug);
  if (!fund) notFound();

  const peers = similarFunds(fund);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Super", url: absoluteUrl("/super") },
          { name: "Fund Explorer", url: absoluteUrl("/super/funds") },
          { name: fund.name, url: absoluteUrl(`/super/funds/${fund.slug}`) },
        ])}
      />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FinancialProduct",
            name: fund.name,
            category: `${fund.fundType} superannuation fund`,
            identifier: `ABN ${fmtAbn(fund.abn)}`,
            ...(fund.trustee ? { provider: { "@type": "Organization", name: fund.trustee } } : {}),
            url: absoluteUrl(`/super/funds/${fund.slug}`),
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super" className="hover:text-slate-700 transition-colors">Super</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super/funds" className="hover:text-slate-700 transition-colors">Fund Explorer</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{fund.name}</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview record.</strong> This is a synthetic
            placeholder, not a real fund — the APRA extract hasn&apos;t been loaded yet.
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Icon name="pie-chart" size={24} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">{fund.name}</h1>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">{fund.fundType} super fund</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Icon name="shield-check" size={13} className="text-emerald-600" />
              APRA-regulated · {meta.period}
            </p>
          </div>
        </div>

        {/* Returns */}
        <section aria-labelledby="fund-returns" className="mb-6">
          <h2 id="fund-returns" className="text-sm font-bold text-slate-900 mb-2.5">
            Net rate of return (whole of fund)
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            <ReturnCard label="1 year" value={fund.ror1yr} />
            <ReturnCard label="5 years p.a." value={fund.ror5yr} />
            <ReturnCard label="10 years p.a." value={fund.ror10yr} />
          </div>
          <p className="mt-2.5 text-[0.7rem] leading-relaxed text-slate-500">{PAST_PERFORMANCE_WARNING}</p>
        </section>

        {/* Fund facts */}
        <section aria-labelledby="fund-facts" className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
          <h2 id="fund-facts" className="text-sm font-bold text-slate-900 mb-2">Fund record</h2>
          <dl>
            <FactRow label="ABN" value={fmtAbn(fund.abn)} />
            <FactRow label="Fund type" value={fund.fundType} />
            {fund.trustee && <FactRow label="Trustee (RSE licensee)" value={fund.trustee} />}
            {fund.totalAssetsBn !== undefined && (
              <FactRow label="Total assets" value={`$${fund.totalAssetsBn.toLocaleString("en-AU")} billion`} />
            )}
            {fund.memberAccounts !== undefined && (
              <FactRow label="Member accounts" value={fund.memberAccounts.toLocaleString("en-AU")} />
            )}
            {fund.expenseRatioPct !== undefined && (
              <FactRow label="Operating expense ratio" value={`${fund.expenseRatioPct.toFixed(2)}%`} />
            )}
          </dl>
          <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-500">
            Source: APRA annual fund-level superannuation statistics, {meta.period} (extract dated{" "}
            {meta.extractedAt}). Factual reported figures, not a rating or recommendation. Returns
            for your investment option will differ — check option-level numbers on the ATO&apos;s{" "}
            <a
              href="https://www.ato.gov.au/calculators-and-tools/super-yoursuper-comparison-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              YourSuper tool
            </a>
            .
          </p>
        </section>

        {/* Switching note */}
        <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 text-xs text-slate-700 leading-relaxed mb-6">
          <p className="font-semibold text-slate-800 mb-1">Thinking of switching?</p>
          <p>
            {SUPER_WARNING_SHORT} Our{" "}
            <Link href="/super/compare-guide" className="font-semibold text-amber-700 underline hover:text-amber-800">
              fund comparison guide
            </Link>{" "}
            walks through fees, insurance, and performance checks step by step.
          </p>
        </div>

        {/* Similar funds */}
        {peers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">
              Other {fund.fundType.toLowerCase()} funds of similar size
            </h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {peers.map((p) => (
                <li key={p.abn}>
                  <Link
                    href={`/super/funds/${p.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {p.ror10yr !== undefined ? `${p.ror10yr.toFixed(1)}% 10yr` : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Adviser cross-link */}
        <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed mb-8">
          Super decisions interact with tax, insurance, and retirement timing.{" "}
          <Link href="/advisors/financial-planners" className="font-semibold text-amber-700 underline hover:text-amber-800">
            Talk to a verified financial planner
          </Link>{" "}
          or read the{" "}
          <Link href="/super" className="font-semibold text-amber-700 underline hover:text-amber-800">
            super guides hub
          </Link>
          .
        </section>

        <ComplianceFooter />
      </div>
    </div>
  );
}
