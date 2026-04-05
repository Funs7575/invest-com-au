import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";

export type InvestmentListing = {
  id: number;
  vertical: string;
  title: string;
  slug: string;
  description: string | null;
  location_state: string | null;
  location_city: string | null;
  asking_price_cents: number | null;
  price_display: string | null;
  annual_revenue_cents: number | null;
  annual_profit_cents: number | null;
  industry: string | null;
  sub_category: string | null;
  key_metrics: Record<string, unknown>;
  images: string[];
  listing_type: string;
  firb_eligible: boolean;
  siv_complying: boolean;
  status: string;
  views: number;
  enquiries: number;
  created_at: string;
};

function formatCents(cents: number): string {
  if (cents >= 100_000_000_00) return `$${(cents / 100_000_000_00).toFixed(1)}B`;
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(0)}k`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

function getKeyMetric(listing: InvestmentListing): string | null {
  const km = listing.key_metrics ?? {};
  switch (listing.vertical) {
    case "business": {
      const ebitda = km.annual_ebitda as number | undefined;
      if (ebitda) return `Annual Profit: ${formatCents(ebitda)}`;
      if (listing.annual_profit_cents) return `Annual Profit: ${formatCents(listing.annual_profit_cents)}`;
      return null;
    }
    case "mining": {
      const commodity = km.commodity as string | undefined;
      const stage = km.stage as string | undefined;
      if (commodity) return `Commodity: ${commodity}${stage ? ` · ${stage}` : ""}`;
      return null;
    }
    case "farmland": {
      const hectares = km.hectares as number | undefined;
      const water = km.water_entitlements_ml as number | string | undefined;
      if (hectares) return `${hectares.toLocaleString("en-AU")} ha${water ? ` · Water: ${water} ML` : ""}`;
      return null;
    }
    case "commercial_property": {
      const yieldPct = km.yield_percent as number | undefined;
      const sqm = km.sqm as number | undefined;
      if (yieldPct) return `Yield: ${yieldPct.toFixed(1)}%${sqm ? ` · ${sqm.toLocaleString("en-AU")} sqm` : ""}`;
      return null;
    }
    case "franchise": {
      const minInv = km.min_investment_cents as number | undefined;
      const brand = km.brand as string | undefined;
      if (minInv) return `Investment from ${formatCents(minInv)}${brand ? ` · ${brand}` : ""}`;
      return null;
    }
    case "energy": {
      const mw = km.capacity_mw as number | undefined;
      const stage = km.stage as string | undefined;
      if (mw) return `${mw} MW${stage ? ` · ${stage}` : ""}`;
      return null;
    }
    case "fund": {
      const min = km.min_investment_cents as number | undefined;
      const ret = km.target_return_percent as number | undefined;
      if (min) return `Min: ${formatCents(min)}${ret ? ` · Target: ${ret}% p.a.` : ""}`;
      return null;
    }
    case "startup": {
      const raising = km.raising_cents as number | undefined;
      const stage = km.stage as string | undefined;
      if (raising) return `Raising ${formatCents(raising)}${stage ? ` · ${stage}` : ""}`;
      return null;
    }
    case "alternatives": {
      const subCat = listing.sub_category;
      const estValue = listing.price_display;
      const parts = [subCat, estValue ? `Est. Value: ${estValue}` : null].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "private_credit": {
      const targetYield = km.target_yield as string | number | undefined;
      const minimum = km.minimum as string | number | undefined;
      const parts = [
        targetYield ? `Target Yield: ${targetYield}` : null,
        minimum ? `Min: ${minimum}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "infrastructure": {
      const infraType = km.infra_type as string | undefined;
      const annualRev = listing.annual_revenue_cents;
      const parts = [
        infraType ? `Type: ${infraType}` : null,
        annualRev ? `Revenue: ${formatCents(annualRev)}` : null,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    default:
      return null;
  }
}

