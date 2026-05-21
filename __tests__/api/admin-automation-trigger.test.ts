import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));
vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));
vi.mock("@/lib/admin/automation-metrics", () => ({
  FEATURE_CONFIG: {
    text_moderation: { cronName: "text-moderation-run" },
    listing_scam: { cronName: "listing-scam-run" },
  },
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
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/automation/trigger/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/trigger", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("POST denies unauthenticated (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ cron: "text-moderation-run" }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({ cron: "text-moderation-run" }));
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for missing cron name", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for cron not on allowlist", async () => {
    const res = await POST(makeReq({ cron: "not-a-real-cron" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 500 when CRON_SECRET not configured", async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await POST(makeReq({ cron: "text-moderation-run" }));
      expect(res.status).toBe(500);
    } finally {
      if (original !== undefined) process.env.CRON_SECRET = original;
    }
  });
});
