import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockStaticFrom } = vi.hoisted(() => ({ mockStaticFrom: vi.fn() }));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
}));

vi.mock("@/lib/afsl-register", () => ({
  normaliseAfslNumber: (s: string) => s.replace(/\D+/g, ""),
}));

import { GET, OPTIONS } from "@/app/api/widget/trust-mark/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/trust-mark");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const ADVISOR_ROW = {
  name: "Jane Smith CFP",
  afsl_number: "123456",
  verified: true,
  slug: "jane-smith-cfp",
};

const FIRM_ROW = {
  name: "Smith Financial Group",
  afsl_number: "654321",
  slug: "smith-financial-group",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/widget/trust-mark", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });
});

describe("GET /api/widget/trust-mark — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockImplementation(mockFrom);
  });

  it("returns 400 JS comment when ?type= is missing", async () => {
    const res = await GET(makeReq({ slug: "jane-smith-cfp" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    const body = await res.text();
    expect(body).toContain('?type= must be "advisor" or "firm"');
  });

  it("returns 400 when ?type= is an invalid value", async () => {
    const res = await GET(makeReq({ type: "broker", slug: "test" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("?type=");
  });

  it("returns 400 when ?slug= is missing", async () => {
    const res = await GET(makeReq({ type: "advisor" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("missing ?slug=");
  });
});

describe("GET /api/widget/trust-mark — advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockImplementation((..._a: unknown[]) => makeBuilder(ADVISOR_ROW));
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("embeds advisor name and profile path in the JS payload", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("Jane Smith CFP");
    expect(body).toContain("/advisor/jane-smith-cfp");
    expect(body).toContain("Verified by invest.com.au");
  });

  it("embeds AFSL number when present", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("123456");
  });

  it("returns 400 JS comment when advisor not found", async () => {
    mockStaticFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
    const res = await GET(makeReq({ type: "advisor", slug: "ghost" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("advisor not found");
  });

  it("renders dark theme colours when ?theme=dark", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp", theme: "dark" }));
    const body = await res.text();
    // Dark bg colour should appear in styles
    expect(body).toContain("#1e293b");
  });

  it("renders compact variant when ?compact=1", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp", compact: "1" }));
    const body = await res.text();
    // compact badge size appears in styles
    expect(body).toContain("28px");
  });

  it("includes methodology link in the JS payload", async () => {
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("/how-we-verify");
  });

  it("includes unverified notice when verified is false", async () => {
    mockStaticFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder({ ...ADVISOR_ROW, verified: false })
    );
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("Verification pending");
  });
});

describe("GET /api/widget/trust-mark — firm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockImplementation((..._a: unknown[]) => makeBuilder(FIRM_ROW));
  });

  it("returns 200 for a valid firm", async () => {
    const res = await GET(makeReq({ type: "firm", slug: "smith-financial-group" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Smith Financial Group");
    expect(body).toContain("/firm/smith-financial-group");
  });

  it("returns 400 when firm not found", async () => {
    mockStaticFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
    const res = await GET(makeReq({ type: "firm", slug: "missing-firm" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("firm not found");
  });

  it("marks firm as verified (active firms are always verified)", async () => {
    const res = await GET(makeReq({ type: "firm", slug: "smith-financial-group" }));
    const body = await res.text();
    // Unverified notice should NOT appear for a firm
    expect(body).not.toContain("Verification pending");
  });
});

describe("GET /api/widget/trust-mark — AFSL status enrichment", () => {
  it("shows Current label when AFSL register row has status=current", async () => {
    // First call: advisor row, second call: afsl_register row
    mockStaticFrom
      .mockReturnValueOnce(makeBuilder(ADVISOR_ROW))
      .mockReturnValueOnce(makeBuilder({ status: "current" }));

    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("Current");
  });

  it("does not show Current label when AFSL status is not current", async () => {
    mockStaticFrom
      .mockReturnValueOnce(makeBuilder(ADVISOR_ROW))
      .mockReturnValueOnce(makeBuilder({ status: "cancelled" }));

    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).not.toContain("'current'");
  });

  it("handles advisor with no AFSL number (no AFSL lookup query)", async () => {
    mockStaticFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder({ ...ADVISOR_ROW, afsl_number: null })
    );
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Jane Smith CFP");
  });
});
