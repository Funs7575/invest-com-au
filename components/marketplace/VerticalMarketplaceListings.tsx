import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";
import EnquireButton from "@/components/marketplace/EnquireButton";
import { getListingVerticalLabel } from "@/lib/listing-verticals";

/**
 * Server component. Fetches active investment_listings for a
 * given vertical and renders a card grid with an Enquire CTA.
 *
 * Designed to be dropped into any /invest/<vertical> hub page
 * below the stocks / ETFs / ways-to-invest sections to surface
 * the marketplace opportunities that live in investment_listings
 * (12 oil-gas, 12 uranium, 10 hydrogen, etc.) but that the hubs
 * previously linked out to instead of rendering inline.
 */

interface Listing {
  id: number;
  vertical: string;
  title: string;
  slug: string;
  description: string | null;
  price_display: string | null;
  asking_price_cents: number | null;
  location_state: string | null;
  location_city: string | null;
  industry: string | null;
  sub_category: string | null;
  key_metrics: Record<string, unknown> | null;
  listing_type: string | null;
  firb_eligible: boolean | null;
  siv_complying: boolean | null;
}

interface Props {
  vertical: string;
  /** Max cards to render. Defaults to 6. */
  limit?: number;
  /** Override the section heading. */
  heading?: string;
  /** Override the subheading / lede. */
  sub?: string;
  /** Theme accent — matches the host page's brand colour. */
  accent?: "amber" | "emerald" | "sky" | "yellow" | "slate";
  /** Optional id for scroll-to links from tabs on the host page. */
  id?: string;
}

const ACCENTS: Record<
  NonNullable<Props["accent"]>,
  { eyebrow: string; button: string }
> = {
  amber: {
    eyebrow: "text-amber-600",
    button: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  yellow: {
    eyebrow: "text-yellow-700",
    button: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  emerald: {
    eyebrow: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  sky: {
    eyebrow: "text-sky-600",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  slate: {
    eyebrow: "text-slate-700",
    button: "bg-slate-900 hover:bg-slate-800 text-white",
  },
};

async function fetchListings(
  vertical: string,
  limit: number,
): Promise<Listing[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("investment_listings")
      .select(
        "id, vertical, title, slug, description, price_display, asking_price_cents, location_state, location_city, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying",
      )
      .eq("vertical", vertical)
      .eq("status", "active")
      .order("listing_type", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as Listing[] | null) || [];
  } catch {
    return [];
  }
}

function formatCents(cents: number | null): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  if (dollars >= 1_000_000)
    return `A$${(dollars / 1_000_000).toFixed(dollars >= 10_000_000 ? 0 : 1)}M`;
  if (dollars >= 1_000) return `A$${(dollars / 1_000).toFixed(0)}K`;
  return `A$${dollars.toFixed(0)}`;
}

export default async function VerticalMarketplaceListings({
  vertical,
  limit = 6,
  heading,
  sub,
  accent = "amber",
  id,
}: Props) {
  const listings = await fetchListings(vertical, limit);
  if (listings.length === 0) return null;

  const accentCls = ACCENTS[accent];
  const label = getListingVerticalLabel(vertical);
  const resolvedHeading =
    heading ?? `${label} investment listings`;
  const resolvedSub =
    sub ??
    `Active investment opportunities in our marketplace for this vertical. Register interest directly with the seller or the listing agent.`;

  return (
    <section
      id={id}
      className="py-10 md:py-12 bg-white border-t border-slate-100"
    >
      <div className="container-custom">
        <div className="mb-6 max-w-3xl">
          <p
            className={`text-xs font-bold uppercase tracking-wider ${accentCls.eyebrow} mb-1`}
          >
            Marketplace
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {resolvedHeading}
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {resolvedSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} buttonCls={accentCls.button} />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href={`/invest/${vertical}/listings`}
            className={`inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline`}
          >
            View all {label.toLowerCase()} listings
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ListingCard({
  listing,
  buttonCls,
}: {
  listing: Listing;
  buttonCls: string;
}) {
  const price =
    listing.price_display ?? formatCents(listing.asking_price_cents) ?? "POA";
  const location = [listing.location_city, listing.location_state]
    .filter(Boolean)
    .join(", ");

  // Pull up to 2 human-readable key_metrics pairs for the card.
  const keyMetrics = extractKeyMetrics(listing.key_metrics);

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {listing.listing_type === "premium" && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
            Premium
          </span>
        )}
        {listing.listing_type === "featured" && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Featured
          </span>
        )}
        {listing.siv_complying && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            SIV
          </span>
        )}
        {listing.firb_eligible && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
            FIRB
          </span>
        )}
        {listing.sub_category && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {listing.sub_category}
          </span>
        )}
      </div>

      <h3 className="text-base font-extrabold text-slate-900 leading-tight mb-1 line-clamp-2">
        {listing.title}
      </h3>

      {location && (
        <p className="text-xs text-slate-500 inline-flex items-center gap-1 mb-2">
          <Icon name="map-pin" size={11} />
          {location}
        </p>
      )}

      {listing.description && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">
          {listing.description}
        </p>
      )}

      {keyMetrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 mb-4 text-xs">
          {keyMetrics.map((m) => (
            <div key={m.label} className="bg-slate-50 rounded-lg px-2.5 py-1.5">
              <dt className="text-[10px] font-bold uppercase text-slate-500 truncate">
                {m.label}
              </dt>
              <dd className="font-extrabold text-slate-900 truncate">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-500">
            Price
          </p>
          <p className="text-sm font-extrabold text-slate-900">{price}</p>
        </div>
        <EnquireButton
          listingId={listing.id}
          listingTitle={listing.title}
          buttonCls={buttonCls}
        />
      </div>
    </article>
  );
}

/**
 * Pull up to 2 human-readable pairs out of the key_metrics JSONB.
 * Prioritises commonly-informative keys and falls back to the
 * first-two-string-values heuristic.
 */
function extractKeyMetrics(
  km: Record<string, unknown> | null | undefined,
): Array<{ label: string; value: string }> {
  if (!km || typeof km !== "object") return [];
  const PRIORITY_KEYS = [
    "asx_ticker",
    "commodity",
    "stage",
    "market_cap_bn_aud",
    "dividend_yield",
    "mer_bps",
    "fssp_eligible",
    "resource_mlb_u3o8",
    "refinery_capacity_bbl_day",
    "capacity_GW",
  ];
  const out: Array<{ label: string; value: string }> = [];
  for (const key of PRIORITY_KEYS) {
    if (out.length >= 2) break;
    const v = km[key];
    if (v == null || v === false) continue;
    out.push({ label: prettify(key), value: String(v) });
  }
  if (out.length < 2) {
    for (const [k, v] of Object.entries(km)) {
      if (out.length >= 2) break;
      if (PRIORITY_KEYS.includes(k)) continue;
      if (v == null || v === false || typeof v === "object") continue;
      out.push({ label: prettify(k), value: String(v) });
    }
  }
  return out;
}

function prettify(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Asx/i, "ASX")
    .replace(/Aud/i, "AUD")
    .replace(/Mer Bps/i, "MER bps");
}
