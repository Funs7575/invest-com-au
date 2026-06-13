import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsAllowed } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._: unknown[]) => mockIsAllowed(),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const { mockAdvisorSession } = vi.hoisted(() => ({
  mockAdvisorSession: vi.fn<() => Promise<number | null>>().mockResolvedValue(1),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (_req: unknown) => mockAdvisorSession(),
}));

// firm-billing helpers — stubbed; the route is just an HTTP wrapper.
const { mockResolveCtx, mockSeatStatus, mockCreateCheckout } = vi.hoisted(() => ({
  mockResolveCtx: vi.fn<() => Promise<{ advisorId: number; firmId: number } | null>>(),
  mockSeatStatus: vi.fn(),
  mockCreateCheckout: vi.fn(),
}));
vi.mock("@/lib/firm-billing", () => ({
  resolveFirmAdminContext: (..._: unknown[]) => mockResolveCtx(),
  getSeatBillingStatus: (..._: unknown[]) => mockSeatStatus(),
  createSeatSubscriptionCheckout: (..._: unknown[]) => mockCreateCheckout(),
}));

import { GET, POST } from "@/app/api/advisor-portal/firm-seats/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeGet() {
  return new Request("http://localhost/api/advisor-portal/firm-seats", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}
function makePost(body: unknown) {
  return new Request("http://localhost/api/advisor-portal/firm-seats", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockAdvisorSession.mockResolvedValue(1);
  mockResolveCtx.mockResolvedValue({ advisorId: 1, firmId: 10 });
});

// ── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/firm-seats", () => {
  it("403 when not a firm admin", async () => {
    mockResolveCtx.mockResolvedValue(null);
    expect((await GET(makeGet() as never)).status).toBe(403);
  });

  it("surfaces availability only (never the flag/env detail)", async () => {
    mockSeatStatus.mockResolvedValue({ flagEnabled: true, configured: true, available: true });
    const res = await GET(makeGet() as never);
    const json = await res.json();
    expect(json).toEqual({ available: true });
  });

  it("reports available:false when dormant", async () => {
    mockSeatStatus.mockResolvedValue({ flagEnabled: false, configured: false, available: false });
    const res = await GET(makeGet() as never);
    expect(await res.json()).toEqual({ available: false });
  });
});

// ── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-portal/firm-seats", () => {
  it("400 for invalid body", async () => {
    const res = await POST(makePost({ seats: 0 }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 409 + fallback:manual when billing is dormant", async () => {
    mockCreateCheckout.mockResolvedValue({ unavailable: true, reason: "dormant" });
    const res = await POST(makePost({ seats: 12 }) as never);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ fallback: "manual" });
  });

  it("returns the Checkout URL when billing is live", async () => {
    mockCreateCheckout.mockResolvedValue({ url: "https://stripe/checkout/cs" });
    const res = await POST(makePost({ seats: 12 }) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe/checkout/cs" });
  });

  it("returns 503 on a stripe misconfiguration (not a fallback)", async () => {
    mockCreateCheckout.mockResolvedValue({ unavailable: true, reason: "stripe" });
    const res = await POST(makePost({ seats: 12 }) as never);
    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty("fallback");
  });
});
