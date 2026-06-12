import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn();
const mockRequireAdvisorSession = vi.fn();
const mockFromFn = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: (...args: unknown[]) => mockFromFn(...args) })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, PATCH } from "@/app/api/advisor-portal/firm-leads/route";

// Chainable builder that resolves via `.then` (for `await builder` pattern)
// and exposes `.maybeSingle()` for explicit resolution.
function makeChain(
  thenResult: unknown = { data: [], error: null },
  maybeSingleResult: unknown = { data: null, error: null },
) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit", "update", "upsert", "filter"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(maybeSingleResult);
  chain.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(thenResult));
  return chain;
}

function getReq(params = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-portal/firm-leads${params ? "?" + params : ""}`,
  );
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/firm-leads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/advisor-portal/firm-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(10);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(getReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    // advisor lookup → not firm admin
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { id: 10, firm_id: 5, is_firm_admin: false }, error: null }),
    );
    const res = await GET(getReq());
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/firm admin/i);
  });

  it("returns 403 when caller has no firm_id", async () => {
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { id: 10, firm_id: null, is_firm_admin: true }, error: null }),
    );
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });

  it("returns 200 with empty leads when no firm members found", async () => {
    // advisor lookup → firm admin
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { id: 10, firm_id: 5, is_firm_admin: true }, error: null }),
    );
    // members lookup → empty list
    mockFromFn.mockReturnValueOnce(makeChain({ data: [], error: null }));

    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { leads: unknown[]; members: unknown[] };
    expect(body.leads).toHaveLength(0);
    expect(body.members).toHaveLength(0);
  });
});

describe("PATCH /api/advisor-portal/firm-leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(10);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(patchReq({ lead_id: 1, professional_id: 2 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(patchReq({ lead_id: 1, professional_id: 2 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const badReq = new NextRequest("http://localhost/api/advisor-portal/firm-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing lead_id", async () => {
    const res = await PATCH(patchReq({ professional_id: 2 }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { firm_id: 5, is_firm_admin: false }, error: null }),
    );
    const res = await PATCH(patchReq({ lead_id: 1, professional_id: 2 }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when target professional is not in the same firm", async () => {
    // caller → firm admin
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { firm_id: 5, is_firm_admin: true }, error: null }),
    );
    // target professional → not in same firm
    mockFromFn.mockReturnValueOnce(makeChain(null, { data: null, error: null }));
    const res = await PATCH(patchReq({ lead_id: 1, professional_id: 99 }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not in your firm/i);
  });

  it("returns 200 on successful lead reassignment", async () => {
    // caller → firm admin
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { firm_id: 5, is_firm_admin: true }, error: null }),
    );
    // target professional → in same firm
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { id: 2, firm_id: 5 }, error: null }),
    );
    // capture-read: lead's current assignee (audit trail, #13)
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { professional_id: 7 }, error: null }),
    );
    // previous owner is in the caller's firm
    mockFromFn.mockReturnValueOnce(
      makeChain(null, { data: { id: 7 }, error: null }),
    );
    // leads update → success
    const updateChain = makeChain({ data: null, error: null });
    mockFromFn.mockReturnValueOnce(updateChain);
    // lead_assignments audit insert (best-effort inside try/catch) — give it
    // a generic chain so the fail-soft path isn't exercised by accident.
    mockFromFn.mockReturnValueOnce(makeChain({ data: null, error: null }));

    const res = await PATCH(patchReq({ lead_id: 1, professional_id: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
