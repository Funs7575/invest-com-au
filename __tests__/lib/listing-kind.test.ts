import { describe, it, expect, afterEach, vi } from "vitest";
import type { InvestmentListing } from "@/lib/types";
import {
  deriveListingKind,
  LISTING_KIND_META,
  listingKindMeta,
  ALL_LISTING_KINDS,
  TICKET_BUCKETS,
  ticketBucketByKey,
  INVESTOR_TYPES,
  listingMatchesInvestorType,
  filterSpecForKind,
  freshnessSignal,
  formatListingPrice,
  formatAudCompact,
} from "@/lib/listing-kind";

// Minimal helper to build the slice of an InvestmentListing each function needs.
type DeriveInput = Pick<
  InvestmentListing,
  "vertical" | "key_metrics" | "asking_price_cents" | "listing_kind"
>;
function deriveRow(over: Partial<DeriveInput>): DeriveInput {
  return {
    vertical: "startups" as InvestmentListing["vertical"],
    key_metrics: {},
    asking_price_cents: undefined,
    listing_kind: null,
    ...over,
  };
}

describe("deriveListingKind", () => {
  it("returns the explicit listing_kind when present", () => {
    expect(
      deriveListingKind(deriveRow({ listing_kind: "royalty" })),
    ).toBe("royalty");
  });

  it("treats asx_ticker with no asking price as a listed_security", () => {
    expect(
      deriveListingKind(
        deriveRow({ key_metrics: { asx_ticker: "TLS" }, asking_price_cents: undefined }),
      ),
    ).toBe("listed_security");
  });

  it("does NOT treat asx_ticker as listed_security when an asking price is set", () => {
    const kind = deriveListingKind(
      deriveRow({
        vertical: "startups" as InvestmentListing["vertical"],
        key_metrics: { asx_ticker: "TLS" },
        asking_price_cents: 5000,
      }),
    );
    expect(kind).toBe("equity_raise");
  });

  it("maps vertical=fund + a physical key to physical_asset", () => {
    expect(
      deriveListingKind(
        deriveRow({ vertical: "fund" as InvestmentListing["vertical"], key_metrics: { vintage: 1998 } }),
      ),
    ).toBe("physical_asset");
  });

  it("maps vertical=funds to fund", () => {
    expect(
      deriveListingKind(deriveRow({ vertical: "funds" as InvestmentListing["vertical"] })),
    ).toBe("fund");
  });

  it("maps vertical=fund + a fund metric key to fund", () => {
    expect(
      deriveListingKind(
        deriveRow({ vertical: "fund" as InvestmentListing["vertical"], key_metrics: { aum_billions: 2 } }),
      ),
    ).toBe("fund");
  });

  it("maps structure=managed_fund to fund", () => {
    expect(
      deriveListingKind(
        deriveRow({ vertical: "anything" as InvestmentListing["vertical"], key_metrics: { structure: "managed_fund" } }),
      ),
    ).toBe("fund");
  });

  it("maps stage=fund to fund", () => {
    expect(
      deriveListingKind(
        deriveRow({ vertical: "x" as InvestmentListing["vertical"], key_metrics: { stage: "fund" } }),
      ),
    ).toBe("fund");
  });

  it("maps vertical=royalties to royalty", () => {
    expect(
      deriveListingKind(deriveRow({ vertical: "royalties" as InvestmentListing["vertical"] })),
    ).toBe("royalty");
  });

  it("maps stage=royalty / royalty_type to royalty", () => {
    expect(
      deriveListingKind(deriveRow({ vertical: "x" as InvestmentListing["vertical"], key_metrics: { stage: "royalty" } })),
    ).toBe("royalty");
    expect(
      deriveListingKind(deriveRow({ vertical: "x" as InvestmentListing["vertical"], key_metrics: { royalty_type: "music" } })),
    ).toBe("royalty");
  });

  it("maps buy-business / franchise to for_sale_business", () => {
    expect(deriveListingKind(deriveRow({ vertical: "buy-business" as InvestmentListing["vertical"] }))).toBe("for_sale_business");
    expect(deriveListingKind(deriveRow({ vertical: "franchise" as InvestmentListing["vertical"] }))).toBe("for_sale_business");
    // The canonical DB union value — buy-business/franchise are the URL
    // category slugs; rows fetched by the lot pages carry "business".
    expect(deriveListingKind(deriveRow({ vertical: "business" as InvestmentListing["vertical"] }))).toBe("for_sale_business");
  });

  it("maps commercial / farmland / livestock to for_sale_asset", () => {
    for (const v of ["commercial_property", "commercial-property", "farmland", "livestock"]) {
      expect(deriveListingKind(deriveRow({ vertical: v as InvestmentListing["vertical"] }))).toBe("for_sale_asset");
    }
  });

  it("maps startup verticals to equity_raise", () => {
    for (const v of ["startups", "startup", "pre_ipo", "pre-ipo"]) {
      expect(deriveListingKind(deriveRow({ vertical: v as InvestmentListing["vertical"] }))).toBe("equity_raise");
    }
  });

  it("defaults to project_equity for unknown sector verticals", () => {
    expect(
      deriveListingKind(deriveRow({ vertical: "mining" as InvestmentListing["vertical"], key_metrics: {} })),
    ).toBe("project_equity");
  });

  it("handles a null/undefined key_metrics safely", () => {
    expect(
      deriveListingKind(
        deriveRow({ vertical: "mining" as InvestmentListing["vertical"], key_metrics: undefined }),
      ),
    ).toBe("project_equity");
  });
});

