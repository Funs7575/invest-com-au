import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import AuthorByline from "@/components/AuthorByline";
import { breadcrumbJsonLd, absoluteUrl, SITE_NAME, REVIEW_AUTHOR } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 1800; // ISR: revalidate every 30 minutes

export const metadata: Metadata = {
  title: `Broker Fee & Data Changes — What Changed — ${SITE_NAME}`,
  description:
    "Track every broker fee and data change in real time. See when ASX brokerage, FX rates, or platform features change across Australian trading platforms.",
  openGraph: {
    title: `Broker Fee & Data Changes — ${SITE_NAME}`,
    description:
      "Track every broker fee and data change in real time. See when ASX brokerage, FX rates, or platform features change.",
    url: absoluteUrl("/whats-new"),
    images: [{ url: `/api/og?title=${encodeURIComponent("What Changed")}&subtitle=${encodeURIComponent("Broker Fee & Data Changes — Tracked in Real Time")}&type=default`, width: 1200, height: 630, alt: "Broker Fee & Data Changes" }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: `Broker Fee & Data Changes — ${SITE_NAME}`,
    description:
      "Track every broker fee and data change in real time. See when ASX brokerage, FX rates, or platform features change.",
    images: [`/api/og?title=${encodeURIComponent("What Changed")}&subtitle=${encodeURIComponent("Broker Fee & Data Changes — Tracked in Real Time")}&type=default`],
  },
  alternates: { canonical: "/whats-new" },
};

/* ─── Helpers ─── */

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage Fee",
  asx_fee_value: "ASX Fee (Numeric)",
  us_fee: "US Share Fee",
  us_fee_value: "US Fee (Numeric)",
  fx_rate: "FX Conversion Rate",
  inactivity_fee: "Inactivity Fee",
  chess_sponsored: "CHESS Sponsorship",
  smsf_support: "SMSF Support",
  rating: "Editor Rating",
  deal: "Active Deal",
  deal_text: "Deal Details",
  deal_expiry: "Deal Expiry",
  min_deposit: "Minimum Deposit",
  fee_page: "Fee Page",
  fee_detected_change: "Fee Page",
};

/** Fields where old/new values are internal hashes, not human-readable */
const HASH_FIELDS = new Set(["fee_page", "fee_detected_change"]);

function formatFieldName(name: string): string {
  return (
    FIELD_LABELS[name] ||
    name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatBrokerName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}

interface DataChange {
  id: number;
  broker_slug: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: "update" | "add" | "remove";
  changed_at: string;
  source: string;
}

interface GroupedMonth {
  key: string;
  label: string;
  changes: DataChange[];
}

/* ─── Page Component ─── */

export default async function WhatsNewPage() {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabase
    .from("broker_data_changes")
    .select("*")
    .gte("changed_at", sixMonthsAgo.toISOString())
    .order("changed_at", { ascending: false });

  const changes = (data || []) as DataChange[];

  // Group by month
  const monthMap = new Map<string, DataChange[]>();
  for (const c of changes) {
    const d = new Date(c.changed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(c);
  }

  const groups: GroupedMonth[] = [];
  for (const [key, items] of monthMap.entries()) {
    groups.push({ key, label: formatMonthLabel(key), changes: items });
  }

  // Breadcrumbs
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "What Changed" },
  ]);

  // ItemList schema for change entries
  const itemListLd = changes.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Broker Fee & Data Changes",
        description: "Recent changes to broker fees, features, and data across Australian trading platforms.",
        numberOfItems: changes.length,
        itemListElement: changes.slice(0, 50).map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${formatBrokerName(c.broker_slug)}: ${formatFieldName(c.field_name)} ${c.change_type}`,
          description: HASH_FIELDS.has(c.field_name)
            ? `Change detected on pricing page on ${formatDate(c.changed_at)}`
            : c.change_type === "update"
              ? `Changed from "${c.old_value || "—"}" to "${c.new_value || "—"}" on ${formatDate(c.changed_at)}`
              : c.change_type === "add"
                ? `Added: ${c.new_value || "—"} on ${formatDate(c.changed_at)}`
                : `Removed: ${c.old_value || "—"} on ${formatDate(c.changed_at)}`,
        })),
      }
    : null;

  const changeBadgeClass: Record<string, string> = {
    update: "bg-blue-50 text-blue-700",
    add: "bg-green-50 text-green-700",
    remove: "bg-red-50 text-red-700",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {itemListLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      )}
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">What Changed</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">
            What Changed
          </h1>
          <p className="text-slate-500 mt-1">
            Tracking broker fee and data changes so you always have accurate
            information. Every change is logged automatically when we verify
            broker pricing.
          </p>

          <AuthorByline
            name={REVIEW_AUTHOR.name}
            verifiedDate={
              changes.length > 0
                ? new Date(changes[0].changed_at).toLocaleDateString("en-AU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : undefined
            }
            showMethodologyLink
          />
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">
              No changes recorded yet. When broker fees or data change,
              they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {group.label}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    ({group.changes.length} change{group.changes.length !== 1 ? "s" : ""})
                  </span>
                </h2>
                <div className="space-y-2">
                  {group.changes.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3"
                    >
                      <div className="mt-0.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${changeBadgeClass[c.change_type] || ""}`}
                        >
                          {c.change_type}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/broker/${c.broker_slug}`}
                            className="font-semibold text-slate-900 text-sm hover:text-blue-700 hover:underline"
                          >
                            {formatBrokerName(c.broker_slug)}
                          </Link>
                          <span className="text-slate-400 text-xs">
                            {formatFieldName(c.field_name)}
                          </span>
                        </div>
                        {HASH_FIELDS.has(c.field_name) ? (
                          <p className="text-xs text-slate-500 mt-1">Change detected on pricing page</p>
                        ) : (
                          <>
                            {c.change_type === "update" && (
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <span className="line-through text-red-400 truncate max-w-[180px]">
                                  {c.old_value || "—"}
                                </span>
                                <span className="text-slate-300">&rarr;</span>
                                <span className="text-blue-700 font-medium truncate max-w-[180px]">
                                  {c.new_value || "—"}
                                </span>
                              </div>
                            )}
                            {c.change_type === "add" && (
                              <p className="text-xs text-green-700 mt-1">
                                {c.new_value}
                              </p>
                            )}
                            {c.change_type === "remove" && (
                              <p className="text-xs text-red-500 line-through mt-1">
                                {c.old_value}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(c.changed_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Trust signals */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>Changes detected automatically via fee page monitoring</span>
            <span>&middot;</span>
            <Link href="/methodology" className="hover:text-slate-600 hover:underline">
              How we verify fees
            </Link>
            <span>&middot;</span>
            <Link href="/how-we-earn" className="hover:text-slate-600 hover:underline">
              How we earn money
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
