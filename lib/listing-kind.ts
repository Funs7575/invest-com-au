/**
 * Helpers for the `listing_kind` discriminator on investment_listings.
 *
 * The DB column was added 2026-05 (migration `20260725200000_add_listing_kind`)
 * to let `/invest` render per-kind cards and per-kind filters. This module
 * holds:
 *   - `deriveListingKind(row)` — fallback when the column is null (older
 *     code paths inserting without setting it; SQL backfill missed it).
 *   - per-kind display metadata: label / icon / accent / price-label semantic.
 *   - filter helpers used by the new InvestListingsClient drawer.
 */

import type { InvestmentListing, ListingKind } from "@/lib/types";

// ─── 1. Derivation fallback ──────────────────────────────────────────────

/** Mirror of the SQL backfill in 20260725200000_add_listing_kind.sql.
 *  Keep in sync if either side changes. */
/**
 * Structural input for `deriveListingKind` — looser than the full
 * `InvestmentListing` so callers holding a narrower row shape (e.g. the
 * ListingCard type used on detail pages, which omits `updated_at` and
 * types `vertical` as a plain string) can derive a kind without a cast.
 * The function only reads these four fields.
 */
export type DerivableListing = {
  vertical: string;
  key_metrics?: Record<string, unknown> | null;
  asking_price_cents?: number | null;
  listing_kind?: string | null;
};

export function deriveListingKind(row: DerivableListing): ListingKind {
  if (row.listing_kind) return row.listing_kind as ListingKind;

  const km = (row.key_metrics ?? {}) as Record<string, unknown>;
  const v = row.vertical as string;

  if (km["asx_ticker"] && row.asking_price_cents == null) return "listed_security";

  const physicalKeys = [
    "varietal", "vintage", "cask_type", "case_size_mm", "calibre",
    "artist", "athlete", "engine", "model", "make", "distillery",
    "producer", "sport", "grading", "expression", "transmission",
    "medium", "representation", "colour", "signed",
  ];
  if (v === "fund" && physicalKeys.some((k) => k in km)) return "physical_asset";

  if (v === "funds") return "fund";
  if (v === "fund" && ["aum_billions", "min_investment", "mer_bps", "distribution_yield"].some((k) => k in km)) return "fund";
  if (km["structure"] === "managed_fund" || km["stage"] === "fund") return "fund";

  if (v === "royalties" || km["stage"] === "royalty" || km["royalty_type"]) return "royalty";

  if (["business", "buy-business", "franchise"].includes(v)) return "for_sale_business";
  if (["commercial_property", "commercial-property", "farmland", "livestock"].includes(v)) return "for_sale_asset";
  if (["startups", "startup", "pre_ipo", "pre-ipo"].includes(v)) return "equity_raise";

  // Sector verticals — when not a ticker, default to project equity.
  return "project_equity";
}

// ─── 2. Per-kind display metadata ────────────────────────────────────────

export interface ListingKindMeta {
  /** Short label used in card badges + filter chips. */
  label: string;
  /** Plural label used in segmented counts ("Funds (16)"). */
  pluralLabel: string;
  /** lucide-react icon name used by `<Icon name={…} />`. */
  icon: string;
  /** Tailwind accent classes for badges + borders + hovers. */
  accent: {
    badge: string;
    badgeSubtle: string;
    border: string;
    text: string;
    bg: string;
  };
  /** "Asking" / "Min investment" / "Market cap" / etc. — the right
   *  prefix to render above the price on cards. Some kinds (listed
   *  security, royalty) intentionally suppress the "Asking" label. */
  priceLabel: string;
  /** Free-text explainer shown in the kind-filter tooltip / segmented
   *  control help. One sentence. */
  blurb: string;
  /** What CTA verb to use on the card ("Enquire" / "Request IM" /
   *  "Buy via broker" / "Express interest"). */
  ctaLabel: string;
  /** True when the visitor doesn't enquire — the listing routes to
   *  an external broker / DocSend / PDS. */
  externalCta: boolean;
}

