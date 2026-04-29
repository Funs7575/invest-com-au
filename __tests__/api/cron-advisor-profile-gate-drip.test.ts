import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/advisor-profile-gate-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "neq", "in", "is", "not", "order", "limit", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeAdvisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    name: "Alice",
    email: "alice@ex.com",
    status: "active",
    profile_quality_gate: "pending",
    profile_missing_fields: ["bio", "photo"],
    profile_gate_checked_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    profile_gate_step: 0,
    ...overrides,
  };
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/advisor-profile-gate-drip", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/advisor-profile-gate-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when professionals query errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns scanned:0 when no pending advisors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
  });

  it("unlocks profile when all fields are present (gate passes)", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const advisor = makeAdvisor();
    const fullProfile = {
      name: "Alice",
      bio: "A".repeat(60), // >= 50 chars
      photo_url: "https://example.com/photo.jpg",
      phone: "+61400000000",
      website: "https://alice.com",
      specialties: ["super"],
      fee_description: "fixed",
      location_state: "NSW",
    };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null }); // list advisors
        if (call === 2) return makeChain({ data: fullProfile, error: null }); // maybeSingle fresh
        return makeChain({ data: null, error: null }); // update gate
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.unlocked).toBe(1);
    // Email fire-and-forget via fetch (RESEND key set)
    expect(mockFetch).toHaveBeenCalled();
  });

  it("sends drip step 1 when >= 1 day since check (step was 0)", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const advisor = makeAdvisor({ profile_gate_checked_at: new Date(Date.now() - 2 * 86400000).toISOString(), profile_gate_step: 0 });
    const partialProfile = { name: "Alice", bio: "short", photo_url: null, phone: null, website: null, specialties: [], fee_description: null, location_state: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null });
        if (call === 2) return makeChain({ data: partialProfile, error: null });
        return makeChain({ data: null, error: null }); // updates
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.drip1).toBe(1);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("archives advisor when >= 21 days since check", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const advisor = makeAdvisor({ profile_gate_checked_at: new Date(Date.now() - 22 * 86400000).toISOString(), profile_gate_step: 4 });
    const partialProfile = { name: "Alice", bio: null, photo_url: null, phone: null, website: null, specialties: [], fee_description: null, location_state: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null });
        if (call === 2) return makeChain({ data: partialProfile, error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.archived).toBe(1);
    expect(body.drip1).toBe(0);
  });

  it("skips drip when current step already sent (idempotent)", async () => {
    const advisor = makeAdvisor({
      profile_gate_checked_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      profile_gate_step: 1, // already sent step 1
    });
    const partialProfile = { name: "Alice", bio: null, photo_url: null, phone: null, website: null, specialties: [], fee_description: null, location_state: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null });
        if (call === 2) return makeChain({ data: partialProfile, error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    // step=1, daysSince=2 -> computed step=1, already sent -> skip
    expect(body.drip1).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
