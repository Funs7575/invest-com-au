import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: { headers: { get: (k: string) => string | null } }) => req.headers.get("x-forwarded-for") || "127.0.0.1",
}));

import { POST } from "@/app/api/report-download/route";
import { createAdminClient } from "@/lib/supabase/admin";

const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["upsert", "eq", "select"]) { c[m] = vi.fn(() => c); }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/report-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockIsAllowed.mockResolvedValue(true);
});

describe("POST /api/report-download", () => {
  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ error: null })) } as never);
    const res = await POST(makeReq({ email: "user@ex.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for email without @", async () => {
    const res = await POST(makeReq({ email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/report-download", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns success:true and upserts email on valid email", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ error: null })) } as never);
    const res = await POST(makeReq({ email: "User@Example.COM" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns success:true even when upsert errors (graceful degradation)", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ error: { message: "conflict" } })) } as never);
    const res = await POST(makeReq({ email: "user@ex.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