describe("LISTING_KIND_META + listingKindMeta", () => {
  it("has a meta entry for every kind in ALL_LISTING_KINDS", () => {
    for (const kind of ALL_LISTING_KINDS) {
      expect(LISTING_KIND_META[kind]).toBeDefined();
    }
  });

  it("every meta has required non-empty string fields and accent block", () => {
    for (const kind of ALL_LISTING_KINDS) {
      const m = LISTING_KIND_META[kind];
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.pluralLabel.length).toBeGreaterThan(0);
      expect(m.icon.length).toBeGreaterThan(0);
      expect(m.priceLabel.length).toBeGreaterThan(0);
      expect(m.blurb.length).toBeGreaterThan(0);
      expect(m.ctaLabel.length).toBeGreaterThan(0);
      expect(typeof m.externalCta).toBe("boolean");
      for (const key of ["badge", "badgeSubtle", "border", "text", "bg"] as const) {
        expect(typeof m.accent[key]).toBe("string");
        expect(m.accent[key].length).toBeGreaterThan(0);
      }
    }
  });

  it("only listed_security uses an external CTA", () => {
    expect(LISTING_KIND_META.listed_security.externalCta).toBe(true);
    const others = ALL_LISTING_KINDS.filter((k) => k !== "listed_security");
    for (const k of others) {
      expect(LISTING_KIND_META[k].externalCta).toBe(false);
    }
  });

  it("listingKindMeta resolves the kind", () => {
    expect(listingKindMeta("fund")).toBe(LISTING_KIND_META.fund);
  });

  it("listingKindMeta falls back to project_equity for null/undefined", () => {
    expect(listingKindMeta(null)).toBe(LISTING_KIND_META.project_equity);
    expect(listingKindMeta(undefined)).toBe(LISTING_KIND_META.project_equity);
  });

  it("ALL_LISTING_KINDS has 8 unique entries", () => {
    expect(ALL_LISTING_KINDS).toHaveLength(8);
    expect(new Set(ALL_LISTING_KINDS).size).toBe(8);
  });
});

