import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockIsRateLimited = vi.fn(async () => false);
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args) }));

const mockIsValidEmail = vi.fn((e: string) => e.includes("@"));
vi.mock("@/lib/validate-email", () => ({ isValidEmail: (e: string) => mockIsValidEmail(e) }));

import { POST } from "@/app/api/report-leads/route";
import { createAdminClient } from "@/lib/supabase/admin";

const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "maybeSingle", "single"]) { c[m] = vi.fn(() => c); }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/report-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const validPayload = { report_slug: "broker-fee-guide-2026", email: "user@ex.com", name: "Alice Smith" };

beforeEach(() => {
  vi.resetAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
  mockIsValidEmail.mockImplementation((e: string) => e.includes("@"));
});

describe("POST /api/report-leads", () => {
  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/report-leads", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when report_slug is missing", async () => {
    const res = await POST(makeReq({ email: "u@ex.com", name: "Alice" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("report_slug");
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeReq({ ...validPayload, email: "notvalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short", async () => {
    const res = await POST(makeReq({ ...validPayload, name: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when report_slug not found", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        return makeChain({ data: null, error: null }); // maybeSingle → null
      }),
    } as never);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(404);
  });

  it("returns 500 when developer_leads insert errors", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: { slug: "broker-fee-guide-2026", report_url: "/reports/bfg.pdf", gated: true, status: "published" }, error: null });
        return makeChain({ data: null, error: { message: "insert failed" } });
      }),
    } as never);
    const res = await POST(makeReq(validPayload));
    expect(res.status).toBe(500);
  });

  it("returns success:true and report_url on valid request", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: { slug: "broker-fee-guide-2026", report_url: "/reports/bfg.pdf", gated: true, status: "published" }, error: null });
        return makeChain({ data: null, error: null }); // insert developer_leads
      }),
    } as never);
    const res = await POST(makeReq(validPayload));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.report_url).toBe("/reports/bfg.pdf");
  });
});
