import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, CURRENT_YEAR, breadcrumbJsonLd } from "@/lib/seo";
import { getBrokerBySlug } from "@/lib/request-cache";
import type { Broker } from "@/lib/types";
import Icon from "@/components/Icon";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

function parseSlugs(versus: string): [string, string] | null {
  const idx = versus.indexOf("-vs-");
  if (idx === -1) return null;
  const a = versus.slice(0, idx);
  const b = versus.slice(idx + 4);
  if (!a || !b) return null;
  return [a, b];
}

export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("slug")
      .eq("status", "active")
      .eq("is_crypto", false)
      .order("rating", { ascending: false })
      .limit(12);
    const slugs = (data || []).map((r: { slug: string }) => r.slug);
    const params: { versus: string }[] = [];
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        const a = slugs[i] as string;
        const b = slugs[j] as string;
        params.push({ versus: `${a}-vs-${b}` });
      }
    }
    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ versus: string }>;
}): Promise<Metadata> {
  const { versus } = await params;
  const parsed = parseSlugs(versus);
  if (!parsed) return { title: "Broker Comparison" };
  const [slugA, slugB] = parsed;
  const [brokerA, brokerB] = await Promise.all([
    getBrokerBySlug(slugA),
    getBrokerBySlug(slugB),
  ]);
  if (!brokerA || !brokerB) return { title: "Broker Comparison" };
  const title = `${brokerA.name} vs ${brokerB.name} (${CURRENT_YEAR}) — Side-by-Side Comparison`;
  const description = `Compare ${brokerA.name} and ${brokerB.name} — ASX fees, US trading, CHESS sponsorship, SMSF support, and more. Find the right broker for you.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/compare/${versus}` },
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`${brokerA.name} vs ${brokerB.name}`)}&subtitle=Side-by-Side+Comparison&type=default`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${filled ? "text-amber-400" : "text-slate-200"}`}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function RatingStars({ rating }: { rating: number | undefined }) {
  const r = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={r >= n - 0.25} />
      ))}
      <span className="ml-1 text-xs font-bold text-slate-700">{r > 0 ? r.toFixed(1) : "—"}</span>
    </span>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="text-emerald-600 font-semibold">✓ Yes</span>
  ) : (
    <span className="text-slate-400">✗ No</span>
  );
}

type CompareRowProps = {
  label: string;
  a: ReactNode;
  b: ReactNode;
  highlight?: "a" | "b" | null;
};
function CompareRow({ label, a, b, highlight }: CompareRowProps) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4 text-xs font-medium text-slate-500 w-36 align-middle">{label}</td>
      <td className={`py-3 px-4 text-sm font-semibold align-middle text-center ${highlight === "a" ? "bg-amber-50" : ""}`}>
        {a}
      </td>
      <td className={`py-3 px-4 text-sm font-semibold align-middle text-center ${highlight === "b" ? "bg-amber-50" : ""}`}>
        {b}
      </td>
    </tr>
  );
}

function feeHighlight(a: string | undefined, b: string | undefined): "a" | "b" | null {
  const toNum = (s: string | undefined) => {
    if (!s) return Infinity;
    const m = s.match(/[\d.]+/);
    return m ? parseFloat(m[0]) : Infinity;
  };
  const na = toNum(a);
  const nb = toNum(b);
  if (na === nb) return null;
  return na < nb ? "a" : "b";
}

