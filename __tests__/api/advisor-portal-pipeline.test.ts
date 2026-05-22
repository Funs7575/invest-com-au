import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────

const ADVISOR_ID = 42;
const LEAD_ID = 7;

function makeReq(body: unknown, cookie = "session=abc"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/pipeline", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function makeSessionResponse(advisor: { id: number } | null, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve({ advisor }),
  } as Response);
}

function makeUpdateChain(error: unknown = null) {
  const finalEq = vi.fn().mockResolvedValue({ error });
  const firstEq = vi.fn(() => ({ eq: finalEq }));
  mockUpdate.mockReturnValue({ eq: firstEq });
  return { mockUpdate, firstEq, finalEq };
}

import { PATCH } from "@/app/api/advisor-portal/pipeline/route";

// ─── Tests ────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-portal/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => makeSessionResponse({ id: ADVISOR_ID })),
    );
    makeUpdateChain(null);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "contacted" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when session fetch is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => makeSessionResponse(null, false)),
    );
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "contacted" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when advisor is null in session response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => makeSessionResponse(null, true)),
    );
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "contacted" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/advisor-portal/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4", cookie: "s=x" },
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when pipeline_stage is not a valid enum value", async () => {
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "unknown_stage" }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid request/i);
  });

  it("returns 400 when neither pipeline_stage nor next_action_at are provided", async () => {
    const res = await PATCH(makeReq({ lead_id: LEAD_ID }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/nothing to update/i);
  });

  it("returns 400 when lead_id is missing", async () => {
    const res = await PATCH(makeReq({ pipeline_stage: "contacted" }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid request/i);
  });

  it("returns 500 on DB update error", async () => {
    makeUpdateChain({ message: "constraint violation" });
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "proposal_sent" }));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/update failed/i);
  });

  it("returns 200 when updating pipeline_stage only", async () => {
    const { firstEq, finalEq } = makeUpdateChain(null);
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: "won" }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pipeline_stage: "won" }),
    );
    expect(firstEq).toHaveBeenCalledWith("id", LEAD_ID);
    expect(finalEq).toHaveBeenCalledWith("professional_id", ADVISOR_ID);
  });

  it("returns 200 when updating next_action_at only", async () => {
    makeUpdateChain(null);
    const timestamp = "2026-06-01T10:00:00+10:00";
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, next_action_at: timestamp }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ next_action_at: timestamp }),
    );
  });

  it("returns 200 when clearing next_action_at with null", async () => {
    makeUpdateChain(null);
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, next_action_at: null }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ next_action_at: null }),
    );
  });

  it("returns 200 when updating both pipeline_stage and next_action_at", async () => {
    makeUpdateChain(null);
    const timestamp = "2026-06-15T09:00:00Z";
    const res = await PATCH(
      makeReq({ lead_id: LEAD_ID, pipeline_stage: "negotiating", next_action_at: timestamp }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pipeline_stage: "negotiating", next_action_at: timestamp }),
    );
  });

  it("rejects next_action_at that is not a valid datetime string", async () => {
    const res = await PATCH(makeReq({ lead_id: LEAD_ID, next_action_at: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("accepts all valid pipeline_stage enum values", async () => {
    const stages = ["new", "contacted", "proposal_sent", "negotiating", "won", "lost"] as const;
    for (const stage of stages) {
      makeUpdateChain(null);
      const res = await PATCH(makeReq({ lead_id: LEAD_ID, pipeline_stage: stage }));
      expect(res.status).toBe(200);
    }
  });
});
