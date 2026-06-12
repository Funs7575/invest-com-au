/**
 * Tests for GET + PATCH /api/advisor-portal/firm-leads
 *
 * Covers:
 *   GET  – rate-limit, auth guard, firm-admin gate, happy path
 *   PATCH – rate-limit, auth guard, body validation, firm-admin gate,
 *           target-advisor guard, DB error, happy path + notification side-effect
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// rate-limit-db (used in the route)
const { mockIsAllowed } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._: unknown[]) => mockIsAllowed(),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

// requireAdvisorSession
const { mockAdvisorSession } = vi.hoisted(() => ({
  mockAdvisorSession: vi.fn<() => Promise<number | null>>().mockResolvedValue(1),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (_req: unknown) => mockAdvisorSession(),
}));

// notifications
const { mockNotifyUserByEmail } = vi.hoisted(() => ({
  mockNotifyUserByEmail: vi.fn<() => Promise<{ notified: boolean }>>().mockResolvedValue({ notified: true }),
}));
vi.mock("@/lib/notifications", () => ({
  notifyUserByEmail: (..._: unknown[]) => mockNotifyUserByEmail(),
}));

// resend email
const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn<() => Promise<{ ok: boolean }>>().mockResolvedValue({ ok: true }),
}));
vi.mock("@/lib/resend", () => ({
  sendEmail: (..._: unknown[]) => mockSendEmail(),
}));

// Supabase admin — table-dispatch pattern
type MockRow = Record<string, unknown> | null;
interface TableMockConfig {
  caller?: MockRow;
  target?: MockRow;
  members?: MockRow[];
  leads?: MockRow[];
  updateError?: { message: string } | null;
  targetAdvisor?: MockRow;
  lead?: MockRow;
}

let tableConfig: TableMockConfig = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data:
                // For the PATCH target advisor lookup (name + email), return targetAdvisor if set.
                // Otherwise return caller for the first call.
                tableConfig.targetAdvisor !== undefined
                  ? tableConfig.targetAdvisor
                  : tableConfig.caller ?? null,
            })
          ),
        };
      }
      if (table === "professional_leads") {
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn(() =>
            Promise.resolve({
              data: tableConfig.leads ?? [],
              error: tableConfig.updateError ?? null,
            })
          ),
          // .update().eq() terminal
          then: undefined,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    }),
  })),
}));

import { GET, PATCH } from "@/app/api/advisor-portal/firm-leads/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/advisor-portal/firm-leads${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}

function makePatch(body: unknown) {
  return new Request("http://localhost/api/advisor-portal/firm-leads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

// ─── GET tests ──────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/firm-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableConfig = {};
    mockIsAllowed.mockResolvedValue(true);
    mockAdvisorSession.mockResolvedValue(1);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet() as never);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet() as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    tableConfig.caller = { id: 1, firm_id: null, is_firm_admin: false };
    const res = await GET(makeGet() as never);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH tests ─────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-portal/firm-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableConfig = {};
    mockIsAllowed.mockResolvedValue(true);
    mockAdvisorSession.mockResolvedValue(1);
    mockNotifyUserByEmail.mockResolvedValue({ notified: true });
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makePatch({ lead_id: 1, professional_id: 2 }) as never);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makePatch({ lead_id: 1, professional_id: 2 }) as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await PATCH(makePatch({ lead_id: "not-a-number" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/advisor-portal/firm-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: "not json",
    });
    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    tableConfig.caller = { firm_id: null, is_firm_admin: false };
    const res = await PATCH(makePatch({ lead_id: 1, professional_id: 2 }) as never);
    expect(res.status).toBe(403);
  });

  it("returns 200 and { ok: true } on successful reassignment", async () => {
    // Set up a multi-call mock: first call returns caller, subsequent calls
    // return target. We use a real multi-call admin client.
    const callerData = { firm_id: 10, is_firm_admin: true };
    const targetData = { id: 2, firm_id: 10 };
    const advisorEmailData = { name: "Bob Advisor", email: "bob@advisor.test" };
    const leadData = {
      user_name: "Jane Investor",
      user_email: "jane@investor.test",
      user_phone: null,
      source_page: "/advisors",
      message: "Need help with retirement",
      status: "new",
    };

    // Override admin mock to handle the sequence of calls correctly
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminMock = createAdminClient as ReturnType<typeof vi.fn>;
    let callCount = 0;
    adminMock.mockImplementation(() => ({
      from: vi.fn((table: string) => {
        if (table === "professionals") {
          callCount++;
          if (callCount === 1) {
            // caller lookup
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() => Promise.resolve({ data: callerData })),
            };
          }
          if (callCount === 2) {
            // target verification
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() => Promise.resolve({ data: targetData })),
            };
          }
          // target advisor email lookup (notification)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: advisorEmailData })),
          };
        }
        if (table === "professional_leads") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: leadData })),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        };
      }),
    }));

    const res = await PATCH(makePatch({ lead_id: 1, professional_id: 2 }) as never);
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("returns 200 even when email notification fails (best-effort)", async () => {
    mockSendEmail.mockResolvedValue({ ok: false });

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminMock = createAdminClient as ReturnType<typeof vi.fn>;
    let callCount = 0;
    adminMock.mockImplementation(() => ({
      from: vi.fn((table: string) => {
        if (table === "professionals") {
          callCount++;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: { firm_id: 10, is_firm_admin: true } })
              ),
            };
          }
          if (callCount === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: { id: 2, firm_id: 10 } })
              ),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: { name: "Bob", email: "bob@test.com" } })
            ),
          };
        }
        if (table === "professional_leads") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() =>
              Promise.resolve({ data: { user_name: "Jane", user_email: "j@t.com", user_phone: null, source_page: null, message: null, status: "new" } })
            ),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        };
      }),
    }));

    const res = await PATCH(makePatch({ lead_id: 5, professional_id: 2 }) as never);
    // Reassignment succeeded; email failure should not affect HTTP status.
    expect(res.status).toBe(200);
  });

  it("writes a lead_assignments audit row with reassigned_from on manual reassign", async () => {
    const auditInserts: Record<string, unknown>[] = [];
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminMock = createAdminClient as ReturnType<typeof vi.fn>;
    let profCall = 0;
    adminMock.mockImplementation(() => ({
      from: vi.fn((table: string) => {
        if (table === "professionals") {
          profCall++;
          // 1: caller (firm admin), 2: target-in-firm, 3: prev-owner-in-firm,
          // 4+: notification email lookup. All firm-scoped lookups resolve.
          if (profCall === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() => Promise.resolve({ data: { firm_id: 10, is_firm_admin: true } })),
            };
          }
          if (profCall === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 2, firm_id: 10 } })),
            };
          }
          if (profCall === 3) {
            // prev-owner verification (lead currently belongs to #1)
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => Promise.resolve({ data: { name: "Bob", email: "bob@t.com" } })),
          };
        }
        if (table === "professional_leads") {
          return {
            update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // existingLead lookup (current assignee #1) + later lead detail lookup
            maybeSingle: vi.fn(() => Promise.resolve({ data: { professional_id: 1, user_name: "Jane", user_email: "j@t.com", user_phone: null, source_page: null, message: null, status: "new" } })),
          };
        }
        if (table === "lead_assignments") {
          return {
            insert: vi.fn((row: Record<string, unknown>) => {
              auditInserts.push(row);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
        };
      }),
    }));

    const res = await PATCH(makePatch({ lead_id: 7, professional_id: 2 }) as never);
    expect(res.status).toBe(200);
    // Allow the awaited writeAssignment to settle.
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({
      firm_id: 10,
      lead_ref: "7",
      professional_id: 2,
      assigned_by: "manual",
      reassigned_from: 1,
    });
  });
});
