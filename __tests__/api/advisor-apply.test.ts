import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockServerFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendApplicationConfirmation: vi.fn().mockResolvedValue(true),
  sendAdminNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import after mocks
import { POST } from "@/app/api/advisor-apply/route";
import { isRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplicationConfirmation } from "@/lib/advisor-emails";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_BODY = {
  name: "Emma Wilson",
  email: "emma@example.com",
  type: "financial-planner",
  phone: "0412345678",
  firm_name: "Wilson Financial",
  location_state: "NSW",
};

const VALID_INVITE = {
  id: 10,
  firm_id: 99,
  role: "advisor",
  email: "emma@example.com",
  status: "pending",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

// ── Mock setup helpers ────────────────────────────────────────────────────────

interface ServerMockOpts {
  inviteLookup?: { data: Record<string, unknown> | null; error: object | null };
  existingPro?: boolean;
  pendingApp?: boolean;
  insertError?: { message: string } | null;
}

function setupServerFromMock(opts: ServerMockOpts = {}) {
  const {
    inviteLookup = null,
    existingPro = false,
    pendingApp = false,
    insertError = null,
  } = opts;

  const callCounts: Record<string, number> = {};

  mockServerFrom.mockImplementation((table: string) => {
    callCounts[table] = (callCounts[table] || 0) + 1;
    const callNum = callCounts[table];
    const b = createChainableBuilder(table);

    if (table === "advisor_firm_invitations") {
      if (callNum === 1) {
        // SELECT: .select().eq("token", ...).single()
        b.single = vi.fn(() =>
          Promise.resolve(inviteLookup ?? { data: null, error: null })
        );
      }
      // UPDATE (callNum === 2): default .then() in builder already resolves success
    }

    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: existingPro ? { id: "pro-123" } : null,
          error: null,
        })
      );
    }

    if (table === "advisor_applications") {
      if (callNum === 1) {
        // SELECT pending-app check: .select().eq(...).eq(...).single()
        b.single = vi.fn(() =>
          Promise.resolve({
            data: pendingApp ? { id: "app-pending" } : null,
            error: null,
          })
        );
      } else {
        // INSERT: awaited directly via .then()
        b.then = vi.fn(
          (cb: (v: { data: null; error: { message: string } | null }) => void) => {
            cb({ data: null, error: insertError });
            return Promise.resolve();
          }
        );
      }
    }

    return b;
  });
}

function applyRequest(body: Record<string, unknown>, ip = "10.0.0.1") {
  return makeRequest("/api/advisor-apply", body, { ip });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    // Default admin mock: agreement insert succeeds
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table);
      b.then = vi.fn((cb: (v: { data: null; error: null }) => void) => {
        cb({ data: null, error: null });
        return Promise.resolve();
      });
      return b;
    });
  });

  // ── Rate limit ────────────────────────────────────────────────────────────

  it("returns 429 when IP is rate-limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many/i);
  });

  // ── Invalid JSON ──────────────────────────────────────────────────────────

  it("returns 500 for invalid JSON body", async () => {
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/advisor-apply", {
      method: "POST",
      body: "{bad-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // ── Required-field validation ─────────────────────────────────────────────

  it("returns 400 when name is missing", async () => {
    const res = await POST(applyRequest({ ...VALID_BODY, name: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(applyRequest({ ...VALID_BODY, email: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("returns 400 when advisor type is missing", async () => {
    const res = await POST(applyRequest({ ...VALID_BODY, type: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  // ── Invite token validation ───────────────────────────────────────────────

  it("returns 400 when invite token is not found in DB", async () => {
    setupServerFromMock({ inviteLookup: { data: null, error: null } });
    const res = await POST(applyRequest({ ...VALID_BODY, invite_token: "bad-token" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invitation/i);
  });

  it("returns 400 when invite token is expired", async () => {
    setupServerFromMock({
      inviteLookup: {
        data: {
          ...VALID_INVITE,
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        },
        error: null,
      },
    });
    const res = await POST(applyRequest({ ...VALID_BODY, invite_token: "expired-token" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invitation/i);
  });

  it("returns 400 when invite email does not match request email", async () => {
    setupServerFromMock({
      inviteLookup: {
        data: { ...VALID_INVITE, email: "other@example.com" },
        error: null,
      },
    });
    const res = await POST(applyRequest({ ...VALID_BODY, invite_token: "valid-token" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/different email/i);
  });

  // ── Duplicate-check gates ─────────────────────────────────────────────────

  it("returns 409 when email is already registered as a professional", async () => {
    setupServerFromMock({ existingPro: true });
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already registered/i);
  });

  it("returns 409 when a pending application already exists for the email", async () => {
    setupServerFromMock({ pendingApp: true });
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/pending application/i);
  });

  // ── DB insert error ───────────────────────────────────────────────────────

  it("returns 500 when the advisor_applications insert fails", async () => {
    setupServerFromMock({ insertError: { message: "unique constraint" } });
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to submit/i);
  });

  // ── Success path — no invite ──────────────────────────────────────────────

  it("returns 200 and inserts application on valid request without invite", async () => {
    setupServerFromMock();
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // Professionals + advisor_applications (select + insert) = 3 calls; no invite table
    const inviteTableCalls = mockServerFrom.mock.calls.filter(
      (c: unknown[]) => c[0] === "advisor_firm_invitations"
    );
    expect(inviteTableCalls).toHaveLength(0);
  });

  it("records agreement acceptance via admin client on success", async () => {
    setupServerFromMock();
    await POST(applyRequest(VALID_BODY));
    const agreementCalls = mockAdminFrom.mock.calls.filter(
      (c: unknown[]) => c[0] === "agreement_acceptances"
    );
    expect(agreementCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── Success path — with invite token ─────────────────────────────────────

  it("returns 200 and marks invitation accepted when valid invite token is used", async () => {
    setupServerFromMock({
      inviteLookup: { data: VALID_INVITE, error: null },
    });
    const res = await POST(
      applyRequest({ ...VALID_BODY, invite_token: "valid-token" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    // advisor_firm_invitations: called twice — once SELECT, once UPDATE
    const inviteCalls = mockServerFrom.mock.calls.filter(
      (c: unknown[]) => c[0] === "advisor_firm_invitations"
    );
    expect(inviteCalls).toHaveLength(2);
  });

  // ── Non-blocking side-effects ─────────────────────────────────────────────

  it("returns 200 even when confirmation email rejects (fire-and-forget)", async () => {
    setupServerFromMock();
    (sendApplicationConfirmation as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("SMTP error")
    );
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(200);
  });

  it("returns 200 even when agreement acceptance throws (try/catch swallows)", async () => {
    setupServerFromMock();
    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error("admin client unavailable");
    });
    const res = await POST(applyRequest(VALID_BODY));
    expect(res.status).toBe(200);
  });
});
