import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom, mockRecordTouch, mockIsAllowed, mockVerify } = vi.hoisted(() => ({
  mockFrom: vi.fn<(table: string) => unknown>(),
  mockRecordTouch: vi.fn<(client: unknown, input: Record<string, unknown>) => Promise<boolean>>(
    () => Promise.resolve(true),
  ),
  mockIsAllowed: vi.fn<(scope: string, key: string, opts: unknown) => Promise<boolean>>(() =>
    Promise.resolve(true),
  ),
  mockVerify: vi.fn<(token: string, opts?: unknown) => unknown>(),
}));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/attribution", () => ({
  recordTouch: (client: unknown, input: Record<string, unknown>) =>
    mockRecordTouch(client, input),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (scope: string, key: string, opts: unknown) => mockIsAllowed(scope, key, opts),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/widget/advisor-embed-token", () => ({
  verifyAdvisorEmbedToken: (token: string, opts?: unknown) => mockVerify(token, opts),
}));

import { GET, OPTIONS } from "@/app/api/widget/advisor-embed/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Supabase chain whose terminal `.single()` resolves to `{ data, error }`. */
function makeSingleChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

/** Supabase chain whose terminal `.limit()` resolves to `{ data, error }` (review list). */
function makeListChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) c[m] = vi.fn(() => c);
  c.limit = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/advisor-embed");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const ADVISOR_ROW = {
  id: 42,
  name: "Jane Smith CFP",
  slug: "jane-smith-cfp",
  type: "financial_planner",
  photo_url: null,
  rating: 4.9,
  review_count: 31,
  verified: true,
  location_display: "Sydney, NSW",
  booking_link: "https://cal.example.com/jane",
  booking_intro: "Free 20-min intro call",
  initial_consultation_free: true,
  status: "active",
};

const REVIEW_ROWS = [
  { reviewer_name: "Client A", rating: 5, title: "Great help", body: "Jane was fantastic.", created_at: "2026-05-01T00:00:00Z" },
  { reviewer_name: "Client B", rating: 4, title: null, body: "Solid advice.", created_at: "2026-04-01T00:00:00Z" },
];

const VALID_TOKEN = { ok: true, professionalId: 42, slug: "jane-smith-cfp", iat: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  mockIsAllowed.mockResolvedValue(true);
  mockRecordTouch.mockResolvedValue(true);
  mockVerify.mockReturnValue(VALID_TOKEN);
});

// ─── Validation / silent-failure ─────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — renders nothing on bad input", () => {
  it("returns an inert JS comment (200, never an error box) when params are missing", async () => {
    const res = await GET(makeReq({ type: "badge" })); // no slug/token
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body.startsWith("/*")).toBe(true);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    // DB must not be touched when the shape is invalid.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 204 (blank frame) for the iframe format on bad input", async () => {
    const res = await GET(makeReq({ type: "badge", format: "html" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("renders nothing when the token is invalid (no DB read)", async () => {
    mockVerify.mockReturnValue({ ok: false, reason: "bad_signature" });
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "bad" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("embed");
    expect(body).not.toContain("attachShadow");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("renders nothing when the adviser is not found / inactive", async () => {
    mockFrom.mockReturnValue(makeSingleChain(null));
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).not.toContain("attachShadow");
  });

  it("renders nothing when the token id does not match the adviser row id", async () => {
    mockVerify.mockReturnValue({ ok: true, professionalId: 999, slug: "jane-smith-cfp", iat: 1 });
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).not.toContain("attachShadow");
  });

  it("renders nothing when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).not.toContain("attachShadow");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("passes a slug-charset-only value to the DB query (injection chars stripped)", async () => {
    const chain = makeSingleChain(null);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "badge", slug: "jane*/x/*-smith", token: "t" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    const slugCall = eqCalls.find((c) => c[0] === "slug");
    expect(slugCall?.[1]).toBe("janex-smith");
  });
});

// ─── Badge embed ─────────────────────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — badge", () => {
  beforeEach(() => mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW)));

  it("returns 200 JS with CORS + aggressive cache headers", async () => {
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/s-maxage=300/);
  });

  it("renders the rating, verified-review count and verified line", async () => {
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("Jane Smith CFP");
    expect(body).toContain("31"); // review_count
    expect(body).toContain("verified review");
    expect(body).toContain("Verified on invest.com.au");
  });

  it("includes a UTM-tagged dofollow backlink to the profile", async () => {
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).toContain("/advisor/jane-smith-cfp");
    expect(body).toContain("utm_source=embed");
    expect(body).toContain("utm_medium=badge");
    expect(body).toContain("advisor=jane-smith-cfp");
    // dofollow: rel must NOT contain nofollow on the profile backlink.
    expect(body).not.toContain("nofollow");
  });

  it("fires an impression attribution touch (source=embed, medium=badge)", async () => {
    await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    expect(mockRecordTouch).toHaveBeenCalledTimes(1);
    const arg = mockRecordTouch.mock.calls[0]![1];
    expect(arg.source).toBe("embed");
    expect(arg.medium).toBe("badge");
    expect(arg.event).toBe("view");
    expect(arg.pagePath).toBe("/advisor/jane-smith-cfp");
  });

  it("queries only active professionals via the anon client", async () => {
    const chain = makeSingleChain(ADVISOR_ROW);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("professionals");
  });

  it("does not include ranking / award / 'best' language", async () => {
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t" }));
    const body = (await res.text()).toLowerCase();
    expect(body).not.toContain("best advisor");
    expect(body).not.toContain("top advisor");
    expect(body).not.toContain("award");
    expect(body).not.toContain("ranked");
  });
});

