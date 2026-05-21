import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockUpdateTrackerStatus } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockUpdateTrackerStatus: vi.fn(),
  }));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/briefs/credits", () => ({
  updateTrackerStatus: mockUpdateTrackerStatus,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/status/route";

const VALID = { tracker_status: "contacted", note: "called them" };

function makeReq(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/briefs/b1/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ slug: "b1" }) };

function makeBriefChain(result: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle"]) chain[m] = vi.fn(() => chain);
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockRequireAdvisorSession.mockResolvedValue(42);
});

describe("POST /api/briefs/[slug]/status", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(429);
  });

  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(401);
  });

  it("400 on invalid JSON", async () => {
    const res = await POST(makeReq("not-json", true), ctx);
    expect(res.status).toBe(400);
  });

  it("400 on schema rejection", async () => {
    const res = await POST(makeReq({ tracker_status: "bogus" }), ctx);
    expect(res.status).toBe(400);
  });

  it("404 when brief not found", async () => {
    mockFrom.mockReturnValue(makeBriefChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(404);
  });

  it("happy path updates tracker status", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, accepted_by_professional_id: 42 } }),
    );
    mockUpdateTrackerStatus.mockResolvedValue({ ok: true });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpdateTrackerStatus).toHaveBeenCalledWith({
      briefId: 1,
      professionalId: 42,
      newStatus: "contacted",
      note: "called them",
    });
  });

  it("403 when updateTrackerStatus rejects", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, accepted_by_professional_id: 99 } }),
    );
    mockUpdateTrackerStatus.mockResolvedValue({ ok: false, reason: "not yours" });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(403);
  });

  it("500 when query throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("db");
    });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(500);
  });
});