export default async function BrokerVersusPage({
  params,
}: {
  params: Promise<{ versus: string }>;
}) {
  const { versus } = await params;
  const parsed = parseSlugs(versus);
  if (!parsed) notFound();
  const [slugA, slugB] = parsed;

  const [brokerA, brokerB] = await Promise.all([
    getBrokerBySlug(slugA),
    getBrokerBySlug(slugB),
  ]);
  if (!brokerA || !brokerB) notFound();

  const asxHl = feeHighlight(brokerA.asx_fee, brokerB.asx_fee);
  const usHl = feeHighlight(brokerA.us_fee, brokerB.us_fee);
  const fxHl = feeHighlight(
    brokerA.fx_rate != null ? `${brokerA.fx_rate}` : undefined,
    brokerB.fx_rate != null ? `${brokerB.fx_rate}` : undefined,
  );

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Compare", url: `${SITE_URL}/compare` },
    { name: `${brokerA.name} vs ${brokerB.name}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-slate-50 min-h-screen">
        {/* Header */}
        <section className="bg-white border-b border-slate-200 py-8 md:py-10">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <span className="text-slate-300">/</span>
              <Link href="/compare" className="hover:text-slate-900">Compare</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium">
                {brokerA.name} vs {brokerB.name}
              </span>
            </nav>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {brokerA.name} vs {brokerB.name}
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl mt-2">
              Side-by-side comparison of fees, features and suitability.
              Updated {CURRENT_YEAR}.
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="py-8 md:py-10">
          <div className="container-custom grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: comparison table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Logo + CTA header */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-slate-200">
                  {([brokerA, brokerB] as Broker[]).map((broker) => (
                    <div key={broker.slug} className="p-5 flex flex-col items-center gap-3">
                      {broker.logo_url ? (
                        <img
                          src={broker.logo_url}
                          alt={`${broker.name} logo`}
                          className="h-10 object-contain"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-white text-sm"
                          style={{ background: broker.color || "#334155" }}
                        >
                          {broker.name[0]}
                        </div>
                      )}
                      <div className="text-center">
                        <p className="font-extrabold text-slate-900">{broker.name}</p>
                        <RatingStars rating={broker.rating} />
                      </div>
                      {broker.affiliate_url && (
                        <a
                          href={broker.affiliate_url}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
                        >
                          {broker.cta_text || "Open Account"}
                        </a>
                      )}
                      <Link
                        href={`/broker/${broker.slug}`}
                        className="text-xs text-amber-600 hover:underline font-medium"
                      >
                        Full review →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fees comparison */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-extrabold text-slate-900 mb-4">
                  Fees
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 w-36" />
                      <th className="py-2 px-4 text-center font-extrabold text-slate-900">
                        {brokerA.name}
                      </th>
                      <th className="py-2 px-4 text-center font-extrabold text-slate-900">
                        {brokerB.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow
                      label="ASX trades"
                      a={brokerA.asx_fee ?? "—"}
                      b={brokerB.asx_fee ?? "—"}
                      highlight={asxHl}
                    />
                    <CompareRow
                      label="US trades"
                      a={brokerA.us_fee ?? "—"}
                      b={brokerB.us_fee ?? "—"}
                      highlight={usHl}
                    />
                    <CompareRow
                      label="FX fee"
                      a={brokerA.fx_rate != null ? `${brokerA.fx_rate}%` : "—"}
                      b={brokerB.fx_rate != null ? `${brokerB.fx_rate}%` : "—"}
                      highlight={fxHl}
                    />
                    <CompareRow
                      label="Inactivity fee"
                      a={brokerA.inactivity_fee ?? "None"}
                      b={brokerB.inactivity_fee ?? "None"}
                    />
                    <CompareRow
                      label="Min. deposit"
                      a={brokerA.min_deposit ?? "None"}
                      b={brokerB.min_deposit ?? "None"}
                    />
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-400 mt-3">
                  ✦ = lower fee highlighted. Always verify on the broker&rsquo;s
                  official fee schedule before trading.
                </p>
              </div>

              {/* Features comparison */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-base font-extrabold text-slate-900 mb-4">
                  Features
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-xs font-bold text-slate-500 w-36" />
                      <th className="py-2 px-4 text-center font-extrabold text-slate-900">
                        {brokerA.name}
                      </th>
                      <th className="py-2 px-4 text-center font-extrabold text-slate-900">
                        {brokerB.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow
                      label="CHESS sponsored"
                      a={<YesNo value={brokerA.chess_sponsored} />}
                      b={<YesNo value={brokerB.chess_sponsored} />}
                    />
                    <CompareRow
                      label="SMSF account"
                      a={<YesNo value={brokerA.smsf_support} />}
                      b={<YesNo value={brokerB.smsf_support} />}
                    />
                    <CompareRow
                      label="Markets"
                      a={brokerA.markets?.slice(0, 4).join(", ") ?? "—"}
                      b={brokerB.markets?.slice(0, 4).join(", ") ?? "—"}
                    />
                    <CompareRow
                      label="Platforms"
                      a={brokerA.platforms?.join(", ") ?? "—"}
                      b={brokerB.platforms?.join(", ") ?? "—"}
                    />
                    <CompareRow
                      label="Regulated by"
                      a={brokerA.regulated_by ?? "—"}
                      b={brokerB.regulated_by ?? "—"}
                    />
                    <CompareRow
                      label="Founded"
                      a={brokerA.year_founded ?? "—"}
                      b={brokerB.year_founded ?? "—"}
                    />
                  </tbody>
                </table>
              </div>

              {/* Pros & Cons */}
              {((brokerA.pros?.length ?? 0) > 0 || (brokerB.pros?.length ?? 0) > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([brokerA, brokerB] as Broker[]).map((broker) => (
                    <div key={broker.slug} className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                        {broker.name} — pros &amp; cons
                      </h3>
                      {(broker.pros?.length ?? 0) > 0 && (
                        <ul className="space-y-1.5 mb-3">
                          {broker.pros!.slice(0, 4).map((pro, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                              <Icon name="check" size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(broker.cons?.length ?? 0) > 0 && (
                        <ul className="space-y-1.5">
                          {broker.cons!.slice(0, 3).map((con, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                              <Icon name="x" size={12} className="text-red-400 mt-0.5 shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Quick verdict */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-slate-900 mb-3">
                  Quick verdict
                </h2>
                <div className="space-y-3">
                  {([brokerA, brokerB] as Broker[]).map((broker) => (
                    <div key={broker.slug} className="border border-slate-100 rounded-lg p-3">
                      <p className="font-extrabold text-sm text-slate-900">{broker.name}</p>
                      {broker.tagline && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{broker.tagline}</p>
                      )}
                      <RatingStars rating={broker.rating} />
                      {broker.affiliate_url && (
                        <a
                          href={broker.affiliate_url}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg w-full justify-center"
                        >
                          {broker.cta_text || "Open Account"}
                          <Icon name="external-link" size={10} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href="/compare"
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
                >
                  Compare all brokers
                  <Icon name="arrow-right" size={12} />
                </Link>
              </div>

              {/* Related comparisons */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-slate-900 mb-3">
                  Related comparisons
                </h2>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href={`/compare/${slugB}-vs-${slugA}`} className="text-amber-600 hover:underline">
                      {brokerB.name} vs {brokerA.name}
                    </Link>
                  </li>
                  <li>
                    <Link href={`/broker/${slugA}`} className="text-amber-600 hover:underline">
                      {brokerA.name} full review
                    </Link>
                  </li>
                  <li>
                    <Link href={`/broker/${slugB}`} className="text-amber-600 hover:underline">
                      {brokerB.name} full review
                    </Link>
                  </li>
                  <li>
                    <Link href="/compare?category=shares" className="text-amber-600 hover:underline">
                      All share trading brokers
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <ComplianceFooter />
      </div>
    </>
  );
}
