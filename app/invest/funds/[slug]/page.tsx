import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
// eslint-disable-next-line no-restricted-imports -- pre-IA-refactor; admin client used here historically because the original schema lacked an anon SELECT policy on fund_listings. Migrate to createClient + an explicit anon policy on status='active' in a follow-up; out of scope for the 2026-05-07 IA refactor.
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";
import RegisterInterestForm from "@/components/funds/RegisterInterestForm";
import type { FundListing } from "../FundsDirectoryClient";

export const revalidate = 600;

async function fetchFund(slug: string): Promise<FundListing | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("fund_listings")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    return (data as FundListing | null) || null;
  } catch {
    return null;
  }
}

async function fetchRelated(fundType: string | null, excludeId: number): Promise<FundListing[]> {
  if (!fundType) return [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("fund_listings")
      .select("id, title, slug, fund_type, manager_name, min_investment_cents, target_return_percent, featured, featured_tier, siv_complying, open_to_retail, description, fund_size_cents, firb_relevant, status")
      .eq("fund_type", fundType)
      .eq("status", "active")
      .neq("id", excludeId)
      .limit(3);
    return (data as FundListing[] | null) || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fund = await fetchFund(slug);
  if (!fund) {
    return {
      title: `Investment Fund — ${CURRENT_YEAR}`,
      description: "Australian investment funds directory.",
    };
  }
  const sivSuffix = fund.siv_complying ? " · SIV Complying" : "";
  return {
    title: `${fund.title}${sivSuffix} (${CURRENT_YEAR})`,
    description:
      fund.description?.slice(0, 155) ||
      `${fund.title} — Australian investment fund managed by ${fund.manager_name ?? "a licensed AFSL holder"}.`,
    alternates: { canonical: `${SITE_URL}/invest/funds/${fund.slug}` },
  };
}

function formatCentsAud(cents: number | null): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  if (dollars >= 1_000_000)
    return `A$${(dollars / 1_000_000).toFixed(dollars >= 10_000_000 ? 0 : 1)}M`;
  if (dollars >= 1_000) return `A$${(dollars / 1_000).toFixed(0)}K`;
  return `A$${dollars.toFixed(0)}`;
}