// ─── Reviews carousel ────────────────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — reviews", () => {
  it("queries approved reviews only and renders them", async () => {
    // First .from() = professionals (single), second = professional_reviews (list).
    const advisorChain = makeSingleChain(ADVISOR_ROW);
    const reviewChain = makeListChain(REVIEW_ROWS);
    mockFrom.mockReturnValueOnce(advisorChain).mockReturnValueOnce(reviewChain);

    const res = await GET(makeReq({ type: "reviews", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).toContain("Client A");
    expect(body).toContain("Jane was fantastic.");

    const eqCalls = (reviewChain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "approved")).toBe(true);
    expect(eqCalls.some((c) => c[0] === "professional_id" && c[1] === 42)).toBe(true);
    // Only the public-profile fields are projected (no reviewer_email).
    const selectArg = (reviewChain.select as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(selectArg).not.toContain("reviewer_email");
    expect(selectArg).not.toContain("moderation");
  });

  it("medium is 'reviews' in the impression touch", async () => {
    mockFrom
      .mockReturnValueOnce(makeSingleChain(ADVISOR_ROW))
      .mockReturnValueOnce(makeListChain(REVIEW_ROWS));
    await GET(makeReq({ type: "reviews", slug: "jane-smith-cfp", token: "t" }));
    const arg = mockRecordTouch.mock.calls[0]![1];
    expect(arg.medium).toBe("reviews");
  });

  it("handles an adviser with no approved reviews gracefully", async () => {
    mockFrom
      .mockReturnValueOnce(makeSingleChain(ADVISOR_ROW))
      .mockReturnValueOnce(makeListChain([]));
    const res = await GET(makeReq({ type: "reviews", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain("No published reviews yet");
  });
});

// ─── Booking button ──────────────────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — book", () => {
  it("deep-links to the adviser booking_link when present", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "book", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).toContain("https://cal.example.com/jane");
    expect(body).toContain("Book a consultation");
  });

  it("falls back to the profile #contact anchor when booking_link is absent", async () => {
    mockFrom.mockReturnValue(makeSingleChain({ ...ADVISOR_ROW, booking_link: null }));
    const res = await GET(makeReq({ type: "book", slug: "jane-smith-cfp", token: "t" }));
    const body = await res.text();
    expect(body).toContain("/advisor/jane-smith-cfp");
    expect(body).toContain("#contact");
  });
});

// ─── iframe HTML wrapper ─────────────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — html format", () => {
  it("serves an HTML document that inlines the embed script", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t", format: "html" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("<script>");
    expect(body).toContain("attachShadow");
    expect(body).toContain('name="robots" content="noindex"');
  });
});

// ─── Dark theme ──────────────────────────────────────────────────────────────

describe("GET /api/widget/advisor-embed — theme", () => {
  it("bakes the requested theme into the payload", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "badge", slug: "jane-smith-cfp", token: "t", theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"theme":"dark"');
  });
});

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

describe("OPTIONS /api/widget/advisor-embed", () => {
  it("returns 204 with CORS preflight headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
