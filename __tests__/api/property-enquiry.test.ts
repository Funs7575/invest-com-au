import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn<[string, number, number], Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...(args as [string, number, number])),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

const mockRpc = vi.fn();
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => email.includes("@") && email.includes("."),
  isDisposableEmail: (email: string) => email.endsWith("@mailinator.com"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => "<footer>unsubscribe</footer>"),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

import { POST } from "@/app/api/property/enquiry/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/property/enquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  listing_id: 10,
  user_name: "Alice Smith",
  user_email: "alice@example.com",
  user_message: "Interested",
};

const LISTING = {
  id: 10,
  title: "Bondi Apartments",
  developer_id: 5,
  developer_name: "Build Co",
  property_developers: {
    id: 5,
    name: "Build Co",
    contact_email: "dev@buildco.com",
    credit_balance_cents: 10000,
  },
};

const LEAD = { id: "lead-1" };

function setupHappyPath(overrides: {
  listing?: typeof LISTING | null;
  existingLead?: { id: string } | null;
  insertedLead?: typeof LEAD | null;
  insertError?: { message: string } | null;
} = {}) {
  const {
    listing = LISTING,
    existingLead = null,
    insertedLead = LEAD,
    insertError = null,
  } = overrides;

  mockFrom.mockImplementation((table: string) => {
    if (table === "property_listings") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: listing, error: listing ? null : { message: "not found" } }),
      };
    }
    if (table === "property_leads") {
      // First call → duplicate check (maybySingle), second → insert
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
        single: vi.fn().mockResolvedValue({ data: insertedLead, error: insertError }),
      };
    }
    if (table === "property_developers") {
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
  mockRpc.mockResolvedValue({ error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/property/enquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    process.env.RESEND_API_KEY = "re_test";
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 200 fake success on honeypot trigger (website field)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, website: "spam.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBeNull();
  });

  it("returns 400 when listing_id is missing", async () => {
    const { listing_id: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when user_name is empty", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for disposable email", async () => {
    const res = await POST(makePost({ ...VALID_BODY, user_email: "user@mailinator.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when input is too long", async () => {
    const res = await POST(
      makePost({ ...VALID_BODY, user_name: "A".repeat(201) })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing is not found", async () => {
    setupHappyPath({ listing: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 200 with existing lead_id on duplicate submission", async () => {
    setupHappyPath({ existingLead: { id: "existing-lead" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe("existing-lead");
  });

  it("returns 500 on DB insert error", async () => {
    setupHappyPath({ insertedLead: null, insertError: { message: "DB error" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 200 success with lead_id on happy path", async () => {
    setupHappyPath();
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe("lead-1");
  });

  it("deducts credit from developer when balance is sufficient", async () => {
    let billingEqCalled = false;
    mockFrom.mockImplementation((table: string) => {
      if (table === "property_listings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: LISTING, error: null }),
        };
      }
      if (table === "property_leads") {
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: LEAD, error: null }),
        };
      }
      if (table === "property_developers") {
        billingEqCalled = true;
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });
    mockRpc.mockResolvedValue({ error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect(billingEqCalled).toBe(true);
  });

  it("returns 200 even when email sending fails", async () => {
    setupHappyPath();
    mockFetch.mockRejectedValue(new Error("network error"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
  });
});
