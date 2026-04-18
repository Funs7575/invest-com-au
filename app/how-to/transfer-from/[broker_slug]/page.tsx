import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 3600;

interface Step {
  title?: string;
  body?: string;
  text?: string;
  [key: string]: unknown;
}

interface GuideRow {
  id: number;
  broker_slug: string;
  transfer_type: string | null;
  steps: Step[] | null;
  chess_transfer_fee: number | null;
  supports_in_specie: boolean | null;
  in_specie_notes: string | null;
  special_requirements: string[] | null;
  estimated_timeline_days: number | null;
  exit_fees: string | null;
  helpful_links: Array<{ label: string; url: string }> | null;
}

interface BrokerRow {
  slug: string;
  name: string;
  logo_url: string | null;
  rating: number | string | null;
  tagline: string | null;
  asx_fee: string | null;
  chess_sponsored: boolean | null;
  smsf_support: boolean | null;
}

async function fetchGuide(brokerSlug: string): Promise<GuideRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("broker_transfer_guides")
      .select("*")
      .eq("broker_slug", brokerSlug)
      .maybeSingle();
    return (data as GuideRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchBroker(slug: string): Promise<BrokerRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("brokers")
      .select("slug, name, logo_url, rating, tagline, asx_fee, chess_sponsored, smsf_support")
      .eq("slug", slug)
      .maybeSingle();
    return (data as BrokerRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchTopBrokers(excludeSlug: string): Promise<BrokerRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("brokers")
      .select("slug, name, logo_url, rating, tagline, asx_fee, chess_sponsored, smsf_support")
      .eq("status", "active")
      .eq("is_crypto", false)
      .neq("slug", excludeSlug)
      .order("rating", { ascending: false })
      .limit(5);
    return (data as BrokerRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("broker_transfer_guides")
      .select("broker_slug");
    return (data || []).map((row: { broker_slug: string }) => ({
      broker_slug: row.broker_slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ broker_slug: string }>;
}): Promise<Metadata> {
  const { broker_slug } = await params;
  const broker = await fetchBroker(broker_slug);
  if (!broker) return { title: `How to transfer (${CURRENT_YEAR})` };
  return {
    title: `How to Transfer From ${broker.name} (${CURRENT_YEAR}) — Step-by-Step Guide`,
    description: `Close your ${broker.name} account or transfer your ASX shares to another Australian broker. Step-by-step walkthrough, CHESS transfer fee, in-specie support and realistic timelines.`,
    alternates: {
      canonical: `${SITE_URL}/how-to/transfer-from/${broker_slug}`,
    },
  };
}

function formatFee(cents: number | null): string {
  if (cents == null) return "Contact broker";
  if (cents === 0) return "Free";
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function formatRating(value: number | string | null): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)} / 5`;
}

export default async function TransferFromPage({
  params,
}: {
  params: Promise<{ broker_slug: string }>;
}) {
  const { broker_slug } = await params;
  const [guide, broker] = await Promise.all([
    fetchGuide(broker_slug),
    fetchBroker(broker_slug),
  ]);
  if (!guide || !broker) notFound();

  const topBrokers = await fetchTopBrokers(broker_slug);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "How to", url: `${SITE_URL}/how-to` },
    { name: "Transfer from", url: `${SITE_URL}/how-to/transfer-from` },
    { name: broker.name },
  ]);

  const steps = Array.isArray(guide.steps) ? guide.steps : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-slate-50 min-h-screen">
        <section className="bg-white border-b border-slate-200 py-8 md:py-10">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <span className="text-slate-300">/</span>
              <Link href="/how-to" className="hover:text-slate-900">How to</Link>
              <span className="text-slate-300">/</span>
              <Link
                href="/how-to/transfer-from"
                className="hover:text-slate-900"
              >
                Transfer from
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium">{broker.name}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              How to transfer from {broker.name}
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl mt-3">
              Step-by-step guide to closing your {broker.name} account or
              transferring ASX holdings to a better broker. Updated for {CURRENT_YEAR}.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="container-custom grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                  At-a-glance
                </h2>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric
                    label="CHESS transfer fee"
                    value={formatFee(guide.chess_transfer_fee)}
                  />
                  <Metric
                    label="In-specie"
                    value={guide.supports_in_specie ? "Supported" : "Not supported"}
                  />
                  <Metric
                    label="Timeline"
                    value={
                      guide.estimated_timeline_days
                        ? `${guide.estimated_timeline_days} days`
                        : "Varies"
                    }
                  />
                  <Metric
                    label="Exit fees"
                    value={guide.exit_fees ?? "None disclosed"}
                  />
                </dl>
              </div>

              {steps.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                    Step by step
                  </h2>
                  <ol className="space-y-4">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          {s.title && (
                            <p className="font-bold text-slate-900 text-sm mb-1">
                              {s.title}
                            </p>
                          )}
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {s.body ?? s.text ?? ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {guide.supports_in_specie && guide.in_specie_notes && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-2">
                    In-specie transfer notes
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {guide.in_specie_notes}
                  </p>
                </div>
              )}

              {guide.special_requirements &&
                guide.special_requirements.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-800 mb-2">
                      Special requirements
                    </h3>
                    <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1">
                      {guide.special_requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {guide.helpful_links && guide.helpful_links.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-3">
                    Helpful links
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {guide.helpful_links.map((l, i) => (
                      <li key={i}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-amber-700 hover:underline inline-flex items-center gap-1"
                        >
                          {l.label}
                          <Icon name="external-link" size={12} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="text-base font-extrabold text-slate-900 mb-3">
                  Best brokers to switch to
                </h2>
                {topBrokers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Compare alternatives.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {topBrokers.map((b) => (
                      <li key={b.slug} className="border border-slate-100 rounded-lg p-3">
                        <p className="font-bold text-sm text-slate-900">
                          {b.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Rating: {formatRating(b.rating)}
                          {b.chess_sponsored ? " · CHESS" : ""}
                          {b.smsf_support ? " · SMSF" : ""}
                        </p>
                        {b.asx_fee && (
                          <p className="text-[11px] text-slate-600 mt-1">
                            ASX fee: <strong>{b.asx_fee}</strong>
                          </p>
                        )}
                        <Link
                          href={`/broker/${b.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline mt-2"
                        >
                          Review
                          <Icon name="arrow-right" size={12} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/compare?category=shares"
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg"
                >
                  Compare all brokers
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="py-6 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Transfer fees, in-specie support, and timelines are published by
              {" "}{broker.name} and subject to change. Always confirm current
              fees on the broker&rsquo;s official site before initiating. This
              page is general information only, not personal financial product
              advice.
            </p>
          </div>
        </section>
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
