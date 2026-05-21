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

const mockSubmitAnswers = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => [{ id: 1 }]);

vi.mock("@/lib/pro-intake", () => ({
  submitAnswers: (...args: unknown[]) => mockSubmitAnswers(...args),
  IntakeError: class IntakeError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/api-schemas", () => ({
  SubmitIntakeAnswersRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "email" in v && "answers" in v) {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "email and answers required" }] } };
    },
  },
}));

import { POST } from "@/app/api/briefs/[slug]/intake-answers/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/intake-answers", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = {
  id: 1,
  slug: "x",
  contact_email: "consumer@test.com",
};

describe("/api/briefs/[slug]/intake-answers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockSubmitAnswers.mockResolvedValue([{ id: 1 }]);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ email: "a@b.com", answers: [] }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when no body", async () => {
    const req = new Request("http://localhost/api/briefs/x/intake-answers", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing fields", async () => {
    const res = await POST(makeReq({ something: "else" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ email: "consumer@test.com", answers: [] }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when email does not match brief owner", async () => {
    const res = await POST(makeReq({ email: "wrong@test.com", answers: [] }), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 200 when email matches", async () => {
    const res = await POST(makeReq({ email: "consumer@test.com", answers: [] }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.answers).toBeDefined();
  });
});