function formatReturn(pct: number | null): string {
  if (pct == null) return "—";
  const num = Number(pct);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}% p.a. target`;
}

const FUND_TYPE_LABELS: Record<string, string> = {
  managed_fund: "Managed Fund",
  syndicated_property: "Syndicated Property",
  infrastructure: "Infrastructure",
  unlisted_equity: "Unlisted Equity",
  wholesale: "Wholesale Fund",
  retail: "Retail Fund",
};

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fund = await fetchFund(slug);
  if (!fund) notFound();
  const related = await fetchRelated(fund.fund_type, fund.id);

  const typeLabel = fund.fund_type
    ? FUND_TYPE_LABELS[fund.fund_type] ?? "Fund"
    : "Fund";

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Opportunities", url: `${SITE_URL}/invest` },
    { name: "Fund opportunities", url: `${SITE_URL}/invest/funds` },
    { name: fund.title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-slate-50 min-h-screen">
        {/* Header */}
        <section className="bg-white border-b border-slate-200 py-6 md:py-8">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/invest" className="hover:text-slate-900">
                Opportunities
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/invest/funds" className="hover:text-slate-900">
                Fund opportunities
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium line-clamp-1">
                {fund.title}
              </span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {typeLabel}
              </span>
              {fund.featured && (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {fund.title}
            </h1>
            {fund.manager_name && (
              <p className="text-sm md:text-base text-slate-600 mt-1">
                Managed by <strong>{fund.manager_name}</strong>
              </p>
            )}

            {/* Eligibility & disclosure band — up to 8 conditional pills.
                pds_url, im_url, expression_of_interest_only come from
                migration 20260507_fund_listings_disclosure_columns.sql.
                Pre-migration deploys: those three columns are undefined,
                so the corresponding pills simply don't render. */}
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                Eligibility &amp; disclosure
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {fund.open_to_retail === true && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Retail accessible
                  </span>
                )}
                {fund.open_to_retail === false && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                    Wholesale / sophisticated only
                  </span>
                )}
                {(fund.siv_complying || fund.firb_relevant) && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                    Foreign-investor relevant
                  </span>
                )}
                {fund.siv_complying && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    SIV relevant
                  </span>
                )}
                {fund.firb_relevant && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    FIRB relevant
                  </span>
                )}
                {fund.pds_url && (
                  <a
                    href={fund.pds_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  >
                    PDS available ↗
                  </a>
                )}
                {fund.im_url && (
                  <a
                    href={fund.im_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  >
                    IM available ↗
                  </a>
                )}
                {fund.expression_of_interest_only && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Expression of interest only
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Body + sticky sidebar */}
        <section className="py-8 md:py-10">
          <div className="container-custom grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">
                  Overview
                </h2>
                <p className="text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                  {fund.description ??
                    "No description available for this fund."}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                  Key Metrics
                </h2>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label="Min investment" value={formatCentsAud(fund.min_investment_cents)} />
                  <Metric label="Target return" value={formatReturn(fund.target_return_percent)} />
                  <Metric label="Fund size" value={formatCentsAud(fund.fund_size_cents)} />
                  <Metric label="Retail access" value={fund.open_to_retail ? "Yes" : "Wholesale only"} />
                </dl>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                  <strong>Target return, if disclosed — not guaranteed.</strong>{" "}
                  Past performance is not a reliable indicator of future
                  returns. Targets are projections set by the manager and may
                  not be met.
                </p>
              </div>

              {(fund.siv_complying || fund.firb_relevant) && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                    Foreign-investor eligibility
                  </h2>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {fund.siv_complying && (
                      <li className="flex items-start gap-2">
                        <Icon name="check-circle" size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Potentially suitable for Significant Investor Visa
                          (SIV) complying investment. Always confirm current
                          eligibility with your immigration investment lawyer
                          and the fund manager before relying on this status.
                        </span>
                      </li>
                    )}
                    {fund.firb_relevant && (
                      <li className="flex items-start gap-2">
                        <Icon name="check-circle" size={18} className="text-sky-600 shrink-0 mt-0.5" />
                        <span>
                          Investment may trigger FIRB notification for
                          non-resident investors depending on holding size
                          and asset class. Engage a foreign-investment lawyer
                          before committing.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>General advice warning.</strong> This page provides
                  general information only, not personal financial product
                  advice. The fund manager operates under an AFSL and any
                  decision to invest should be based on the fund&rsquo;s
                  Product Disclosure Statement (PDS) or Information Memorandum
                  (IM). Past performance is not a reliable indicator of future
                  returns. Consider obtaining personal advice from a licensed
                  adviser before investing.
                </p>
              </div>
            </div>

            {/* Sticky sidebar */}
            <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
              <RegisterInterestForm fundId={fund.id} fundTitle={fund.title} />

              {/* Need advice first? Routes to expert / matching / request
                  surfaces. Required for regulated fund-opportunity pages
                  per the IA refactor — gives users a clear non-fund path
                  before they register interest. */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-1">
                  Need advice first?
                </p>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  This page is general information only. Speak to a licensed
                  adviser before committing.
                </p>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Link
                      href="/advisors?type=financial"
                      className="text-amber-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Find an adviser
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/quiz"
                      className="text-amber-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Get matched
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/quotes/post"
                      className="text-amber-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Post a request
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-10 bg-white border-t border-slate-200">
            <div className="container-custom">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
                Similar funds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/invest/funds/${r.slug}`}
                    className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {r.fund_type ? FUND_TYPE_LABELS[r.fund_type] : "Fund"}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1 line-clamp-2">
                      {r.title}
                    </h3>
                    {r.manager_name && (
                      <p className="text-xs text-slate-500 mt-1">
                        {r.manager_name}
                      </p>
                    )}
                    <p className="text-xs font-bold text-amber-600 mt-3 inline-flex items-center gap-1">
                      View fund
                      <Icon name="arrow-right" size={12} />
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
      <dt className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
        {label}
      </dt>
      <dd className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">
        {value}
      </dd>
    </div>
  );
}
