import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/briefs/routing", () => ({
  resolveEligibleProviders: vi.fn(async () => []),
}));
vi.mock("@/lib/marketplace-emails", () => ({
  sendProviderNewMatchRequest: vi.fn(async () => {}),
}));
vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => {}),
}));
vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));
vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotificationByEmail: vi.fn(async () => {}),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/briefs/[id]/risk/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/briefs/123/risk", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("/api/admin/briefs/[id]/risk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
  });

  it("POST denies non-admin (401)", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ action: "approve" }), makeCtx("123"));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid brief id", async () => {
    const res = await POST(makeReq({ action: "approve" }), makeCtx("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid body", async () => {
    const res = await POST(makeReq({ action: "invalid_action" }), makeCtx("123"));
    expect(res.status).toBe(400);
  });

  it("POST approve succeeds", async () => {
    const briefRow = {
      id: 123,
      slug: "test-brief",
      job_title: "Test Brief",
      contact_email: "user@test.com",
      risk_review_status: "pending",
      accept_credits_cost: 2,
      budget_band: "medium",
      location: "Sydney",
    };
    const updateBuilder = makeBuilder({ data: briefRow, error: null });
    updateBuilder.maybeSingle = vi.fn(() => Promise.resolve({ data: briefRow, error: null }));
    const updateChain = makeBuilder();
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.select = vi.fn(() => updateBuilder);
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(insertBuilder);

    const res = await POST(makeReq({ action: "approve" }), makeCtx("123"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("POST reject succeeds", async () => {
    const briefRow = {
      id: 123,
      slug: "test-brief",
      job_title: "Test Brief",
      contact_email: "user@test.com",
    };
    const updateBuilder = makeBuilder({ data: briefRow, error: null });
    updateBuilder.maybeSingle = vi.fn(() => Promise.resolve({ data: briefRow, error: null }));
    const updateChain = makeBuilder();
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => updateChain);
    updateChain.select = vi.fn(() => updateBuilder);
    const insertBuilder = makeBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(insertBuilder);

    const res = await POST(makeReq({ action: "reject", note: "Spam content" }), makeCtx("123"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