export const LISTING_KIND_META: Record<ListingKind, ListingKindMeta> = {
  for_sale_business: {
    label: "For-sale business",
    pluralLabel: "For-sale businesses",
    icon: "store",
    accent: {
      badge: "bg-blue-600 text-white",
      badgeSubtle: "bg-blue-50 text-blue-700 border-blue-200",
      border: "border-blue-200 hover:border-blue-400",
      text: "text-blue-700",
      bg: "bg-blue-100",
    },
    priceLabel: "Asking",
    blurb: "An operating Australian business changing hands — cafes, agencies, e-commerce, franchises.",
    ctaLabel: "Enquire",
    externalCta: false,
  },
  for_sale_asset: {
    label: "Asset for sale",
    pluralLabel: "Assets for sale",
    icon: "building",
    accent: {
      badge: "bg-slate-700 text-white",
      badgeSubtle: "bg-slate-50 text-slate-700 border-slate-200",
      border: "border-slate-200 hover:border-slate-400",
      text: "text-slate-700",
      bg: "bg-slate-100",
    },
    priceLabel: "Asking",
    blurb: "A tangible asset for direct purchase — commercial property, farmland, livestock.",
    ctaLabel: "Enquire",
    externalCta: false,
  },
  equity_raise: {
    label: "Equity raise",
    pluralLabel: "Equity raises",
    icon: "rocket",
    accent: {
      badge: "bg-indigo-600 text-white",
      badgeSubtle: "bg-indigo-50 text-indigo-700 border-indigo-200",
      border: "border-indigo-200 hover:border-indigo-400",
      text: "text-indigo-700",
      bg: "bg-indigo-100",
    },
    priceLabel: "Raising",
    blurb: "Companies raising primary capital — seed to pre-IPO.",
    ctaLabel: "Express interest",
    externalCta: false,
  },
  project_equity: {
    label: "Project equity",
    pluralLabel: "Project equity",
    icon: "factory",
    accent: {
      badge: "bg-amber-600 text-white",
      badgeSubtle: "bg-amber-50 text-amber-700 border-amber-200",
      border: "border-amber-200 hover:border-amber-400",
      text: "text-amber-700",
      bg: "bg-amber-100",
    },
    priceLabel: "Min commitment",
    blurb: "Equity in a single project or SPV — mining tenements, renewables, infrastructure.",
    ctaLabel: "Request data room",
    externalCta: false,
  },
  royalty: {
    label: "Royalty stream",
    pluralLabel: "Royalty streams",
    icon: "percent",
    accent: {
      badge: "bg-rose-600 text-white",
      badgeSubtle: "bg-rose-50 text-rose-700 border-rose-200",
      border: "border-rose-200 hover:border-rose-400",
      text: "text-rose-700",
      bg: "bg-rose-100",
    },
    priceLabel: "Royalty",
    blurb: "Ongoing royalty interests in producing assets — mining, IP, music, oil-gas.",
    ctaLabel: "Request data room",
    externalCta: false,
  },
  fund: {
    label: "Managed fund",
    pluralLabel: "Managed funds",
    icon: "trending-up",
    accent: {
      badge: "bg-violet-600 text-white",
      badgeSubtle: "bg-violet-50 text-violet-700 border-violet-200",
      border: "border-violet-200 hover:border-violet-400",
      text: "text-violet-700",
      bg: "bg-violet-100",
    },
    priceLabel: "Min investment",
    blurb: "Australian-domiciled managed funds — wholesale, retail, SIV-complying.",
    ctaLabel: "Request IM / PDS",
    externalCta: false,
  },
  physical_asset: {
    label: "Physical asset",
    pluralLabel: "Physical assets",
    icon: "gem",
    accent: {
      badge: "bg-fuchsia-600 text-white",
      badgeSubtle: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      border: "border-fuchsia-200 hover:border-fuchsia-400",
      text: "text-fuchsia-700",
      bg: "bg-fuchsia-100",
    },
    priceLabel: "Asking",
    blurb: "Collectibles & physical assets — wine, whisky, watches, classic cars, art, sport memorabilia.",
    ctaLabel: "Enquire",
    externalCta: false,
  },
  listed_security: {
    label: "Listed security",
    pluralLabel: "Listed securities",
    icon: "bar-chart-3",
    accent: {
      badge: "bg-sky-600 text-white",
      badgeSubtle: "bg-sky-50 text-sky-700 border-sky-200",
      border: "border-sky-200 hover:border-sky-400",
      text: "text-sky-700",
      bg: "bg-sky-100",
    },
    priceLabel: "Market",
    blurb: "ASX-listed equities & ETFs — buy via a broker, not from us.",
    ctaLabel: "Buy via broker",
    externalCta: true,
  },
};

export function listingKindMeta(kind: ListingKind | null | undefined): ListingKindMeta {
  return LISTING_KIND_META[kind ?? "project_equity"];
}

// ─── 3. Filter helpers ───────────────────────────────────────────────────

export const ALL_LISTING_KINDS: ListingKind[] = [
  "for_sale_business",
  "for_sale_asset",
  "equity_raise",
  "project_equity",
  "royalty",
  "fund",
  "physical_asset",
  "listed_security",
];

/** Ticket-size buckets — used by the universal "Ticket size" filter.
 *  Values are in cents. Bucket-key strings match URL params. */
