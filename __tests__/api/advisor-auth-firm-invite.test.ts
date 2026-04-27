import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockSendFirmInvitation = vi.fn(() => Promise.resolve());
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendFirmInvitation: (...args: unknown[]) =>
    mockSendFirmInvitation(...args),
}));

import { POST, GET, PATCH } from "@/app/api/advisor-auth/firm/invite/route";

function makeReq(
  method: string,
  body: unknown,
  cookie?: string,
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  const init: RequestInit = { method, headers };
  if (method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/advisor-auth/firm/invite", init);
}

function withFirmAdmin(opts: {
  expired?: boolean;
  advisor?: Record<string, unknown> | null;
  firm?: Record<string, unknown> | null;
  memberCount?: number;
} = {}) {
  const expiresAt = opts.expired
    ? new Date(Date.now() - 86400 * 1000).toISOString()
    : new Date(Date.now() + 86400 * 1000).toISOString();
  let proCallCount = 0;

  mockServerFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "advisor_sessions") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: { professional_id: 42, expires_at: expiresAt },
          error: null,
        }),
      );
    }
    if (table === "professionals") {
      proCallCount++;
      const isFirstCall = proCallCount === 1;
      b.single = vi.fn(() =>
        Promise.resolve({
          data: isFirstCall
            ? opts.advisor === undefined
              ? {
                  id: 42,
                  name: "Admin",
                  firm_id: 7,
                  is_firm_admin: true,
                }
              : opts.advisor
            : null,
          error: null,
        }),
      );
      // The seat-count query awaits eq() directly — return memberCount
      b.eq = vi.fn(() => {
        supabaseCalls[table]?.push({ method: "eq", args: [] });
        return Object.assign(b, {
          then: (cb: (v: unknown) => void) => {
            cb({
              count: opts.memberCount ?? 2,
              data: null,
              error: null,
            });
            return Promise.resolve();
          },
        });
      });
    }
    if (table === "advisor_firms") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data:
            opts.firm === undefined
              ? {
                  id: 7,
                  name: "Test Firm",
                  max_seats: 10,
                  status: "active",
                }
              : opts.firm,
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

describe("POST /api/advisor-auth/firm/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 with no cookie", async () => {
    const res = await POST(
      makeReq("POST", { email: "new@firm.test" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when session expired", async () => {
    withFirmAdmin({ expired: true });
    const res = await POST(
      makeReq("POST", { email: "new@firm.test" }, "valid"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a firm admin", async () => {
    withFirmAdmin({
      advisor: {
        id: 42,
        name: "Member",
        firm_id: 7,
        is_firm_admin: false,
      },
    });
    const res = await POST(
      makeReq("POST", { email: "new@firm.test" }, "valid"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when firm not active", async () => {
    withFirmAdmin({
      firm: { id: 7, name: "Test", max_seats: 10, status: "suspended" },
    });
    const res = await POST(
      makeReq("POST", { email: "new@firm.test" }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when team is at max capacity", async () => {
    withFirmAdmin({ memberCount: 10 });
    const res = await POST(
      makeReq("POST", { email: "new@firm.test" }, "valid"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/max capacity/);
  });

  it("returns 400 when email is missing", async () => {
    withFirmAdmin();
    const res = await POST(makeReq("POST", { email: "" }, "valid"));
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already invited (pending)", async () => {
    withFirmAdmin();
    let proCount = 0;
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: 42,
              expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
            },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        proCount++;
        b.single = vi.fn(() =>
          Promise.resolve({
            data:
              proCount === 1
                ? {
                    id: 42,
                    name: "Admin",
                    firm_id: 7,
                    is_firm_admin: true,
                  }
                : null,
            error: null,
          }),
        );
        b.eq = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "eq", args: [] });
          return Object.assign(b, {
            then: (cb: (v: unknown) => void) => {
              cb({ count: 2, data: null, error: null });
              return Promise.resolve();
            },
          });
        });
      }
      if (table === "advisor_firms") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 7,
              name: "Test Firm",
              max_seats: 10,
              status: "active",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_firm_invitations") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { id: 99 }, error: null }),
        );
      }
      return b;
    });

    const res = await POST(
      makeReq("POST", { email: "dup@firm.test" }, "valid"),
    );
    expect(res.status).toBe(409);
  });

  it("creates invitation on happy path", async () => {
    withFirmAdmin();
    const res = await POST(
      makeReq(
        "POST",
        { email: "New@FIRM.test", name: "New Person" },
        "valid",
      ),
    );
    expect(res.status).toBe(200);

    const inviteCalls = supabaseCalls.advisor_firm_invitations || [];
    const insertCall = inviteCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.email).toBe("new@firm.test"); // lowercased + trimmed
    expect(args.firm_id).toBe(7);
    expect(args.invited_by).toBe(42);
    expect(typeof args.token).toBe("string");
    expect((args.token as string).length).toBe(64);

    expect(mockSendFirmInvitation).toHaveBeenCalled();
  });
});