describe("ticketBucketByKey", () => {
  it("resolves a known bucket key", () => {
    expect(ticketBucketByKey("10k-100k").label).toBe("$10k – $100k");
  });

  it("falls back to the first (Any) bucket for unknown keys", () => {
    expect(ticketBucketByKey("nonsense")).toBe(TICKET_BUCKETS[0]);
    expect(ticketBucketByKey("")).toBe(TICKET_BUCKETS[0]);
  });

  it("buckets are contiguous and ordered by min", () => {
    const nonEmpty = TICKET_BUCKETS.filter((b) => b.key !== "");
    for (let i = 1; i < nonEmpty.length; i++) {
      expect(nonEmpty[i]!.min).toBe(nonEmpty[i - 1]!.max);
    }
  });
});

describe("INVESTOR_TYPES + listingMatchesInvestorType", () => {
  function row(over: Partial<Pick<InvestmentListing, "key_metrics" | "siv_complying">>) {
    return { key_metrics: {}, siv_complying: false, ...over } as Pick<
      InvestmentListing,
      "key_metrics" | "siv_complying"
    >;
  }

  it("INVESTOR_TYPES includes the empty 'any' default first", () => {
    expect(INVESTOR_TYPES[0]!.value).toBe("");
  });

  it("empty investor type matches everything", () => {
    expect(listingMatchesInvestorType(row({}), "")).toBe(true);
  });

  it("retail is blocked by wholesale-only listings", () => {
    expect(listingMatchesInvestorType(row({ key_metrics: { wholesale_only: true } }), "retail")).toBe(false);
    expect(listingMatchesInvestorType(row({ key_metrics: { s708_required: true } }), "retail")).toBe(false);
    expect(listingMatchesInvestorType(row({ key_metrics: { accredited_only: true } }), "retail")).toBe(false);
  });

  it("retail is allowed when no wholesale flag is present", () => {
    expect(listingMatchesInvestorType(row({}), "retail")).toBe(true);
  });

  it("retail is allowed when retail-open overrides wholesale-only", () => {
    expect(
      listingMatchesInvestorType(
        row({ key_metrics: { wholesale_only: true, open_to_retail: true } }),
        "retail",
      ),
    ).toBe(true);
    expect(
      listingMatchesInvestorType(
        row({ key_metrics: { wholesale_only: true, retail_eligible: true } }),
        "retail",
      ),
    ).toBe(true);
  });

  it("wholesale / sophisticated / smsf / family_office pass everything", () => {
    const restricted = row({ key_metrics: { wholesale_only: true } });
    expect(listingMatchesInvestorType(restricted, "wholesale")).toBe(true);
    expect(listingMatchesInvestorType(restricted, "sophisticated")).toBe(true);
    expect(listingMatchesInvestorType(restricted, "smsf")).toBe(true);
    expect(listingMatchesInvestorType(restricted, "family_office")).toBe(true);
  });

  it("siv requires the siv_complying flag", () => {
    expect(listingMatchesInvestorType(row({ siv_complying: true }), "siv")).toBe(true);
    expect(listingMatchesInvestorType(row({ siv_complying: false }), "siv")).toBe(false);
  });

  it("handles null key_metrics", () => {
    expect(
      listingMatchesInvestorType({ key_metrics: undefined, siv_complying: false }, "retail"),
    ).toBe(true);
  });
});

describe("filterSpecForKind", () => {
  it("fund shows fund metrics + yield, not collectible/mining", () => {
    const spec = filterSpecForKind("fund");
    expect(spec.showFundMetrics).toBe(true);
    expect(spec.showYield).toBe(true);
    expect(spec.showCollectibleMetrics).toBe(false);
    expect(spec.showMiningStage).toBe(false);
  });

  it("project_equity shows mining stage + project metrics + yield", () => {
    const spec = filterSpecForKind("project_equity");
    expect(spec.showMiningStage).toBe(true);
    expect(spec.showProjectMetrics).toBe(true);
    expect(spec.showYield).toBe(true);
  });

  it("for_sale_asset shows hectares + yield", () => {
    const spec = filterSpecForKind("for_sale_asset");
    expect(spec.showHectares).toBe(true);
    expect(spec.showYield).toBe(true);
  });

  it("equity_raise shows esic toggle + project metrics", () => {
    const spec = filterSpecForKind("equity_raise");
    expect(spec.showEsicToggle).toBe(true);
    expect(spec.showProjectMetrics).toBe(true);
  });

  it("listed_security shows asx filter + yield", () => {
    const spec = filterSpecForKind("listed_security");
    expect(spec.showAsxFilter).toBe(true);
    expect(spec.showYield).toBe(true);
  });

  it("physical_asset shows collectible metrics", () => {
    expect(filterSpecForKind("physical_asset").showCollectibleMetrics).toBe(true);
  });

  it("null defaults to project_equity spec", () => {
    expect(filterSpecForKind(null)).toEqual(filterSpecForKind("project_equity"));
  });
});

