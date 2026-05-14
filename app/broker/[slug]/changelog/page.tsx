import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { getBrokerBySlug } from "@/lib/request-cache";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase.from("brokers").select("slug").eq("status", "active");
  return (data || []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const broker = await getBrokerBySlug(slug);
  if (!broker) return {};
  return {
    title: `${broker.name} Fee & Data Changelog (${CURRENT_YEAR})`,
    description: `Full history of fee changes, rating updates, and data corrections for ${broker.name} on Invest.com.au.`,
    alternates: { canonical: `/broker/${slug}/changelog` },
    openGraph: {
      title: `${broker.name} Changelog`,
      description: `Full history of fee and data changes for ${broker.name}.`,
      url: absoluteUrl(`/broker/${slug}/changelog`),
    },
    twitter: { card: "summary" as const },
  };
}

/** Human-readable labels for broker_data_changes.field_name values */
const FIELD_LABELS: Record<string, string> = {
  asx_fee_value: "ASX brokerage fee",
  us_fee_value: "US brokerage fee",
  fx_rate: "FX markup rate",
  inactivity_fee_value: "Inactivity fee",
  account_fee_value: "Account fee",
  min_deposit: "Minimum deposit",
  rating: "Editorial rating",
  status: "Listing status",
  chess_sponsored: "CHESS sponsorship",
  smsf_support: "SMSF support",
  is_crypto: "Crypto trading",
  platform_type: "Platform type",
  deal: "Promotional deal",
  deal_text: "Deal description",
  deal_expiry: "Deal expiry",
  tagline: "Platform description",
  name: "Platform name",
  sponsorship_tier: "Sponsorship tier",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  fee_update: "Fee update",
  rating_update: "Rating update",
  status_change: "Status change",
  feature_update: "Feature update",
  deal_update: "Deal update",
  data_correction: "Data correction",
  manual_update: "Manual update",
  auto_update: "Auto-detected update",
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";
  // Fee fields — format as dollars
  if (fieldName.endsWith("_value") && !Number.isNaN(Number(value))) {
    const n = Number(value);
    return n === 0 ? "$0" : `$${n.toFixed(2).replace(/\.00$/, "")}`;
  }
  if (fieldName === "fx_rate" && !Number.isNaN(Number(value))) {
    return `${(Number(value) * 100).toFixed(2)}%`;
  }
  if (fieldName === "rating" && !Number.isNaN(Number(value))) {
    return `${Number(value).toFixed(1)} / 5`;
  }
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  return value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type ChangeRow = {
  id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
  changed_at: string;
  source: string | null;
};

export default async function BrokerChangelogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [broker, supabase] = await Promise.all([
    getBrokerBySlug(slug),
    createClient(),
  ]);
  if (!broker) notFound();

  const { data: changes } = await supabase
    .from("broker_data_changes")
    .select("id, field_name, old_value, new_value, change_type, changed_at, source")
    .eq("broker_slug", slug)
    .order("changed_at", { ascending: false })
    .limit(100);

  const rows = (changes || []) as ChangeRow[];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Brokers", url: absoluteUrl("/best") },
    { name: broker.name, url: absoluteUrl(`/broker/${slug}`) },
    { name: "Changelog" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/best" className="hover:text-slate-900">Brokers</Link>
            <span className="mx-2">/</span>
            <Link href={`/broker/${slug}`} className="hover:text-slate-900">{broker.name}</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Changelog</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              {broker.name} — Fee &amp; Data Changelog
            </h1>
            <p className="text-sm text-slate-500">
              Every recorded change to {broker.name}&apos;s fees, ratings, and platform
              data on Invest.com.au. Updated automatically when data changes are
              detected or manually corrected by our editorial team.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/broker/${slug}`}
                className="text-brand underline"
              >
                &larr; Back to {broker.name} review
              </Link>
              <Link
                href="/methodology"
                className="text-slate-400 hover:text-slate-600 underline"
              >
                How we track changes
              </Link>
            </div>
          </div>

          {/* Changelog table */}
          {rows.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm">
                No recorded changes yet for {broker.name}.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Changes are logged when fee data is updated or corrected.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 text-sm">
                        {FIELD_LABELS[row.field_name] ?? row.field_name}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {CHANGE_TYPE_LABELS[row.change_type] ?? row.change_type}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDate(row.changed_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="text-slate-400 line-through text-xs">
                      {formatValue(row.field_name, row.old_value)}
                    </span>
                    <span className="text-slate-400 text-xs">&rarr;</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {formatValue(row.field_name, row.new_value)}
                    </span>
                  </div>
                  {row.source && (
                    <p className="text-[0.65rem] text-slate-400 mt-1">
                      Source: {row.source}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-center text-slate-400 pt-2">
                Showing up to 100 most recent changes. Full history in our audit log.
              </p>
            </div>
          )}
        </div>
      </div>
      <ComplianceFooter />
    </>
  );
}
