import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const requireAdvisorSessionMock = vi.fn<() => Promise<number | null>>();
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: () => requireAdvisorSessionMock(),
}));

const runBulkActionMock = vi.fn();
vi.mock("@/lib/squad-bulk-actions", () => ({
  MAX_BULK: 50,
  runBulkAction: (...args: unknown[]) => runBulkActionMock(...args),
}));

// Admin client returns a fresh thenable per .from() call; each terminal
// maybeSingle() pulls the next queued result.
const maybeSingleResults: Array<{ data: unknown }> = [];
function pushResult(data: unknown) {
  maybeSingleResults.push({ data });
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    const fn = () => chain;
    chain.select = fn;
    chain.eq = fn;
    chain.in = fn;
    chain.maybeSingle = () =>
      Promise.resolve(maybeSingleResults.shift() ?? { data: null });
    return { from: () => chain };
  }),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/bulk/route";

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad" }) };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/briefs/bulk", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID = { action: "claim", brief_ids: [1, 2, 3] };

describe("POST /api/teams/[slug]/briefs/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResults.length = 0;
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await POST(postReq(VALID), ctx())).status).toBe(429);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await POST(postReq({ action: "nope", brief_ids: [] }), ctx())).status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(null); // team lookup
    expect((await POST(postReq(VALID), ctx())).status).toBe(404);
  });

  it("returns 403 when caller is not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 }); // team
    pushResult(null); // member
    expect((await POST(postReq(VALID), ctx())).status).toBe(403);
  });

  it("returns 400 when refer is missing to_team_id", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    const res = await POST(postReq({ action: "refer", brief_ids: [1] }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 200 when all briefs succeed", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    runBulkActionMock.mockResolvedValueOnce({
      results: [{ briefId: 1, ok: true }],
      summary: { total: 1, ok: 1, failed: 0 },
    });
    const res = await POST(postReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ summary: { failed: 0 } });
  });

  it("returns 207 on partial success", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    runBulkActionMock.mockResolvedValueOnce({
      results: [],
      summary: { total: 2, ok: 1, failed: 1 },
    });
    expect((await POST(postReq(VALID), ctx())).status).toBe(207);
  });

  it("returns 422 when all briefs fail", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    runBulkActionMock.mockResolvedValueOnce({
      results: [],
      summary: { total: 2, ok: 0, failed: 2 },
    });
    expect((await POST(postReq(VALID), ctx())).status).toBe(422);
  });

  it("returns 500 when runBulkAction throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    runBulkActionMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(postReq(VALID), ctx())).status).toBe(500);
  });
});
