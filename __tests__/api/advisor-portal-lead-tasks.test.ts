import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ──────────────────────────────────────────────────────
const { mockRequireAdvisorSession, mockFlag, mockAdminFrom, mockIsAllowed } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...a: unknown[]) => Promise<number | null>>(async () => 77),
  mockFlag: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockAdminFrom: vi.fn<(...a: unknown[]) => unknown>(),
  mockIsAllowed: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...a: unknown[]) => mockRequireAdvisorSession(...a),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockFlag(...a),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: () => "test-ip",
}));

import { POST, PATCH, DELETE } from "@/app/api/advisor-portal/lead-tasks/route";

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) => Promise.resolve(r({ data, error })),
  };
  for (const m of ["select", "insert", "update", "delete", "eq", "in", "is", "not", "lt", "order", "limit", "single", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function req(body: unknown): NextRequest {
  return new NextRequest("https://invest.com.au/api/advisor-portal/lead-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdvisorSession.mockResolvedValue(77);
  mockFlag.mockResolvedValue(true);
  mockIsAllowed.mockResolvedValue(true);
});

describe("POST /api/advisor-portal/lead-tasks — auth + flag gating", () => {
  it("404s when the lead_sequences flag is off (feature absent)", async () => {
    mockFlag.mockResolvedValue(false);
    const res = await POST(req({ lead_ref: 1, title: "Call" }));
    expect(res.status).toBe(404);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("401s when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(req({ lead_ref: 1, title: "Call" }));
    expect(res.status).toBe(401);
  });

  it("429s when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(req({ lead_ref: 1, title: "Call" }));
    expect(res.status).toBe(429);
  });

  it("400s on an invalid body (missing title)", async () => {
    const res = await POST(req({ lead_ref: 1 }));
    expect(res.status).toBe(400);
  });

  it("400s on an over-long title (>200 chars)", async () => {
    const res = await POST(req({ lead_ref: 1, title: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("404s when the lead does not belong to the advisor (ownership gate)", async () => {
    // ownership lookup returns no row
    mockAdminFrom.mockReturnValueOnce(makeBuilder(null));
    const res = await POST(req({ lead_ref: 999, title: "Call" }));
    expect(res.status).toBe(404);
  });

  it("creates a task when the advisor owns the lead", async () => {
    // 1) ownership lookup → row found; 2) insert → returns the new task
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ id: 999 }))
      .mockReturnValueOnce(makeBuilder({ id: 5, lead_ref: 999, title: "Call", due_at: null, done_at: null, created_at: "x" }));
    const res = await POST(req({ lead_ref: 999, title: "Call" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.task.id).toBe(5);
  });
});

describe("PATCH /api/advisor-portal/lead-tasks — toggle done", () => {
  it("scopes the update by professional_id and returns success", async () => {
    const builder = makeBuilder(null, null);
    mockAdminFrom.mockReturnValue(builder);
    const r = new NextRequest("https://invest.com.au/x", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: 5, done: true }),
    });
    const res = await PATCH(r);
    expect(res.status).toBe(200);
    // ownership scope: an eq("professional_id", 77) must be present
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(["professional_id", 77]);
  });

  it("400s on an invalid patch body", async () => {
    const r = new NextRequest("https://invest.com.au/x", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: 5 }),
    });
    expect((await PATCH(r)).status).toBe(400);
  });
});

describe("DELETE /api/advisor-portal/lead-tasks", () => {
  it("scopes the delete by professional_id", async () => {
    const builder = makeBuilder(null, null);
    mockAdminFrom.mockReturnValue(builder);
    const r = new NextRequest("https://invest.com.au/x", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: 5 }),
    });
    const res = await DELETE(r);
    expect(res.status).toBe(200);
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls).toContainEqual(["professional_id", 77]);
  });
});
