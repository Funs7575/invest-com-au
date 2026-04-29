import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/advisor-quality/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "not", "or", "lt", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/advisor-quality", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/advisor-quality", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with empty results when no advisors", async () => {
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: [], error: null })),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(0);
  });

  it("records profile_gate_fail when advisor has missing fields", async () => {
    const advisor = {
      id: 1, name: "Alice Smith", email: "alice@ex.com",
      bio: "Short", photo_url: null, afsl_number: null, registration_number: null,
      phone: null, location_display: null, specialties: [], fee_description: null,
      status: "active", profile_quality_gate: "passed", // mismatch → triggers update
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null }); // profile gate query
        if (call === 2) return makeChain({ data: null, error: null }); // update professionals
        if (call === 3) return makeChain({ data: null, error: null }); // insert verification log
        return makeChain({ data: [], error: null }); // SLA and ASIC sections
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.some((r: { check: string; action: string }) => r.check === "profile_gate" && r.action === "failed")).toBe(true);
  });

  it("does not update when gate status already matches computed value", async () => {
    const advisor = {
      id: 1, name: "Bob Jones", email: "bob@ex.com",
      bio: "A bio that is certainly longer than fifty characters in total here",
      photo_url: "http://example.com/photo.jpg", afsl_number: "123456", registration_number: null,
      phone: "0400000000", location_display: "Sydney, NSW", specialties: ["SMSF"], fee_description: "Flat fee",
      status: "active", profile_quality_gate: "passed", // already correct
    };
    let fromCalls = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        fromCalls++;
        if (fromCalls === 1) return makeChain({ data: [advisor], error: null }); // profile gate: no change needed
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    // No profile_gate result since status already matched
    expect(body.results.filter((r: { check: string }) => r.check === "profile_gate")).toHaveLength(0);
  });

  it("sends SLA warning and updates professionals when advisor has 3+ unresponded leads", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockFetch.mockResolvedValue({ ok: true });
    const advisor = {
      id: 2, name: "Carol White", email: "carol@ex.com",
      status: "active", pause_warning_sent_at: null, auto_paused_at: null,
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // profile gate: no advisors needing change
        if (call === 2) return makeChain({ data: [advisor], error: null }); // active advisors for SLA
        if (call === 3) return makeChain({ count: 4, error: null }); // unresponded leads count
        if (call === 4) return makeChain({ data: null, error: null }); // update unresponded_leads
        if (call === 5) return makeChain({ data: null, error: null }); // update pause_warning_sent_at
        if (call === 6) return makeChain({ data: null, error: null }); // insert verification log
        return makeChain({ data: [], error: null }); // ASIC section
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.some((r: { check: string; action: string }) => r.check === "response_sla" && r.action === "warning_sent")).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("auto-pauses advisor with 5+ unresponded leads after warning period", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockFetch.mockResolvedValue({ ok: true });
    const oldWarning = new Date(Date.now() - 4 * 86400000).toISOString(); // 4 days ago > 3 day threshold
    const advisor = {
      id: 3, name: "Dave Green", email: "dave@ex.com",
      status: "active", pause_warning_sent_at: oldWarning, auto_paused_at: null,
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // profile gate
        if (call === 2) return makeChain({ data: [advisor], error: null }); // active advisors
        if (call === 3) return makeChain({ count: 6, error: null }); // 6 unresponded
        if (call === 4) return makeChain({ data: null, error: null }); // update unresponded_leads
        // call 5: warning already sent → skips warning block
        if (call === 5) return makeChain({ data: null, error: null }); // update status=paused
        if (call === 6) return makeChain({ data: null, error: null }); // insert verification log
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.some((r: { check: string; action: string }) => r.check === "response_sla" && r.action === "auto_paused")).toBe(true);
  });

  it("marks advisor as verified when AFSL found in ASIC response", async () => {
    const afslNumber = "123456";
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`<html>AFSL ${afslNumber} Current registered</html>`),
    });
    const advisor = {
      id: 4, name: "Eve Brown", afsl_number: afslNumber, registration_number: null,
      type: "adviser", last_verified_at: null, verification_failures: 0,
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // profile gate
        if (call === 2) return makeChain({ data: [], error: null }); // SLA active advisors
        if (call === 3) return makeChain({ data: [advisor], error: null }); // ASIC to-verify list
        if (call === 4) return makeChain({ data: null, error: null }); // update verified=true
        return makeChain({ data: null, error: null }); // insert verification log
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.some((r: { check: string; action: string }) => r.check === "asic_verify" && r.action === "verified")).toBe(true);
  });

  it("records failed ASIC check when AFSL not in response", async () => {
    const afslNumber = "999999";
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<html>No results found</html>"),
    });
    const advisor = {
      id: 5, name: "Frank Lee", afsl_number: afslNumber, registration_number: null,
      type: "adviser", last_verified_at: null, verification_failures: 0,
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // profile gate
        if (call === 2) return makeChain({ data: [], error: null }); // SLA active advisors
        if (call === 3) return makeChain({ data: [advisor], error: null }); // ASIC to-verify list
        if (call === 4) return makeChain({ data: null, error: null }); // update verification_failures
        return makeChain({ data: null, error: null }); // insert verification log
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results.some((r: { check: string; action: string }) => r.check === "asic_verify" && r.action === "failed")).toBe(true);
  });

  it("continues gracefully when ASIC fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network timeout"));
    const advisor = {
      id: 6, name: "Grace Ho", afsl_number: "555555", registration_number: null,
      type: "adviser", last_verified_at: null, verification_failures: 0,
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // profile gate
        if (call === 2) return makeChain({ data: [], error: null }); // SLA active advisors
        return makeChain({ data: [advisor], error: null }); // ASIC list
      }),
    } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.some((r: { check: string; action: string }) => r.check === "asic_verify" && r.action === "error")).toBe(true);
  });
});
