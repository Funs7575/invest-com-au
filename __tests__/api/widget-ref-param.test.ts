/**
 * Tests for the ?ref=<partnerId> attribution parameter threaded through
 * all widget routes (/api/widget, /api/widget/calculator,
 * /api/widget/advisors, /api/widget/fee-index, /api/widget/health-scores).
 *
 * This file focuses specifically on the ref-param contract so the
 * individual widget test files stay focused on their own widget logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// All five routes share the same static client, so one mock factory is enough.

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

const { mockCurrentYear } = vi.hoisted(() => ({ mockCurrentYear: { value: 2026 } }));
vi.mock("@/lib/seo", () => ({
  get CURRENT_YEAR() {
    return mockCurrentYear.value;
  },
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  SITE_NAME: "invest.com.au",
}));

import { GET as getBrokerWidget } from "@/app/api/widget/route";
import { GET as getCalcWidget } from "@/app/api/widget/calculator/route";
import { GET as getAdvisorsWidget } from "@/app/api/widget/advisors/route";
import { GET as getFeeIndexWidget } from "@/app/api/widget/fee-index/route";
import { GET as getHealthWidget } from "@/app/api/widget/health-scores/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown[] = []) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in", "not"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data, error: null }));
  return c;
}

function makeReq(base: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost${base}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const BROKER_ROW = {
  name: "Stake", slug: "stake", asx_fee: "$3", us_fee: "$0", fx_rate: "0.6%",
  rating: 4.5, chess_sponsored: true, platform_type: "share_broker", logo_url: null,
  color: "#7c3aed", icon: "S", deal: null, deal_text: null,
  asx_fee_value: 3, us_fee_value: 0, affiliate_url: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCurrentYear.value = 2026;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

// ── /api/widget ───────────────────────────────────────────────────────────────

describe("/api/widget ?ref= threading", () => {
  it("embeds partner ref in REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_ROW]));
    const res = await getBrokerWidget(makeReq("/api/widget", { ref: "partnerA" }));
    const body = await res.text();
    expect(body).toContain("REF_PARAM");
    expect(body).toContain("ref=partnerA");
    expect(body).toContain("source=widget");
  });

  it("falls back to ref=widget&source=embed when ?ref= absent", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_ROW]));
    const res = await getBrokerWidget(makeReq("/api/widget"));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=embed");
  });

  it("URL-encodes partner ref with special characters", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_ROW]));
    const res = await getBrokerWidget(makeReq("/api/widget", { ref: "partner x&y" }));
    const body = await res.text();
    expect(body).toContain("partner%20x%26y");
  });

  it("outbound /go/ links contain the REF_PARAM variable (not a hardcoded ref)", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_ROW]));
    const res = await getBrokerWidget(makeReq("/api/widget", { ref: "pubX" }));
    const body = await res.text();
    // The link construction uses REF_PARAM not a hardcoded string
    expect(body).toContain('"/go/" + esc(b.slug) + "?" + REF_PARAM');
  });

  it("footer link contains the REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_ROW]));
    const res = await getBrokerWidget(makeReq("/api/widget", { ref: "pubX" }));
    const body = await res.text();
    expect(body).toContain('BASE + "?" + REF_PARAM');
  });
});

// ── /api/widget/calculator ────────────────────────────────────────────────────

describe("/api/widget/calculator ?ref= threading", () => {
  const calcChain = () => {
    const chain = makeChain([{ ...BROKER_ROW, asx_fee_value: 3, us_fee_value: 0, fx_rate: 0.6, affiliate_url: null }]);
    return chain;
  };

  it("embeds partner ref in REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(calcChain());
    const res = await getCalcWidget(makeReq("/api/widget/calculator", { ref: "calcPub" }));
    const body = await res.text();
    expect(body).toContain("REF_PARAM");
    expect(body).toContain("ref=calcPub");
    expect(body).toContain("source=calc-widget");
  });

  it("falls back to ref=widget&source=calc-embed when ?ref= absent", async () => {
    mockFrom.mockReturnValue(calcChain());
    const res = await getCalcWidget(makeReq("/api/widget/calculator"));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=calc-embed");
  });

  it("full-calculator link uses REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(calcChain());
    const res = await getCalcWidget(makeReq("/api/widget/calculator", { ref: "cP" }));
    const body = await res.text();
    expect(body).toContain("trade-cost-calculator?");
    expect(body).toContain("REF_PARAM");
  });

  it("footer link uses REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(calcChain());
    const res = await getCalcWidget(makeReq("/api/widget/calculator", { ref: "cP" }));
    const body = await res.text();
    expect(body).toContain('BASE + "?" + REF_PARAM');
  });

  it("outbound /go/ link uses REF_PARAM variable", async () => {
    mockFrom.mockReturnValue(calcChain());
    const res = await getCalcWidget(makeReq("/api/widget/calculator", { ref: "cP" }));
    const body = await res.text();
    expect(body).toContain('"/go/" + esc(r.broker.slug) + "?" + REF_PARAM');
  });
});

// ── /api/widget/advisors ──────────────────────────────────────────────────────

describe("/api/widget/advisors ?ref= threading", () => {
  const ADVISOR = { id: 1, slug: "alice", name: "Alice", firm_name: "Smith", type: "financial-planner",
    location_state: "NSW", location_suburb: "Sydney", location_display: "Sydney NSW",
    photo_url: null, fee_structure: "fee-for-service", initial_consultation_free: true,
    rating: 4.7, review_count: 10, verified: true, offer_text: null, offer_active: false };

  it("embeds partner ref in REF_PARAM when ?ref= provided", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await getAdvisorsWidget(makeReq("/api/widget/advisors", { ref: "advPub" }));
    const body = await res.text();
    expect(body).toContain("ref=advPub");
    expect(body).toContain("source=advisor-widget");
  });

  it("uses default attribution when ?ref= absent", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await getAdvisorsWidget(makeReq("/api/widget/advisors"));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=advisor-embed");
  });
});

// ── /api/widget/fee-index ─────────────────────────────────────────────────────

describe("/api/widget/fee-index ?ref= threading", () => {
  const FI_BROKER = { ...BROKER_ROW, asx_fee: "$3", asx_fee_value: 3 };

  it("embeds partner ref in REF_PARAM when ?ref= provided", async () => {
    mockFrom.mockReturnValue(makeChain([FI_BROKER]));
    const res = await getFeeIndexWidget(makeReq("/api/widget/fee-index", { ref: "fiPub" }));
    const body = await res.text();
    expect(body).toContain("ref=fiPub");
    expect(body).toContain("source=fee-index-widget");
  });

  it("uses default attribution when ?ref= absent", async () => {
    mockFrom.mockReturnValue(makeChain([FI_BROKER]));
    const res = await getFeeIndexWidget(makeReq("/api/widget/fee-index"));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=fee-index-embed");
  });
});

// ── /api/widget/health-scores ─────────────────────────────────────────────────

describe("/api/widget/health-scores ?ref= threading", () => {
  const HS_BROKER = { ...BROKER_ROW, regulated_by: "ASIC — AFSL 509799",
    year_founded: 2017, headquarters: "Sydney, Australia",
    chess_sponsored: true, is_crypto: false, platform_type: "share_broker" };

  it("embeds partner ref in REF_PARAM when ?ref= provided", async () => {
    mockFrom.mockReturnValue(makeChain([HS_BROKER]));
    const res = await getHealthWidget(makeReq("/api/widget/health-scores", { ref: "hsPub" }));
    const body = await res.text();
    expect(body).toContain("ref=hsPub");
    expect(body).toContain("source=health-scores-widget");
  });

  it("uses default attribution when ?ref= absent", async () => {
    mockFrom.mockReturnValue(makeChain([HS_BROKER]));
    const res = await getHealthWidget(makeReq("/api/widget/health-scores"));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=health-scores-embed");
  });
});
