import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockFrom, mockListAvailabilityForPro } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockFrom: vi.fn(),
  mockListAvailabilityForPro: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/consultations", () => ({
  listAvailabilityForPro: mockListAvailabilityForPro,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/pros/[slug]/availability/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/jane-pro/availability");
}

function makeCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

// from().select().eq().in().maybeSingle() — pro lookup.
function makeLookupChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("GET /api/pros/[slug]/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq(), makeCtx("jane-pro"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for an empty slug", async () => {
    const res = await GET(makeReq(), makeCtx(""));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid slug." });
  });

  it("returns 400 for an overlong slug", async () => {
    const res = await GET(makeReq(), makeCtx("x".repeat(201)));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the pro is not found", async () => {
    mockFrom.mockReturnValueOnce(makeLookupChain({ data: null }));
    const res = await GET(makeReq(), makeCtx("jane-pro"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Pro not found." });
  });

  it("returns the professional and slots on success", async () => {
    mockFrom.mockReturnValueOnce(
      makeLookupChain({ data: { id: 7, name: "Jane Pro", slug: "jane-pro" } }),
    );
    const slots = [{ id: 1, start: "2026-06-01T10:00:00Z" }];
    mockListAvailabilityForPro.mockResolvedValueOnce(slots);
    const res = await GET(makeReq(), makeCtx("jane-pro"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      professional: { id: 7, name: "Jane Pro", slug: "jane-pro" },
      slots,
    });
    expect(mockListAvailabilityForPro).toHaveBeenCalledWith(7);
  });

  it("returns 500 when listAvailabilityForPro throws", async () => {
    mockFrom.mockReturnValueOnce(
      makeLookupChain({ data: { id: 7, name: "Jane Pro", slug: "jane-pro" } }),
    );
    mockListAvailabilityForPro.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(makeReq(), makeCtx("jane-pro"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to list availability." });
  });
});
