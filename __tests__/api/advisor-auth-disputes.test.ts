import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockAutoResolve = vi.fn();
const mockNotifyAdmin = vi.fn(() => Promise.resolve());
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/advisor-lead-dispute-resolver", () => ({
  autoResolveDispute: (...args: unknown[]) => mockAutoResolve(...args),
  notifyAdminEscalated: (...args: unknown[]) => mockNotifyAdmin(...args),
}));

import { POST, GET } from "@/app/api/advisor-auth/disputes/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/disputes", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/disputes", {
    method: "GET",
  });
}

function authedAdvisor(advisorId = 42) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1", email: "advisor@test.com" } },
  });
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: advisorId }, error: null }),
      );
    }
    return b;
  });
}

function withLead(opts: {
  found?: boolean;
  ageMs?: number;
  billed?: boolean;
  professionalId?: number;
} = {}) {
  const {
    found = true,
    ageMs = 5 * 86400 * 1000,
    billed = true,
    professionalId = 42,
  } = opts;
  const created = new Date(Date.now() - ageMs).toISOString();
  return { found, created, billed, professionalId };
}

function setupServerFromForPost(opts: {
  lead: ReturnType<typeof withLead>;
  existingDispute?: boolean;
  insertedDisputeId?: number;
  insertError?: boolean;
}) {
  // Shared counters across all builders for the same table — each call to
  // `from(table)` creates a fresh builder, but we want the counter to span
  // them so the route's two distinct `.from('lead_disputes')` calls (lookup +
  // insert) get different rows back.
  let leadCallCount = 0;
  let disputeCallCount = 0;

  mockServerFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professional_leads") {
      b.single = vi.fn(() => {
        leadCallCount++;
        // First call: lead lookup. Subsequent calls: lead user_name (escalate path)
        if (leadCallCount === 1) {
          return Promise.resolve({
            data: opts.lead.found
              ? {
                  id: 5,
                  professional_id: opts.lead.professionalId,
                  created_at: opts.lead.created,
                  billed: opts.lead.billed,
                }
              : null,
            error: null,
          });
        }
        return Promise.resolve({
          data: { user_name: "Lead User" },
          error: null,
        });
      });
    }
    if (table === "lead_disputes") {
      b.single = vi.fn(() => {
        disputeCallCount++;
        if (disputeCallCount === 1) {
          // existingDispute lookup
          return Promise.resolve({
            data: opts.existingDispute ? { id: 100 } : null,
            error: null,
          });
        }
        // insert select
        return Promise.resolve({
          data: opts.insertError
            ? null
            : { id: opts.insertedDisputeId || 200 },
          error: opts.insertError ? { message: "insert failed" } : null,
        });
      });
    }
    if (table === "advisor_billing") {
      b.single = vi.fn(() =>
        Promise.resolve({ data: { id: 50 }, error: null }),
      );
    }
    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: { name: "Advisor" },
          error: null,
        }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockAutoResolve.mockResolvedValue({
      verdict: "refund",
      refundedCents: 4900,
      reasons: [],
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await POST(makePost({ leadId: 1, reason: "spam" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ leadId: 1, reason: "spam" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when leadId is missing", async () => {
    authedAdvisor();
    const res = await POST(makePost({ reason: "spam" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when reason is missing", async () => {
    authedAdvisor();
    const res = await POST(makePost({ leadId: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid reason_code", async () => {
    authedAdvisor();
    const res = await POST(
      makePost({ leadId: 1, reason: "spam", reason_code: "bogus" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid reason_code/);
  });

  it("returns 404 when lead not owned by advisor", async () => {
    authedAdvisor();
    setupServerFromForPost({ lead: withLead({ found: false }) });
    const res = await POST(makePost({ leadId: 99, reason: "spam" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when lead is older than 14 days", async () => {
    authedAdvisor();
    setupServerFromForPost({
      lead: withLead({ ageMs: 20 * 86400 * 1000 }),
    });
    const res = await POST(makePost({ leadId: 5, reason: "spam" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Dispute window has closed/);
  });

  it("returns 400 when lead was not billed", async () => {
    authedAdvisor();
    setupServerFromForPost({ lead: withLead({ billed: false }) });
    const res = await POST(makePost({ leadId: 5, reason: "spam" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not billed/);
  });

  it("returns 409 when an existing dispute already exists", async () => {
    authedAdvisor();
    setupServerFromForPost({
      lead: withLead(),
      existingDispute: true,
    });
    const res = await POST(makePost({ leadId: 5, reason: "spam" }));
    expect(res.status).toBe(409);
  });

  it("returns 500 when dispute insert fails", async () => {
    authedAdvisor();
    setupServerFromForPost({
      lead: withLead(),
      insertError: true,
    });
    const res = await POST(makePost({ leadId: 5, reason: "spam" }));
    expect(res.status).toBe(500);
  });

  it("creates dispute and returns auto_resolved=true on refund verdict", async () => {
    authedAdvisor();
    setupServerFromForPost({
      lead: withLead(),
      insertedDisputeId: 777,
    });
    mockAutoResolve.mockResolvedValueOnce({
      verdict: "refund",
      refundedCents: 4900,
      reasons: [],
    });

    const res = await POST(
      makePost({
        leadId: 5,
        reason: "spam",
        reason_code: "spam_or_fake",
        details: "obvious bot",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.dispute_id).toBe(777);
    expect(json.auto_resolved).toBe(true);
    expect(json.verdict).toBe("refund");
    expect(json.refunded_cents).toBe(4900);

    expect(mockAutoResolve).toHaveBeenCalledWith(777);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it("notifies admin and returns auto_resolved=false on escalate verdict", async () => {
    authedAdvisor();
    setupServerFromForPost({
      lead: withLead(),
      insertedDisputeId: 888,
    });
    mockAutoResolve.mockResolvedValueOnce({
      verdict: "escalate",
      refundedCents: 0,
      reasons: ["uncertain"],
    });

    const res = await POST(
      makePost({ leadId: 5, reason: "weird situation" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.auto_resolved).toBe(false);
    expect(json.verdict).toBe("escalate");
    expect(mockNotifyAdmin).toHaveBeenCalled();
  });
});

describe("GET /api/advisor-auth/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns disputes array for the advisor", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "lead_disputes") {
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [
              { id: 1, reason: "spam", status: "refunded" },
              { id: 2, reason: "duplicate", status: "pending" },
            ],
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.disputes).toHaveLength(2);
  });

  it("returns empty array when no disputes exist", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "lead_disputes") {
        b.order = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.disputes).toEqual([]);
  });
});
