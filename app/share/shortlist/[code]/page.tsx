import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import type { Broker } from "@/lib/types";
import BrokerCard from "@/components/BrokerCard";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 300;

async function loadShortlist(code: string): Promise<{
  slugs: string[];
  brokers: Broker[];
} | null> {
  if (!code || code.length < 4 || code.length > 16) return null;

  const supabase = await createClient();
  const { data: shortlist } = await supabase
    .from("shared_shortlists")
    .select("code, broker_slugs, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!shortlist) return null;
  if (shortlist.expires_at && new Date(shortlist.expires_at).getTime() < Date.now()) {
    return null;
  }

  const slugs: string[] = Array.isArray(shortlist.broker_slugs)
    ? shortlist.broker_slugs.filter((s): s is string => typeof s === "string")
    : [];
  if (slugs.length === 0) return { slugs: [], brokers: [] };

  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, fee_verified_date, status",
    )
    .in("slug", slugs)
    .eq("status", "active");

  // Preserve the order the user originally saved them in.
  const bySlug = new Map<string, Broker>();
  for (const b of (brokers ?? []) as Broker[]) bySlug.set(b.slug, b);
  const ordered = slugs
    .map((s) => bySlug.get(s))
    .filter((b): b is Broker => Boolean(b));

  // Fire-and-forget increment on view count
  void supabase.rpc("increment_shortlist_views", { p_code: code }).then(
    () => undefined,
    () => {
      // fallback: direct update if the RPC doesn't exist
      void supabase
        .from("shared_shortlists")
        .update({ view_count: undefined })
        .eq("code", code);
    },
  );

  return { slugs, brokers: ordered };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const loaded = await loadShortlist(code);
  if (!loaded) return {};
  const names = loaded.brokers.map((b) => b.name).join(", ");
  const title = loaded.brokers.length
    ? `${loaded.brokers.length} brokers I'm comparing (${names.slice(0, 80)}${names.length > 80 ? "…" : ""})`
    : "A shared broker shortlist";
  const description = loaded.brokers.length
    ? `A shortlist of ${loaded.brokers.length} Australian brokers to compare side-by-side: ${names}. Build your own on ${SITE_NAME}.`
    : "A shared broker shortlist on invest.com.au.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/share/shortlist/${code}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent("Broker shortlist")}&subtitle=${encodeURIComponent(names || "Comparing platforms")}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: `${SITE_URL}/share/shortlist/${code}` },
    robots: { index: false, follow: true },
  };
}

export default async function SharedShortlistPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const loaded = await loadShortlist(code);
  if (!loaded || loaded.brokers.length === 0) notFound();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Broker shortlist (${loaded.brokers.length})`,
    numberOfItems: loaded.brokers.length,
    itemListElement: loaded.brokers.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div className="bg-slate-50 min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300 mb-2">
              Shared broker shortlist
            </p>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
              {loaded.brokers.length} broker{loaded.brokers.length === 1 ? "" : "s"}{" "}
              on the shortlist
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl">
              Someone shared this shortlist with you. Tap any broker to read
              the full review, or build your own shortlist to save and share.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors"
              >
                Compare all brokers
              </Link>
              <Link
                href="/shortlist"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Build your own shortlist
              </Link>
            </div>
          </div>
        </section>

        <section className="container-custom max-w-5xl py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loaded.brokers.map((broker) => (
              <BrokerCard key={broker.slug} broker={broker} context="compare" />
            ))}
          </div>
        </section>

        <div className="container-custom pb-8">
          <ComplianceFooter />
        </div>
      </div>
    </>
  );
}
