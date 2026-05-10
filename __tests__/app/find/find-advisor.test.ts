import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ warn: vi.fn(), error: vi.fn() }),
}));

// ── Helpers extracted from page (replicate pure functions) ────────────────────

function slugToType(slug: string): string {
  return slug.replace(/-/g, "_");
}

function citySlugToDisplay(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("slugToType", () => {
  it("converts hyphens to underscores", () => {
    expect(slugToType("smsf-accountant")).toBe("smsf_accountant");
    expect(slugToType("financial-planner")).toBe("financial_planner");
    expect(slugToType("buyers-agent")).toBe("buyers_agent");
  });

  it("leaves types without hyphens unchanged", () => {
    expect(slugToType("conveyancer")).toBe("conveyancer");
  });
});

describe("citySlugToDisplay", () => {
  it("converts slug to title-case display name", () => {
    expect(citySlugToDisplay("sydney")).toBe("Sydney");
    expect(citySlugToDisplay("gold-coast")).toBe("Gold Coast");
    expect(citySlugToDisplay("north-sydney")).toBe("North Sydney");
  });

  it("handles single-word cities", () => {
    expect(citySlugToDisplay("perth")).toBe("Perth");
    expect(citySlugToDisplay("melbourne")).toBe("Melbourne");
  });
});

describe("find advisor page — generateStaticParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unique type+city param pairs from DB", async () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [
          { type: "financial_planner", location_suburb: "Sydney" },
          { type: "financial_planner", location_suburb: "Sydney" },  // duplicate
          { type: "mortgage_broker",   location_suburb: "Melbourne" },
          { type: "smsf_accountant",   location_suburb: "Brisbane" },
          { type: "unknown_type",      location_suburb: "Perth" },    // not in registry → skipped
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

    const { generateStaticParams } = await import(
      "@/app/find/[advisor-type]/[city]/page"
    );

    const params = await generateStaticParams();

    expect(params).toHaveLength(3);
    expect(params).toContainEqual({ "advisor-type": "financial-planner", city: "sydney" });
    expect(params).toContainEqual({ "advisor-type": "mortgage-broker",   city: "melbourne" });
    expect(params).toContainEqual({ "advisor-type": "smsf-accountant",   city: "brisbane" });
    // unknown_type should be excluded
    expect(params.every((p) => p["advisor-type"] !== "unknown-type")).toBe(true);
  });

  it("returns empty array when DB errors", async () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

    vi.resetModules();
    const { generateStaticParams } = await import(
      "@/app/find/[advisor-type]/[city]/page"
    );

    const params = await generateStaticParams();
    expect(params).toEqual([]);
  });
});

describe("generateMetadata", () => {
  it("returns correct title for financial-planner in Sydney", async () => {
    vi.resetModules();
    const { generateMetadata } = await import(
      "@/app/find/[advisor-type]/[city]/page"
    );

    const result = await generateMetadata({
      params: Promise.resolve({ "advisor-type": "financial-planner", city: "sydney" }),
    });

    expect(result.title).toContain("Financial Planners");
    expect(result.title).toContain("Sydney");
    expect(result.description).toContain("certified financial planners");
    expect(result.description).toContain("Sydney");
  });

  it("returns empty metadata for unknown type", async () => {
    vi.resetModules();
    const { generateMetadata } = await import(
      "@/app/find/[advisor-type]/[city]/page"
    );

    const result = await generateMetadata({
      params: Promise.resolve({ "advisor-type": "unknown-type", city: "sydney" }),
    });

    expect(result).toEqual({});
  });
});