export const TICKET_BUCKETS = [
  { key: "", label: "Any ticket", min: 0, max: Infinity },
  { key: "under-10k", label: "Under $10k", min: 0, max: 1_000_000 },
  { key: "10k-100k", label: "$10k – $100k", min: 1_000_000, max: 10_000_000 },
  { key: "100k-1m", label: "$100k – $1M", min: 10_000_000, max: 100_000_000 },
  { key: "1m-10m", label: "$1M – $10M", min: 100_000_000, max: 1_000_000_000 },
  { key: "10m-plus", label: "$10M+", min: 1_000_000_000, max: Infinity },
] as const;

export function ticketBucketByKey(key: string): typeof TICKET_BUCKETS[number] {
  return TICKET_BUCKETS.find((b) => b.key === key) ?? TICKET_BUCKETS[0];
}

/** Investor type — drives "show me what I'm eligible for" filter. */
export type InvestorType = "" | "retail" | "wholesale" | "sophisticated" | "smsf" | "siv" | "family_office";

export const INVESTOR_TYPES: { value: InvestorType; label: string }[] = [
  { value: "", label: "Any investor type" },
  { value: "retail", label: "Retail (PDS path)" },
  { value: "wholesale", label: "Wholesale (s708 / sophisticated)" },
  { value: "smsf", label: "SMSF trustee" },
  { value: "siv", label: "SIV-complying only" },
  { value: "family_office", label: "Family office / institutional" },
];

/** Test whether a listing matches an investor-type filter. The logic
 *  is intentionally permissive — when the listing doesn't carry the
 *  flag we assume "yes" rather than filter it out. The filter exists
 *  to *narrow* obvious mismatches (e.g. wholesale-only when retail
 *  is selected), not to gate everything strictly. */
export function listingMatchesInvestorType(
  l: Pick<InvestmentListing, "key_metrics" | "siv_complying">,
  investorType: InvestorType,
): boolean {
  if (!investorType) return true;
  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
  const retailOpen = km["open_to_retail"] === true || km["retail_eligible"] === true;
  switch (investorType) {
    case "retail":
      // Block wholesale-only listings. Allow listings that have no flag
      // (we assume retail-accessible unless explicitly wholesale-only).
      return !wholesaleOnly || retailOpen;
    case "wholesale":
    case "sophisticated":
      // Pass: wholesale investors qualify for everything they can self-attest.
      return true;
    case "smsf":
      // No structured flag for "SMSF-suitable" today — pass everything.
      // (Future: gate on smsf_eligible key once seeded.)
      return true;
    case "siv":
      return !!l.siv_complying;
    case "family_office":
      // Family office / institutional generally qualify everywhere.
      return true;
    default:
      return true;
  }
}

/** Vertical-specific filter shapes — each kind exposes a different
 *  set of filter dimensions in the drawer. The frontend reads this to
 *  decide which optional filter rows to render. */
export interface VerticalFilterSpec {
  /** True when a vertical-specific yield filter should be shown. */
  showYield: boolean;
  /** True when a hectares filter is meaningful (farmland). */
  showHectares: boolean;
  /** True when a JORC resource / commodity stage filter is meaningful (mining). */
  showMiningStage: boolean;
  /** True when an "ESIC-eligible" toggle is meaningful (startups — gives
   *  the investor an early-stage innovation company tax break). */
  showEsicToggle: boolean;
  /** True when ASX-ticker filter is meaningful (listed securities). */
  showAsxFilter: boolean;
  /** True when AUM / MER filters make sense (funds). */
  showFundMetrics: boolean;
  /** True when capacity / PPA / IRR filters make sense (project equity, renewables). */
  showProjectMetrics: boolean;
  /** True when collectible-specific filters (era / vintage / brand) make sense. */
  showCollectibleMetrics: boolean;
}

export function filterSpecForKind(kind: ListingKind | null): VerticalFilterSpec {
  const k = kind ?? "project_equity";
  return {
    showYield: ["for_sale_asset", "fund", "project_equity", "royalty", "listed_security"].includes(k),
    showHectares: k === "for_sale_asset", // narrowed further by vertical=farmland in UI
    showMiningStage: k === "project_equity",
    showEsicToggle: k === "equity_raise",
    showAsxFilter: k === "listed_security",
    showFundMetrics: k === "fund",
    showProjectMetrics: ["project_equity", "equity_raise"].includes(k),
    showCollectibleMetrics: k === "physical_asset",
  };
}

/** Returns true when a listing has any "freshness" signal worth a badge
 *  (new this week / new this month / closing soon). */
export type FreshnessSignal = "new_this_week" | "new_this_month" | "closing_soon" | null;

