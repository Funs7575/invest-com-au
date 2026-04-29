import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

const isValidEmailMock = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => true));
const isDisposableEmailMock = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => false));
vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => isValidEmailMock(e),
  isDisposableEmail: (e: string) => isDisposableEmailMock(e),
}));

vi.mock("@/lib/email-templates", () => ({ notificationFooter: () => "<footer/>" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: vi.fn().mockReturnValue({ then: (cb: (v: unknown) => void) => { cb({ error: null }); return Promise.resolve(); } }),
  })),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "@/app/api/property/enquiry/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const LISTING = {
  id: 1,
  title: "Waterfront Penthouse",
  developer_id: 10,
  developer_name: "Luxe Developments",
  property_developers: {
    id: 10,
    name: "Luxe Developments",
    contact_email: "contact@luxe.com.au",
    credit_balance_cents: 10000,
  },
};

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/property/enquiry", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    listing_id: 1,
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    user_message: "I am interested.",
    ...overrides,
  };
}

function fromImpl(listing: unknown, existingLead: unknown, leadInsert: unknown) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === "property_listings") {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.single = vi.fn().mockResolvedValue(listing);
      return c;
    }
    if (table === "property_leads") {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.insert = vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue(leadInsert) })),
      }));
      c.eq = vi.fn(() => c);
      c.gte = vi.fn(() => c);
      c.limit = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue(existingLead);
      return c;
    }
    // property_developers update for billing
    const c: Record<string, unknown> = {};
    c.update = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.gte = vi.fn().mockResolvedValue({ error: null });
    return c;
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/property/enquiry", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, RESEND_API_KEY: "re_test" };
    isRateLimitedMock.mockResolvedValue(false);
    isValidEmailMock.mockReturnValue(true);
    isDisposableEmailMock.mockReturnValue(false);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    mockAdminFrom.mockImplementation(
      fromImpl(
        { data: LISTING, error: null },
        { data: null, error: null },
        { data: { id: 55 }, error: null }
      )
    );
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 429 when rate limited", async () => {
    isRateLimitedMock.mockResolvedValue(true);
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(429);
  });

  it("returns 200 (honeypot) when website spam field present", async () => {
    const res = await POST(makePost(validBody({ website: "http://spam.com" })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBeNull();
  });

  it("returns 400 when listing_id is missing", async () => {
    const res = await POST(makePost({ user_name: "Bob", user_email: "bob@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when user_name is missing", async () => {
    const res = await POST(makePost({ listing_id: 1, user_email: "bob@test.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    isValidEmailMock.mockReturnValue(false);
    const res = await POST(makePost(validBody({ user_email: "not-an-email" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  it("returns 400 for disposable email", async () => {
    isDisposableEmailMock.mockReturnValue(true);
    const res = await POST(makePost(validBody({ user_email: "temp@mailinator.com" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/real email/i);
  });

  it("returns 400 when user_name exceeds 200 chars", async () => {
    const res = await POST(makePost(validBody({ user_name: "A".repeat(201) })));
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing is not found", async () => {
    mockAdminFrom.mockImplementation(
      fromImpl({ data: null, error: { message: "not found" } }, null, null)
    );
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(404);
  });

  it("returns 200 with existing lead_id when duplicate detected", async () => {
    mockAdminFrom.mockImplementation(
      fromImpl(
        { data: LISTING, error: null },
        { data: { id: 77 }, error: null },
        null
      )
    );
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lead_id).toBe(77);
    expect(json.success).toBe(true);
  });

  it("returns 500 when lead insert fails", async () => {
    mockAdminFrom.mockImplementation(
      fromImpl(
        { data: LISTING, error: null },
        { data: null, error: null },
        { data: null, error: { message: "insert fail" } }
      )
    );
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(500);
  });

  it("returns 200 with lead_id on success", async () => {
    const res = await POST(makePost(validBody()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(55);
  });

  it("sends developer notification email when RESEND_API_KEY set", async () => {
    await POST(makePost(validBody()));
    expect(fetchMock).toHaveBeenCalled();
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("resend.com");
  });

  it("skips email when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    await POST(makePost(validBody()));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deducts from developer credit_balance_cents when balance sufficient", async () => {
    const updateChain = { update: vi.fn(), eq: vi.fn(), gte: vi.fn().mockResolvedValue({ error: null }) };
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "property_listings") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.single = vi.fn().mockResolvedValue({ data: LISTING, error: null });
        return c;
      }
      if (table === "property_developers") return updateChain;
      if (table === "property_leads") {
        const c: Record<string, unknown> = {};
        c.insert = vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) })),
        }));
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gte = vi.fn(() => c);
        c.limit = vi.fn(() => c);
        c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.then = vi.fn((cb: (v: unknown) => void) => { cb({ error: null }); return Promise.resolve(); });
      return c;
    });

    await POST(makePost(validBody()));
    // billing update should be called on property_developers
    expect(updateChain.update).toHaveBeenCalled();
  });
});