describe("GET /api/advisor-auth/firm/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 with no cookie", async () => {
    const res = await GET(makeReq("GET", null));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a firm admin", async () => {
    withFirmAdmin({
      advisor: { id: 42, firm_id: 7, is_firm_admin: false },
    });
    const res = await GET(makeReq("GET", null, "valid"));
    expect(res.status).toBe(403);
  });

  it("returns invitations and members on success", async () => {
    withFirmAdmin();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: 42 },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { firm_id: 7, is_firm_admin: true },
            error: null,
          }),
        );
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [{ id: 1, name: "Alice" }],
            error: null,
          }),
        );
      }
      if (table === "advisor_firm_invitations") {
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [{ id: 1, email: "pending@test.com", status: "pending" }],
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeReq("GET", null, "valid"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.invitations).toHaveLength(1);
    expect(json.members).toHaveLength(1);
  });
});

describe("PATCH /api/advisor-auth/firm/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  function withInviteRow(opts: {
    inviteStatus?: string;
    found?: boolean;
  } = {}) {
    let proCount = 0;
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: 42,
              expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
            },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        proCount++;
        b.single = vi.fn(() =>
          Promise.resolve({
            data:
              proCount === 1
                ? {
                    id: 42,
                    name: "Admin",
                    firm_id: 7,
                    is_firm_admin: true,
                  }
                : null,
            error: null,
          }),
        );
      }
      if (table === "advisor_firm_invitations") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data:
              opts.found === false
                ? null
                : {
                    id: 5,
                    email: "person@firm.test",
                    name: "Person",
                    status: opts.inviteStatus || "pending",
                    firm_id: 7,
                  },
            error: null,
          }),
        );
      }
      if (table === "advisor_firms") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { name: "Test Firm", max_seats: 10, status: "active" },
            error: null,
          }),
        );
      }
      return b;
    });
  }

  it("returns 401 with no cookie", async () => {
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "revoke" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    withInviteRow();
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "bogus" }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when invite doesn't belong to firm", async () => {
    withInviteRow({ found: false });
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "revoke" }, "valid"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when revoking a non-pending invite", async () => {
    withInviteRow({ inviteStatus: "accepted" });
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "revoke" }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("revokes a pending invite", async () => {
    withInviteRow();
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "revoke" }, "valid"),
    );
    expect(res.status).toBe(200);
    const inviteCalls = supabaseCalls.advisor_firm_invitations || [];
    const updateCall = inviteCalls.find((c) => c.method === "update");
    const args = updateCall?.args[0] as Record<string, unknown>;
    expect(args.status).toBe("revoked");
  });

  it("resends a pending invite with a fresh token", async () => {
    withInviteRow();
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "resend" }, "valid"),
    );
    expect(res.status).toBe(200);
    expect(mockSendFirmInvitation).toHaveBeenCalled();
    const inviteCalls = supabaseCalls.advisor_firm_invitations || [];
    const updateCall = inviteCalls.find((c) => c.method === "update");
    const args = updateCall?.args[0] as Record<string, unknown>;
    expect(typeof args.token).toBe("string");
    expect((args.token as string).length).toBe(64);
    expect(args.status).toBe("pending");
  });

  it("returns 400 when resending an accepted invite", async () => {
    withInviteRow({ inviteStatus: "accepted" });
    const res = await PATCH(
      makeReq("PATCH", { inviteId: 5, action: "resend" }, "valid"),
    );
    expect(res.status).toBe(400);
  });
});