export function freshnessSignal(l: Pick<InvestmentListing, "created_at" | "expires_at">): FreshnessSignal {
  const now = Date.now();
  if (l.expires_at) {
    const expiresIn = new Date(l.expires_at).getTime() - now;
    if (expiresIn > 0 && expiresIn < 7 * 86400 * 1000) return "closing_soon";
  }
  if (l.created_at) {
    const ageMs = now - new Date(l.created_at).getTime();
    if (ageMs < 7 * 86400 * 1000) return "new_this_week";
    if (ageMs < 30 * 86400 * 1000) return "new_this_month";
  }
  return null;
}

/** Free-text `price_display` strings that overload the price slot with a
 *  second stat (price + yield / per-unit / tax-perks). When a clean numeric
 *  price is derivable we ignore these — the return metric belongs in its own
 *  slot (see `listingHeadlineStat`), not crammed into the big price number. */
const COMPOUND_PRICE_DISPLAY = /yield|\/\s*(?:credit|unit)|·|≈|=|tax|cgt|esvclp|esic|upfront|exempt|stacked|wholesale|\bmin\b|\bonly\b|\(/i;

/** Drop a redundant leading "AUD" / "A$" — the whole marketplace is AUD, so
 *  `formatAudCompact` omits it and free-text overrides shouldn't re-add it. */
function stripAudPrefix(s: string): string {
  return s.replace(/^\s*(?:aud|au\$|a\$)\s*/i, "").trim();
}

/** The structured, kind-aware numeric price (asking / min-commitment),
 *  formatted compactly. Null when the row carries no priceable number. */
function numericListingPrice(
  l: DerivableListing,
  kind: ListingKind,
  meta: ListingKindMeta,
  km: Record<string, unknown>,
): { label: string; value: string } | null {
  // Franchise / business rows often state only a minimum entry cost
  // (key_metrics.min_investment_cents — already in cents). The bespoke
  // franchise page rendered it as "Total Investment From"; without this
  // branch those rows regress to "Price on application".
  if (kind === "for_sale_business" && !l.asking_price_cents) {
    const rawMinCents = km["min_investment_cents"];
    const minCents = typeof rawMinCents === "number" ? rawMinCents : Number(rawMinCents);
    if (Number.isFinite(minCents) && minCents > 0) {
      return { label: "Total investment from", value: formatAudCompact(minCents) };
    }
  }

  // Fund / project equity: prefer min_investment from key_metrics when
  // it's set and no asking_price was; this is the case for most fund
  // and project rows whose "price" is really a min-commitment.
  const minInvest = km["min_investment_aud"] ?? km["min_commit_aud"] ?? km["min_investment"];
  if ((kind === "fund" || kind === "project_equity") && minInvest != null && !l.asking_price_cents) {
    return { label: meta.priceLabel, value: typeof minInvest === "number" ? formatAudCompact(minInvest * 100) : String(minInvest) };
  }

  if (l.asking_price_cents != null) {
    return { label: meta.priceLabel, value: formatAudCompact(l.asking_price_cents) };
  }

  return null;
}

/** Returns a price-display string for a listing, picking the right prefix for
 *  its kind. A seller's `price_display` override is honoured for simple values
 *  ("$1.495M", "POA"); a *compound* override (price + yield/units/tax-perks) is
 *  dropped in favour of the structured number when one exists, so the big price
 *  number stays a single clean figure. Accepts the structural `DerivableListing`
 *  shape so callers holding raw DB rows don't need a cast. */
export function formatListingPrice(l: DerivableListing & { price_display?: string | null }): {
  label: string;   // "Asking" / "Min investment" / "Raising" / "Market cap"
  value: string;   // "$2.5M" / "$100k" / "ASX: TLS"
} | null {
  const kind = deriveListingKind(l);
  const meta = listingKindMeta(kind);

  // Listed securities: show the ticker + market cap when available.
  if (kind === "listed_security") {
    const km = (l.key_metrics ?? {}) as Record<string, unknown>;
    const ticker = km["asx_ticker"];
    if (ticker) return { label: "ASX", value: String(ticker).toUpperCase() };
    return null;
  }

  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const numeric = numericListingPrice(l, kind, meta, km);

  // Honour a seller override unless it's a compound string we can replace with
  // a clean structured number.
  if (l.price_display) {
    const compound = COMPOUND_PRICE_DISPLAY.test(l.price_display);
    if (!compound || !numeric) {
      return { label: meta.priceLabel, value: stripAudPrefix(l.price_display) };
    }
  }

  return numeric;
}

/** "$2.5M" / "$100k" / "$300" — compact AUD formatter. Input is cents. */
export function formatAudCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    const m = dollars / 1_000_000;
    return `$${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (dollars >= 1_000) {
    const k = dollars / 1_000;
    // Sub-$10k keeps one decimal so e.g. $3,500 reads "$3.5k", not "$4k";
    // larger amounts round to whole thousands.
    return `$${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  return `$${Math.round(dollars).toLocaleString("en-AU")}`;
}
