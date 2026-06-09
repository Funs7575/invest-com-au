import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks (must be before any imports that pull in the modules) ───────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(),
}));

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: vi.fn((items: unknown[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    items,
  })),
  SITE_URL: "https://invest.com.au",
  SITE_NAME: "Invest.com.au",
  CURRENT_YEAR: 2026,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import {
  generateMetadata,
  generateStaticParams,
} from "@/app/health-scores/[slug]/page";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SCORE_ROW = {
  id: 1,
  broker_slug: "superhero",
  overall_score: 82,
  regulatory_score: 85,
  regulatory_notes: "Full AFSL in good standing.",
  client_money_score: 80,
  client_money_notes: "CHESS sponsored.",
  financial_stability_score: 78,
  financial_stability_notes: null,
  platform_reliability_score: 75,
  platform_reliability_notes: null,
  insurance_score: 90,
  insurance_notes: "Professional indemnity confirmed.",
  afsl_number: "520000",
  afsl_status: "active",
  last_reviewed_at: "2026-03-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const BROKER_ROW = {
  id: 99,
  name: "Superhero",
  slug: "superhero",
  color: "#6366f1",
  icon: null,
  logo_url: null,
  rating: 4.5,
  status: "active",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.not = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

function makeStaticChain(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.not = vi.fn().mockResolvedValue({ data: rows, error: null });
  return c;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("health-scores/[slug]/page — generateStaticParams", () => {
  afterAll(() => vi.restoreAllMocks());

  it("returns slug list from broker_health_scores", async () => {
    const rows = [
      { broker_slug: "superhero" },
      { broker_slug: "selfwealth" },
    ];
    const mockFrom = vi.fn(() => makeStaticChain(rows));
    vi.mocked(createStaticClient).mockReturnValue({ from: mockFrom } as never);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const params = await generateStaticParams();
    expect(params).toEqual([
      { slug: "superhero" },
      { slug: "selfwealth" },
    ]);
  });

  it("returns empty array when env vars are missing", async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const params = await generateStaticParams();
    expect(params).toEqual([]);

    // restore
    if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });
});

describe("health-scores/[slug]/page — generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => vi.restoreAllMocks());

  it("returns correct title and description for a known broker", async () => {
    const scoreChain = makeChain({ data: SCORE_ROW, error: null });
    const brokerChain = makeChain({ data: BROKER_ROW, error: null });

    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      return callCount === 1 ? scoreChain : brokerChain;
    });

    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "superhero" }),
    });

    expect(meta.title).toContain("Superhero");
    expect(meta.title).toContain("82");
    expect(meta.description).toContain("82");
    expect(meta.alternates?.canonical).toBe("/health-scores/superhero");
  });

  it("returns not-found title when score is missing", async () => {
    const scoreChain = makeChain({ data: null, error: { code: "PGRST116" } });
    const brokerChain = makeChain({ data: null, error: { code: "PGRST116" } });

    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      return callCount === 1 ? scoreChain : brokerChain;
    });

    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "unknown-broker" }),
    });

    expect(meta.title).toBe("Health Score Not Found");
  });

  it("includes OG image with broker name in the URL", async () => {
    const scoreChain = makeChain({ data: SCORE_ROW, error: null });
    const brokerChain = makeChain({ data: BROKER_ROW, error: null });

    let callCount = 0;
    const mockFrom = vi.fn(() => {
      callCount++;
      return callCount === 1 ? scoreChain : brokerChain;
    });

    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "superhero" }),
    });

    const ogImages = meta.openGraph?.images;
    expect(Array.isArray(ogImages)).toBe(true);
    const firstImage = (ogImages as { url: string }[])[0];
    expect(firstImage?.url).toContain("Superhero");
  });
});
