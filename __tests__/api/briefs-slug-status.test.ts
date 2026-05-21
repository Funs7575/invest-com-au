import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(async () => 42 as number | null),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

const mockUpdateTrackerStatus = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true }));

vi.mock("@/lib/briefs/credits", () => ({
  updateTrackerStatus: (...args: unknown[]) => mockUpdateTrackerStatus(...args),
}));

vi.mock("@/lib/api-schemas", () => ({
  BriefStatusUpdateRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "tracker_status" in v) {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "tracker_status required" }] } };
    },
  },
}));

import { POST } from "@/app/api/briefs/[slug]/status/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/status", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = { id: 1, accepted_by_professional_id: 42 };

describe("/api/briefs/[slug]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockUpdateTrackerStatus.mockResolvedValue({ ok: true });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ tracker_status: "in_progress" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq({ tracker_status: "in_progress" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 when body invalid JSON", async () => {
    const req = new Request("http://localhost/api/briefs/x/status", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when tracker_status missing", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ tracker_status: "in_progress" }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq({ tracker_status: "in_progress" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 403 when update not allowed", async () => {
    mockUpdateTrackerStatus.mockResolvedValue({ ok: false, reason: "not_the_accepted_pro" });
    const res = await POST(makeReq({ tracker_status: "in_progress" }), makeCtx());
    expect(res.status).toBe(403);
  });
});