describe("freshnessSignal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function at(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  it("returns closing_soon when expiry is within 7 days", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2020-01-01T00:00:00Z", expires_at: "2026-05-24T00:00:00Z" }),
    ).toBe("closing_soon");
  });

  it("does not flag closing_soon when expiry already passed", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2020-01-01T00:00:00Z", expires_at: "2026-05-10T00:00:00Z" }),
    ).toBeNull();
  });

  it("does not flag closing_soon when expiry is far out", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2020-01-01T00:00:00Z", expires_at: "2027-01-01T00:00:00Z" }),
    ).toBeNull();
  });

  it("returns new_this_week for very recent created_at", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2026-05-18T00:00:00Z", expires_at: undefined }),
    ).toBe("new_this_week");
  });

  it("returns new_this_month for created_at within 30 days", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2026-05-01T00:00:00Z", expires_at: undefined }),
    ).toBe("new_this_month");
  });

  it("returns null for old listings with no expiry", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2020-01-01T00:00:00Z", expires_at: undefined }),
    ).toBeNull();
  });

  it("closing_soon takes priority over freshness", () => {
    at("2026-05-20T00:00:00Z");
    expect(
      freshnessSignal({ created_at: "2026-05-19T00:00:00Z", expires_at: "2026-05-22T00:00:00Z" }),
    ).toBe("closing_soon");
  });
});

describe("formatAudCompact", () => {
  it("formats millions with one decimal", () => {
    expect(formatAudCompact(250_000_000)).toBe("$2.5M");
  });

  it("strips trailing .0 on whole millions", () => {
    expect(formatAudCompact(200_000_000)).toBe("$2M");
  });

  it("formats >= 10M with no decimal", () => {
    expect(formatAudCompact(1_550_000_000)).toBe("$16M");
  });

  it("formats thousands", () => {
    expect(formatAudCompact(10_000_000)).toBe("$100k");
  });

  it("formats sub-thousand dollars with locale grouping", () => {
    expect(formatAudCompact(30000)).toBe("$300");
  });

  it("rounds small amounts", () => {
    expect(formatAudCompact(99)).toBe("$1");
  });

  it("keeps one decimal for sub-$10k thousands, rounds larger ones", () => {
    expect(formatAudCompact(350_000)).toBe("$3.5k"); // $3,500 — not "$4k"
    expect(formatAudCompact(300_000)).toBe("$3k"); // $3,000 — drops .0
    expect(formatAudCompact(1_200_000)).toBe("$12k"); // $12,000 rounds
  });
});

