import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

// The submit route inserts via the admin (service-role) client so the
// anon RLS policy on investment_listings doesn't block pending submissions.
// Alias admin.from onto mockServerFrom so existing tests keep working
// without rewriting every mock chain.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/listings/submit/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "10.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/listings/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  vertical: "business",
  title: "Profitable Cafe in CBD",
  description: "A well-established cafe with loyal clientele, strong revenue and growth potential.",
  location_state: "VIC",
  contact_name: "Jane Smith",
  contact_email: "jane@example.com",
};

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/listings/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/listings/submit", {
      method: "POST",
      body: "{ bad json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when vertical is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, vertical: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/vertical/i);
  });

  it("returns 400 when vertical is not in the allowed list", async () => {
    const res = await POST(makePost({ ...VALID_BODY, vertical: "crypto" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/vertical/i);
  });

  it("accepts all valid vertical values", async () => {
    const verticals = ["business", "mining", "farmland", "commercial_property", "franchise", "energy", "fund", "startup"];
    for (const vertical of verticals) {
      mockServerFrom.mockReturnValue(makeInsertChain({ data: { id: 1 }, error: null }));
      const res = await POST(makePost({ ...VALID_BODY, vertical }));
      expect(res.status).toBe(200);
    }
  });

  it("returns 400 when title is too short (<5 chars)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, title: "Hi" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Title/i);
  });

  it("returns 400 when description is too short (<50 chars)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, description: "Short desc" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Description/i);
  });

  it("returns 400 when location_state is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, location_state: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/State|Territory/i);
  });

  it("returns 400 when contact_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, contact_name: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Contact name/i);
  });

  it("returns 400 when contact_email is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, contact_email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 500 when DB insert fails", async () => {
    mockServerFrom.mockReturnValue(
      makeInsertChain({ data: null, error: { message: "unique_violation" } }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to save/i);
  });

  it("returns 200 with listing_id on success", async () => {
    mockServerFrom.mockReturnValue(makeInsertChain({ data: { id: 123 }, error: null }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.listing_id).toBe(123);
  });

  it("sets listing_type to 'featured' when listing_plan is 'featured'", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    const mockInsert = vi.fn((row: Record<string, unknown>) => {
      insertedRow = row;
      return {
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })) })),
      };
    });
    mockServerFrom.mockReturnValue({ insert: mockInsert });

    await POST(makePost({ ...VALID_BODY, listing_plan: "featured" }));
    expect((insertedRow as unknown as Record<string, unknown>)?.listing_type).toBe("featured");
  });

  it("sets listing_type to 'premium' when listing_plan is 'premium'", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    const mockInsert = vi.fn((row: Record<string, unknown>) => {
      insertedRow = row;
      return {
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })) })),
      };
    });
    mockServerFrom.mockReturnValue({ insert: mockInsert });

    await POST(makePost({ ...VALID_BODY, listing_plan: "premium" }));
    expect((insertedRow as unknown as Record<string, unknown>)?.listing_type).toBe("premium");
  });

  it("defaults listing_type to 'standard' when listing_plan is unrecognised", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    const mockInsert = vi.fn((row: Record<string, unknown>) => {
      insertedRow = row;
      return {
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })) })),
      };
    });
    mockServerFrom.mockReturnValue({ insert: mockInsert });

    await POST(makePost({ ...VALID_BODY, listing_plan: undefined }));
    expect((insertedRow as unknown as Record<string, unknown>)?.listing_type).toBe("standard");
  });

  it("sets status to 'pending' on all submissions", async () => {
    let insertedRow: Record<string, unknown> | null = null;
    const mockInsert = vi.fn((row: Record<string, unknown>) => {
      insertedRow = row;
      return {
        select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 1 }, error: null })) })),
      };
    });
    mockServerFrom.mockReturnValue({ insert: mockInsert });

    await POST(makePost(VALID_BODY));
    expect((insertedRow as unknown as Record<string, unknown>)?.status).toBe("pending");
  });

  it("handles optional fields (location_city, firb_eligible, siv_complying, etc.)", async () => {
    mockServerFrom.mockReturnValue(makeInsertChain({ data: { id: 5 }, error: null }));
    const res = await POST(
      makePost({
        ...VALID_BODY,
        location_city: "Melbourne",
        asking_price_display: "$450,000",
        industry: "Hospitality",
        firb_eligible: true,
        siv_complying: false,
        contact_phone: "+61 3 9999 1234",
      }),
    );
    expect(res.status).toBe(200);
  });
});
