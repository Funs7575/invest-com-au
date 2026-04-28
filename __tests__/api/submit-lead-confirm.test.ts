import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockAdminFrom = vi.fn();
const mockSendNewLeadNotification = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendNewLeadNotification: (...args: unknown[]) => mockSendNewLeadNotification(...args),
}));

import { POST } from "@/app/api/submit-lead/confirm/route";

// ── Types + Helpers ───────────────────────────────────────────────────────────

interface LeadRow {
  id: number;
  professional_id: number | null;
  user_name: string | null;
  user_phone: string | null;
  user_location_state: string | null;
  user_intent: { need?: string; context?: string[] } | null;
  advisor_notified_at: string | null;
}

interface AdvisorRow {
  id: number;
  name: string;
  email: string | null;
  type: string;
  firm_name: string;
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/submit-lead/confirm", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function setupAdminMocks(opts: {
  lead?: LeadRow | null;
  advisor?: AdvisorRow | null;
}) {
  const leadsBuilder = createChainableBuilder("leads", {});
  leadsBuilder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: opts.lead ?? null, error: null }),
  );

  const profBuilder = createChainableBuilder("professionals", {});
  profBuilder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: opts.advisor ?? null, error: null }),
  );

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "leads") return leadsBuilder;
    if (table === "professionals") return profBuilder;
    return createChainableBuilder(table, {});
  });

  return { leadsBuilder, profBuilder };
}

const sampleLead: LeadRow = {
  id: 42,
  professional_id: 7,
  user_name: "Jane Smith",
  user_phone: "0400123456",
  user_location_state: "NSW",
  user_intent: { need: "retirement", context: ["over-60", "spouse"] },
  advisor_notified_at: null,
};

const sampleAdvisor: AdvisorRow = {
  id: 7,
  name: "Bob Advisor",
  email: "bob@advisorfirm.com.au",
  type: "financial-planner",
  firm_name: "Advisor Firm Pty Ltd",
};

describe("POST /api/submit-lead/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockSendNewLeadNotification.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ lead_id: 1, user_email: "u@test.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    setupAdminMocks({});
    const res = await POST(makePost("{{bad-json"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lead_id is missing", async () => {
    setupAdminMocks({});
    const res = await POST(makePost({ user_email: "u@test.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/lead_id/i);
  });

  it("returns 400 when user_email is missing", async () => {
    setupAdminMocks({});
    const res = await POST(makePost({ lead_id: 42 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/user_email/i);
  });

  it("returns 404 when lead not found", async () => {
    setupAdminMocks({ lead: null });
    const res = await POST(makePost({ lead_id: 99, user_email: "u@test.com" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 already_notified=true when lead already notified (idempotent)", async () => {
    setupAdminMocks({
      lead: { ...sampleLead, advisor_notified_at: "2026-04-27T10:00:00Z" },
      advisor: sampleAdvisor,
    });
    const res = await POST(makePost({ lead_id: 42, user_email: "user@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.already_notified).toBe(true);
    expect(mockSendNewLeadNotification).not.toHaveBeenCalled();
  });

  it("returns 400 when lead has no professional_id", async () => {
    setupAdminMocks({ lead: { ...sampleLead, professional_id: null } });
    const res = await POST(makePost({ lead_id: 42, user_email: "user@example.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no advisor/i);
  });

  it("returns 404 when advisor not found", async () => {
    setupAdminMocks({ lead: sampleLead, advisor: null });
    const res = await POST(makePost({ lead_id: 42, user_email: "user@example.com" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when advisor has no email", async () => {
    setupAdminMocks({ lead: sampleLead, advisor: { ...sampleAdvisor, email: null } });
    const res = await POST(makePost({ lead_id: 42, user_email: "user@example.com" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 success and calls sendNewLeadNotification on happy path", async () => {
    setupAdminMocks({ lead: sampleLead, advisor: sampleAdvisor });
    const res = await POST(
      makePost({ lead_id: 42, user_email: "User@Example.com" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSendNewLeadNotification).toHaveBeenCalledOnce();
  });

  it("normalises email to lowercase before lead lookup", async () => {
    const { leadsBuilder } = setupAdminMocks({ lead: sampleLead, advisor: sampleAdvisor });
    await POST(makePost({ lead_id: 42, user_email: "USER@EXAMPLE.COM" }));
    const eqCalls = (leadsBuilder.eq as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
    const emailEqCall = eqCalls.find(([col]) => col === "user_email");
    expect(emailEqCall?.[1]).toBe("user@example.com");
  });

  it("sends notification with lead intent need and context from user_intent", async () => {
    setupAdminMocks({ lead: sampleLead, advisor: sampleAdvisor });
    await POST(makePost({ lead_id: 42, user_email: "user@example.com" }));
    expect(mockSendNewLeadNotification).toHaveBeenCalledWith(
      "bob@advisorfirm.com.au",
      "Bob Advisor",
      "Jane Smith",
      "user@example.com",
      "0400123456",
      "NSW",
      "retirement",
      ["over-60", "spouse"],
    );
  });
});