function getDetailPath(vertical: string, slug: string): string {
  switch (vertical) {
    case "business":
      return `/invest/buy-business/listings/${slug}`;
    case "mining":
      return `/invest/mining/opportunities/${slug}`;
    case "farmland":
      return `/invest/farmland/listings/${slug}`;
    case "commercial_property":
      return `/invest/commercial-property/listings/${slug}`;
    case "franchise":
      return `/invest/franchise/listings/${slug}`;
    case "energy":
      return `/invest/renewable-energy/projects/${slug}`;
    case "fund":
      return `/invest/funds/${slug}`;
    case "startup":
      return `/invest/startups/opportunities/${slug}`;
    case "alternatives":
      return `/invest/alternatives/listings/${slug}`;
    case "private_credit":
      return `/invest/private-credit/listings/${slug}`;
    case "infrastructure":
      return `/invest/infrastructure/listings/${slug}`;
    default:
      return `/invest/listings/${slug}`;
  }
}

const VERTICAL_GRADIENTS: Record<string, string> = {
  business: "from-slate-700 to-slate-900",
  mining: "from-amber-700 to-amber-900",
  farmland: "from-green-700 to-green-900",
  commercial_property: "from-blue-700 to-blue-900",
  franchise: "from-purple-700 to-purple-900",
  energy: "from-teal-700 to-teal-900",
  fund: "from-indigo-700 to-indigo-900",
  startup: "from-rose-700 to-rose-900",
  alternatives: "from-rose-700 to-rose-900",
  private_credit: "from-indigo-700 to-indigo-900",
  infrastructure: "from-cyan-700 to-cyan-900",
};

const VERTICAL_ICONS: Record<string, string> = {
  business: "briefcase",
  mining: "pickaxe",
  farmland: "wheat",
  commercial_property: "building",
  franchise: "store",
  energy: "zap",
  fund: "bar-chart-2",
  startup: "rocket",
  alternatives: "gem",
  private_credit: "credit-card",
  infrastructure: "git-branch",
};

interface ListingCardProps {
  listing: InvestmentListing;
  vertical?: string;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const detailPath = getDetailPath(listing.vertical, listing.slug);
  const keyMetric = getKeyMetric(listing);
  const gradient = VERTICAL_GRADIENTS[listing.vertical] ?? "from-slate-700 to-slate-900";
  const location = [listing.location_city, listing.location_state].filter(Boolean).join(", ");
  const isFeatured = listing.listing_type === "featured";
  const isPremium = listing.listing_type === "premium";

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Image / Gradient placeholder */}
      <Link href={detailPath} className="block relative aspect-[16/9] overflow-hidden">
        {listing.images && listing.images.length > 0 ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Icon name={VERTICAL_ICONS[listing.vertical] ?? "briefcase"} size={32} className="text-white/30" />
          </div>
        )}
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges top-left */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isFeatured && (
            <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
          {isPremium && (
            <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
              Premium
            </span>
          )}
          {listing.firb_eligible && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              FIRB Eligible
            </span>
          )}
          {listing.siv_complying && (
            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              SIV
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Icon name="map-pin" size={12} className="shrink-0" />
            <span>{location}</span>
          </div>
        )}

        {/* Title */}
        <Link href={detailPath}>
          <h3 className="text-sm font-bold text-slate-900 leading-snug hover:text-amber-600 transition-colors line-clamp-2">
            {listing.title}
          </h3>
        </Link>

        {/* Price */}
        {listing.price_display && (
          <p className="text-base font-extrabold text-slate-900">
            {listing.price_display}
          </p>
        )}

        {/* Key metric */}
        {keyMetric && (
          <p className="text-xs text-slate-600 font-medium">{keyMetric}</p>
        )}

        {/* Industry / Sub-category pill */}
        {(listing.industry || listing.sub_category) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {listing.industry && (
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full capitalize">
                {listing.industry.replace(/_/g, " ")}
              </span>
            )}
            {listing.sub_category && listing.sub_category !== listing.industry && (
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full capitalize">
                {listing.sub_category.replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        {/* Spacer + CTA */}
        <div className="flex-1" />
        <Link
          href={detailPath}
          className="mt-2 inline-flex items-center justify-center gap-1.5 w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Enquire
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
}
