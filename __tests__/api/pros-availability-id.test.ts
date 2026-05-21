/**
 * Tests for DELETE /api/pros/availability/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { DELETE } from "@/app/api/pros/availability/[id]/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/availability/1", { method: "DELETE" });
}

function makeSlotChain(slotData: unknown, deleteError: unknown = null) {
  const deleteChain: Record<string, unknown> = {};
  deleteChain.eq = vi.fn(async () => ({ error: deleteError }));

  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: slotData, error: null }));
  chain.delete = vi.fn(() => deleteChain);
  return chain;
}

const ctx = { params: Promise.resolve({ id: "1" }) } as Parameters<typeof DELETE>[1];
const ctxBadId = { params: Promise.resolve({ id: "abc" }) } as Parameters<typeof DELETE>[1];

describe("DELETE /api/pros/availability/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);

    const openSlot = { id: 1, professional_id: 42, status: "open" };
    mockAdminFrom.mockReturnValue(makeSlotChain(openSlot));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric slot id", async () => {
    const res = await DELETE(makeReq(), ctxBadId);
    expect(res.status).toBe(400);
  });

  it("returns 404 when slot not found", async () => {
    mockAdminFrom.mockReturnValue(makeSlotChain(null));
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when slot belongs to different pro", async () => {
    const otherSlot = { id: 1, professional_id: 99, status: "open" };
    mockAdminFrom.mockReturnValue(makeSlotChain(otherSlot));
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 409 when slot is booked", async () => {
    const bookedSlot = { id: 1, professional_id: 42, status: "booked" };
    mockAdminFrom.mockReturnValue(makeSlotChain(bookedSlot));
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful delete", async () => {
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
