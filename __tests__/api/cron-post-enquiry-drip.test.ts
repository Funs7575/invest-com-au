import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => '<p class="footer"></p>'),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/cron/post-enquiry-drip/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): Request {
  return new Request("http://localhost/api/cron/post-enquiry-drip");
}

interface ChainResult {
  data: unknown;
  error?: { message: string } | null;
}

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "lt", "gte", "lte", "order", "limit", "update", "in", "not"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

interface Lead {
  id: string;
  user_name: string;
  user_email: string;
  professional_id: string;
  source_page: string | null;
  created_at: string;
  post_drip_step: number;
}

interface Professional {
  id: string;
  name: string;
  slug: string;
  type: string;
  email?: string;
  status?: string;
}

function buildLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date();
  return {
    id: "lead-1",
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    professional_id: "pro-1",
    source_page: null,
    created_at: new Date(now.getTime() - 2 * 86400000).toISOString(), // 2 days ago
    post_drip_step: 0,
    ...overrides,
  };
}

function setupFromMocks(leads: Lead[], pros: Professional[], nudgeLeads: Lead[] = []) {
  let callCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    callCount++;
    if (table === "professional_leads") {
      if (callCount === 1) return makeChain({ data: leads, error: null });
      // nudge leads query or update
      if (nudgeLeads.length > 0 && callCount <= leads.length + 2) {
        return makeChain({ data: nudgeLeads, error: null });
      }
      return makeChain({ data: null, error: null });
    }
    if (table === "professionals") {
      return makeChain({ data: pros, error: null });
    }
    return makeChain({ data: null, error: null });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/post-enquiry-drip", () => {
  const origResendKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    process.env.RESEND_API_KEY = "re_test_key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = origResendKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    setupFromMocks([], []);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("RESEND_API_KEY");
  });

  it("returns sent:0 checked:0 when no leads", async () => {
    setupFromMocks([], []);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; checked: number; advisor_nudges_sent: number };
    expect(body.sent).toBe(0);
    expect(body.checked).toBe(0);
    expect(body.advisor_nudges_sent).toBe(0);
  });

  it("does not send step 0 when fewer than 1 day has passed", async () => {
    const freshLead = buildLead({
      created_at: new Date().toISOString(), // 0 days
      post_drip_step: 0,
    });
    setupFromMocks([freshLead], [{ id: "pro-1", name: "Bob Jones", slug: "bob-jones", type: "financial_planner" }]);
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends step 0 confirmation email when day ≥ 1", async () => {
    const lead = buildLead({ post_drip_step: 0 }); // created 2 days ago
    setupFromMocks(
      [lead],
      [{ id: "pro-1", name: "Bob Jones", slug: "bob-jones", type: "financial_planner" }],
    );
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const reqBody = JSON.parse(callArgs[1].body as string) as { to: string; subject: string; html: string };
    expect(reqBody.to).toBe("alice@example.com");
    expect(reqBody.subject).toContain("enquiry");
    expect(reqBody.html).toContain("Enquiry Has Been Sent");
  });

  it("includes cross-sell section in step 0 for advisor types with cross-sells", async () => {
    const lead = buildLead({ post_drip_step: 0 });
    setupFromMocks(
      [lead],
      [{ id: "pro-1", name: "Bob Jones", slug: "bob-jones", type: "mortgage_broker" }],
    );
    await GET(makeReq());
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const reqBody = JSON.parse(callArgs[1].body as string) as { html: string };
    expect(reqBody.html).toContain("Other professionals you might need");
  });

  it("sends step 1 review email when day ≥ 7", async () => {
    const now = new Date();
    const lead = buildLead({
      created_at: new Date(now.getTime() - 8 * 86400000).toISOString(),
      post_drip_step: 1,
    });
    setupFromMocks(
      [lead],
      [{ id: "pro-1", name: "Jane Doe", slug: "jane-doe", type: "tax_agent" }],
    );
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const reqBody = JSON.parse(callArgs[1].body as string) as { subject: string };
    expect(reqBody.subject).toContain("Jane Doe");
  });

  it("auto-advances step 2 to step 3 when advisor type has no cross-sells", async () => {
    const now = new Date();
    const lead = buildLead({
      created_at: new Date(now.getTime() - 15 * 86400000).toISOString(),
      post_drip_step: 2,
    });
    // Use an advisor type not in CROSS_SELL_MAP (or one with empty cross-sells)
    setupFromMocks(
      [lead],
      [{ id: "pro-1", name: "Unknown", slug: "unknown", type: "unknown_type" }],
    );
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    // No email sent — auto-advance path
    expect(body.sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends step 3 fee-update email when day ≥ 30", async () => {
    const now = new Date();
    const lead = buildLead({
      created_at: new Date(now.getTime() - 31 * 86400000).toISOString(),
      post_drip_step: 3,
    });
    setupFromMocks(
      [lead],
      [{ id: "pro-1", name: "Carol White", slug: "carol-white", type: "financial_planner" }],
    );
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const reqBody = JSON.parse(callArgs[1].body as string) as { subject: string };
    expect(reqBody.subject).toContain("fees");
  });

  it("sends advisor nudge for leads 3-10 days old, not yet nudged", async () => {
    const now = new Date();
    const nudgeLead = {
      id: "lead-2",
      user_name: "Dan",
      professional_id: "pro-2",
      created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
      post_drip_step: 0,
    };
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "professional_leads") {
        if (callCount === 1) return makeChain({ data: [], error: null }); // main leads
        if (callCount === 2) return makeChain({ data: [nudgeLead], error: null }); // nudge leads
        return makeChain({ data: null, error: null }); // update
      }
      if (table === "professionals") {
        return makeChain({ data: [{ id: "pro-2", name: "Emma Advisor", slug: "emma", type: "tax_agent", email: "emma@example.com" }], error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await GET(makeReq());
    const body = await res.json() as { advisor_nudges_sent: number };
    expect(body.advisor_nudges_sent).toBe(1);
    // Two fetch calls — 0 for main leads (none), 1 for nudge
    expect(fetch).toHaveBeenCalledTimes(1);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const reqBody = JSON.parse(callArgs[1].body as string) as { to: string; subject: string };
    expect(reqBody.to).toBe("emma@example.com");
    expect(reqBody.subject).toContain("Dan");
  });
});
