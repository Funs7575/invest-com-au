import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const listOpenSlotsMock = vi.fn<(n: number) => Promise<unknown[]>>();
const claimSlotMock = vi.fn<() => Promise<{ ok: boolean; error?: string; slot?: unknown }>>();

vi.mock("@/lib/advisor-booking", () => ({
  listOpenSlots: (...args: unknown[]) => listOpenSlotsMock(args[0] as number),
  claimSlot: (...args: unknown[]) => claimSlotMock(...(args as [])),
}));

import { GET, POST } from "@/app/api/advisor-appointments/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/advisor-appointments");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-appointments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "3.3.3.3" },
  });
}

const SLOT = { id: 7, professional_id: 1, slot_time: "2026-05-10T10:00:00Z", status: "open" };

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/advisor-appointments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when professional_id is absent", async () => {
    expect((await GET(getReq())).status).toBe(400);
  });

  it("returns 400 when professional_id is not an integer", async () => {
    expect((await GET(getReq({ professional_id: "abc" }))).status).toBe(400);
  });

  it("returns 400 when professional_id is zero or negative", async () => {
    expect((await GET(getReq({ professional_id: "0" }))).status).toBe(400);
    expect((await GET(getReq({ professional_id: "-1" }))).status).toBe(400);
  });

  it("returns 200 with open slots", async () => {
    listOpenSlotsMock.mockResolvedValueOnce([SLOT]);
    const res = await GET(getReq({ professional_id: "1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0]).toMatchObject({ id: 7 });
  });

  it("returns 200 with empty items when no slots open", async () => {
    listOpenSlotsMock.mockResolvedValueOnce([]);
    const res = await GET(getReq({ professional_id: "42" }));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual([]);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/advisor-appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await POST(postReq({ slot_id: 7, email: "a@b.com", name: "Alice" }))).status).toBe(429);
  });

  it("returns 400 when slot_id is missing", async () => {
    expect((await POST(postReq({ email: "a@b.com", name: "Alice" }))).status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    expect((await POST(postReq({ slot_id: 7, name: "Alice" }))).status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    expect((await POST(postReq({ slot_id: 7, email: "a@b.com" }))).status).toBe(400);
  });

  it("returns 409 when slot is already taken", async () => {
    claimSlotMock.mockResolvedValueOnce({ ok: false, error: "already_taken" });
    expect((await POST(postReq({ slot_id: 7, email: "a@b.com", name: "Alice" }))).status).toBe(409);
  });

  it("returns 400 on other claimSlot error (e.g. not_found)", async () => {
    claimSlotMock.mockResolvedValueOnce({ ok: false, error: "not_found" });
    expect((await POST(postReq({ slot_id: 7, email: "a@b.com", name: "Alice" }))).status).toBe(400);
  });

  it("returns 200 on successful claim with slot data", async () => {
    claimSlotMock.mockResolvedValueOnce({ ok: true, slot: SLOT });
    const res = await POST(postReq({ slot_id: 7, email: "a@b.com", name: "Alice", lead_id: 5 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.slot).toMatchObject({ id: 7 });
  });
});