describe("formatListingPrice", () => {
  type PriceRow = Parameters<typeof formatListingPrice>[0];
  function priceRow(over: Partial<PriceRow>): PriceRow {
    return {
      listing_kind: null,
      vertical: "mining" as InvestmentListing["vertical"],
      price_display: undefined,
      asking_price_cents: undefined,
      key_metrics: {},
      ...over,
    } as PriceRow;
  }

  it("returns ASX ticker for listed securities", () => {
    expect(
      formatListingPrice(
        priceRow({ listing_kind: "listed_security", key_metrics: { asx_ticker: "tls" } }),
      ),
    ).toEqual({ label: "ASX", value: "TLS" });
  });

  it("returns null for listed security without a ticker", () => {
    expect(
      formatListingPrice(priceRow({ listing_kind: "listed_security", key_metrics: {} })),
    ).toBeNull();
  });

  it("uses price_display override when set", () => {
    const res = formatListingPrice(
      priceRow({ listing_kind: "fund", price_display: "POA" }),
    );
    expect(res).toEqual({ label: "Min investment", value: "POA" });
  });

  it("uses min_investment_aud for funds when no asking price", () => {
    const res = formatListingPrice(
      priceRow({ listing_kind: "fund", key_metrics: { min_investment_aud: 50000 } }),
    );
    expect(res).toEqual({ label: "Min investment", value: "$50k" });
  });

  it("uses min_commit_aud for project equity", () => {
    const res = formatListingPrice(
      priceRow({ listing_kind: "project_equity", key_metrics: { min_commit_aud: 250000 } }),
    );
    expect(res).toEqual({ label: "Min commitment", value: "$250k" });
  });

  it("renders a non-number min_investment as a string", () => {
    const res = formatListingPrice(
      priceRow({ listing_kind: "fund", key_metrics: { min_investment: "Negotiable" } }),
    );
    expect(res).toEqual({ label: "Min investment", value: "Negotiable" });
  });

  it("formats asking_price_cents when present", () => {
    const res = formatListingPrice(
      priceRow({ listing_kind: "for_sale_business", asking_price_cents: 250_000_000 }),
    );
    expect(res).toEqual({ label: "Asking", value: "$2.5M" });
  });

  it("falls back to key_metrics.min_investment_cents for franchise/business rows", () => {
    const res = formatListingPrice(
      priceRow({
        listing_kind: "for_sale_business",
        key_metrics: { min_investment_cents: 4_500_000 },
      }),
    );
    expect(res).toEqual({ label: "Total investment from", value: "$45k" });
  });

  it("tolerates a drifted string min_investment_cents on franchise rows", () => {
    const res = formatListingPrice(
      priceRow({
        listing_kind: "for_sale_business",
        key_metrics: { min_investment_cents: "25000000" },
      }),
    );
    expect(res).toEqual({ label: "Total investment from", value: "$250k" });
  });

  it("prefers asking_price_cents over the franchise min-investment fallback", () => {
    const res = formatListingPrice(
      priceRow({
        listing_kind: "for_sale_business",
        asking_price_cents: 9_900_000,
        key_metrics: { min_investment_cents: 4_500_000 },
      }),
    );
    expect(res).toEqual({ label: "Asking", value: "$99k" });
  });

  it("ignores a compound price_display (price + yield) in favour of the numeric price", () => {
    const res = formatListingPrice(
      priceRow({
        listing_kind: "for_sale_asset",
        asking_price_cents: 85_000_000,
        price_display: "AUD $850,000 — Net yield 11.2%",
        key_metrics: { net_yield_pct: 11.2 },
      }),
    );
    expect(res).toEqual({ label: "Asking", value: "$850k" });
  });

  it("ignores a compound min-investment price_display for funds", () => {
    const res = formatListingPrice(
      priceRow({
        listing_kind: "fund",
        price_display: "Min $250,000 · 10% upfront tax offset + 100% CGT exempt",
        key_metrics: { min_investment_aud: 250000 },
      }),
    );
    expect(res).toEqual({ label: "Min investment", value: "$250k" });
  });

  it("keeps a simple price_display but strips a redundant AUD prefix", () => {
    expect(
      formatListingPrice(
        priceRow({ listing_kind: "for_sale_asset", asking_price_cents: 50_000_000, price_display: "AUD $1.495M" }),
      ),
    ).toEqual({ label: "Asking", value: "$1.495M" });
  });

  it("returns null when nothing priceable", () => {
    expect(formatListingPrice(priceRow({ listing_kind: "for_sale_business" }))).toBeNull();
  });
});
