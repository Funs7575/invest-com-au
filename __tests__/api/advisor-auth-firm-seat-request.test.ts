import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockSendAdminNotification = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendAdminNotification: (...args: unknown[]) =>
    mockSendAdminNotification(...args),
}));

import { POST } from "@/app/api/advisor-auth/firm/seat-request/route";

function makePost(body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest(
    "http://localhost/api/advisor-auth/firm/seat-request",
    {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
    },
  );
}

function buildAuthBuilder(
  table: string,
  opts: {
    expired?: boolean;
    advisor?: Record<string, unknown> | null;
    firm?: Record<string, unknown> | null;
  },
  b: ReturnType<typeof createChainableBuilder>,
) {
  const expiresAt = opts.expired
    ? new Date(Date.now() - 86400 * 1000).toISOString()
    : new Date(Date.now() + 86400 * 1000).toISOString();
  if (table === "advisor_sessions") {
    b.single = vi.fn(() =>
      Promise.resolve({
        data: { professional_id: 42, expires_at: expiresAt },
        error: null,
      }),
    );
  }
  if (table === "professionals") {
    b.single = vi.fn(() =>
      Promise.resolve({
        data:
          opts.advisor === undefined
            ? {
                id: 42,
                name: "Admin",
                email: "admin@firm.test",
                firm_id: 7,
                is_firm_admin: true,
              }
            : opts.advisor,
        error: null,
      }),
    );
  }
  if (table === "advisor_firms") {
    b.single = vi.fn(() =>
      Promise.resolve({
        data:
          opts.firm === undefined
            ? { name: "Test Firm", max_seats: 5 }
            : opts.firm,
        error: null,
      }),
    );
  }
}

// Post-refactor, requireAdvisorSession reads advisor_sessions through the
// admin client; the route also reads professionals + advisor_firms via admin.
// Wire all three onto mockAdminFrom. Tests that override mockAdminFrom for
// other tables (e.g. firm_seat_requests) should re-apply this via
// `buildAuthBuilder` to keep the auth flow working.
function withSession(opts: {
  expired?: boolean;
  advisor?: Record<string, unknown> | null;
  firm?: Record<string, unknown> | null;
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    buildAuthBuilder(table, opts, b);
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/firm/seat-request", () => {
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

  it("returns 401 when no cookie", async () => {
    const res = await POST(makePost({ requestedSeats: 10 }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    withSession({ expired: true });
    const res = await POST(makePost({ requestedSeats: 10 }, "valid"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a firm admin", async () => {
    withSession({
      advisor: {
        id: 42,
        name: "Member",
        email: "m@firm.test",
        firm_id: 7,
        is_firm_admin: false,
      },
    });
    const res = await POST(makePost({ requestedSeats: 10 }, "valid"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when firm not found", async () => {
    withSession({ firm: null });
    const res = await POST(makePost({ requestedSeats: 10 }, "valid"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when requestedSeats is at-or-below current", async () => {
    withSession();
    const res = await POST(
      makePost({ requestedSeats: 5 }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when requestedSeats > 200", async () => {
    withSession();
    const res = await POST(
      makePost({ requestedSeats: 250 }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when a pending request already exists", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      buildAuthBuilder(table, {}, b);
      if (table === "firm_seat_requests") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { id: 99 }, error: null }),
        );
      }
      return b;
    });
    const res = await POST(makePost({ requestedSeats: 10 }, "valid"));
    expect(res.status).toBe(409);
  });

  it("creates seat request and notifies admin on success", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      buildAuthBuilder(table, {}, b);
      if (table === "firm_seat_requests") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });

    const res = await POST(
      makePost(
        { requestedSeats: 12, reason: "Hiring two new advisors" },
        "valid",
      ),
    );
    expect(res.status).toBe(200);

    const seatCalls = supabaseCalls.firm_seat_requests || [];
    const insertCall = seatCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect(insertArgs.firm_id).toBe(7);
    expect(insertArgs.requested_seats).toBe(12);
    expect(insertArgs.current_seats).toBe(5);
    expect(insertArgs.reason).toBe("Hiring two new advisors");

    expect(mockSendAdminNotification).toHaveBeenCalled();
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("DB exploded");
    });
    const res = await POST(makePost({ requestedSeats: 10 }, "valid"));
    expect(res.status).toBe(500);
  });
});
