import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const mockCheckoutSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/create-contract/route";
import { NextRequest } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────

function createChainableBuilder(resolveData: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "insert", "upsert", "update", "delete", "eq", "neq", "order", "limit", "gte", "lte", "gt", "in"];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve({ data: resolveData, error: null }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: resolveData, error: null }));
  return builder;
}

function makeRequest(body: Record<string, unknown> = {}, sessionCookie?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (sessionCookie !== undefined) {
    headers.set("cookie", `advisor_session=${sessionCookie}`);
  }
  return new NextRequest("http://localhost/api/stripe/create-contract", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_SESSION_TOKEN = "tok_advisor_abc123";
const VALID_ADVISOR_ID = "adv-uuid-789";
const VALID_SESSION_ROW = {
  professional_id: VALID_ADVISOR_ID,
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
};
const CHECKOUT_URL = "https://checkout.stripe.com/pay/cs_test_abc";

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/create-contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no advisor_session cookie is present", async () => {
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required");
  });

  it("returns 401 when session token not found or expired in DB", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(null));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired session");
  });

  it("returns 400 when advisor_id is missing", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    const req = makeRequest({ plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required fields/);
  });

  it("returns 400 when plan is missing", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required fields/);
  });

  it("returns 400 when billing_cycle is missing", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing required fields/);
  });

  it("returns 400 when plan is not a valid value", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "enterprise", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid plan/);
  });

  it("returns 400 when billing_cycle is not a valid value", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "quarterly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid billing_cycle/);
  });

  it("returns 403 when advisor_id does not match session professional_id", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder({ ...VALID_SESSION_ROW, professional_id: "other-advisor-id" }));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns 200 with checkout url on valid monthly request", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "professional", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe(CHECKOUT_URL);
  });

  it("returns 200 with checkout url on valid annual request", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "premium", billing_cycle: "annual" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe(CHECKOUT_URL);
  });

  it("passes monthly unit_amount and interval=month for monthly basic plan", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    await POST(req);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 9900,
              recurring: { interval: "month" },
            }),
          }),
        ],
      })
    );
  });

  it("passes annual unit_amount and interval=year for annual premium plan", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "premium", billing_cycle: "annual" }, VALID_SESSION_TOKEN);
    await POST(req);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 499000,
              recurring: { interval: "year" },
            }),
          }),
        ],
      })
    );
  });

  it("includes advisor_id, plan, and billing_cycle in checkout session metadata", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "professional", billing_cycle: "annual" }, VALID_SESSION_TOKEN);
    await POST(req);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          advisor_id: VALID_ADVISOR_ID,
          plan: "professional",
          billing_cycle: "annual",
        },
      })
    );
  });

  it("uses NEXT_PUBLIC_SITE_URL for success_url and cancel_url", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invest.com.au";
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    await POST(req);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://staging.invest.com.au/for-advisors/pricing?checkout=success",
        cancel_url: "https://staging.invest.com.au/for-advisors/pricing?checkout=cancelled",
      })
    );
  });

  it("queries advisor_sessions using the cookie token value", async () => {
    const builder = createChainableBuilder(VALID_SESSION_ROW);
    mockAdminFrom.mockImplementation(() => builder);
    mockCheckoutSessionsCreate.mockResolvedValue({ url: CHECKOUT_URL });
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    await POST(req);
    expect(mockAdminFrom).toHaveBeenCalledWith("advisor_sessions");
    expect(builder.eq).toHaveBeenCalledWith("session_token", VALID_SESSION_TOKEN);
  });

  it("returns 500 when Stripe checkout.sessions.create throws", async () => {
    mockAdminFrom.mockImplementation(() => createChainableBuilder(VALID_SESSION_ROW));
    mockCheckoutSessionsCreate.mockRejectedValue(new Error("Stripe API unreachable"));
    const req = makeRequest({ advisor_id: VALID_ADVISOR_ID, plan: "basic", billing_cycle: "monthly" }, VALID_SESSION_TOKEN);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to create checkout session");
  });
});
