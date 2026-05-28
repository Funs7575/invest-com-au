import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, DELETE } from "@/app/api/account/life-event-wizard/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeGetReq(params?: string): NextRequest {
  return new NextRequest(`http://localhost/api/account/life-event-wizard${params ?? ""}`);
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/life-event-wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq(params: string): NextRequest {
  return new NextRequest(`http://localhost/api/account/life-event-wizard${params}`, {
    method: "DELETE",
  });
}

function makeListChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeMaybeSingleChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeUpsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.upsert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  let eqCount = 0;
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => {
    eqCount++;
    if (eqCount >= 2) return Promise.resolve(result);
    return chain;
  });
  return chain;
}

const VALID_EVENT_ID = "buying_first_home";

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/account/life-event-wizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns list of wizard states", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const states = [
      { life_event_id: VALID_EVENT_ID, step: 2, form_data: { completed: ["check_eligibility"] }, updated_at: "2026-01-01T00:00:00Z" },
    ];
    mockFrom.mockReturnValueOnce(makeListChain({ data: states, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.states).toHaveLength(1);
  });

  it("returns state for specific event_id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const state = { life_event_id: VALID_EVENT_ID, step: 1, form_data: {}, updated_at: "2026-01-01T00:00:00Z" };
    mockFrom.mockReturnValueOnce(makeMaybeSingleChain({ data: state }));
    const res = await GET(makeGetReq(`?event_id=${VALID_EVENT_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state?.life_event_id).toBe(VALID_EVENT_ID);
  });

  it("returns 400 for invalid event_id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await GET(makeGetReq("?event_id=not_a_real_event"));
    expect(res.status).toBe(400);
  });

  it("returns null state when event not started", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeMaybeSingleChain({ data: null }));
    const res = await GET(makeGetReq(`?event_id=${VALID_EVENT_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBeNull();
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/life-event-wizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makePostReq({ life_event_id: VALID_EVENT_ID });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when life_event_id is invalid", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = makePostReq({ life_event_id: "not_a_real_event" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when life_event_id is missing", async () => {
    const req = makePostReq({ form_data: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful upsert", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const inserted = { life_event_id: VALID_EVENT_ID, step: 1, form_data: { completed: ["check_eligibility"] }, updated_at: "2026-01-01T00:00:00Z" };
    mockFrom.mockReturnValueOnce(makeUpsertChain({ data: inserted, error: null }));
    const req = makePostReq({ life_event_id: VALID_EVENT_ID, step: 1, form_data: { completed: ["check_eligibility"] } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.life_event_id).toBe(VALID_EVENT_ID);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/life-event-wizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeDeleteReq(`?event_id=${VALID_EVENT_ID}`));
    expect(res.status).toBe(401);
  });

  it("returns 400 when event_id is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await DELETE(makeDeleteReq(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid event_id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await DELETE(makeDeleteReq("?event_id=bad_event"));
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful delete", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: null }));
    const res = await DELETE(makeDeleteReq(`?event_id=${VALID_EVENT_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
