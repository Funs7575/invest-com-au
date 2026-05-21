/**
 * Tests for POST /api/admin/disputes/[id]/resolve.
 *
 * Admin-gated dispute resolution. Delegates the status change to the
 * `setStatus` helper and, on a `resolved_for_consumer` verdict, runs a
 * refund hook via `loadRefundContext` + `recordLedgerEntry` + `awardCredits`.
 * Helpers are mocked; a real `DisputeError` class is provided so the route's
 * `instanceof` branch maps to the carried status code.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockSetStatus,
  mockLoadRefundContext,
  mockRecordLedgerEntry,
  mockAwardCredits,
  DisputeError,
} = vi.hoisted(() => {
  class DisputeError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "DisputeError";
      this.status = status;
    }
  }
  return {
    mockRequireAdmin: vi.fn(),
    mockSetStatus: vi.fn(),
    mockLoadRefundContext: vi.fn(),
    mockRecordLedgerEntry: vi.fn(),
    mockAwardCredits: vi.fn(),
    DisputeError,
  };
});

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/disputes", () => ({
  DisputeError,
  setStatus: (...a: unknown[]) => mockSetStatus(...a),
  loadRefundContext: (...a: unknown[]) => mockLoadRefundContext(...a),
}));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: (...a: unknown[]) => mockRecordLedgerEntry(...a),
}));
vi.mock("@/lib/investor-referrals", () => ({
  awardCredits: (...a: unknown[]) => mockAwardCredits(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/disputes/[id]/resolve/route";

const ADMIN_OK = {
  ok: true as const,
  email: "admin@invest.com.au",
  userId: "user-1",
};

function denyGuard(status: number) {
  return {
    ok: false as const,
    response: new Response(JSON.stringify({ error: "denied" }), { status }),
  };
}

function makeReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/disputes/${id}/resolve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockSetStatus.mockResolvedValue({
    dispute: { id: 5, status: "admin_reviewing" },
    changed: true,
  });
});

describe("POST /api/admin/disputes/[id]/resolve", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(
      makeReq("5", { status: "admin_reviewing" }),
      ctx("5"),
    );
    expect(res.status).toBe(401);
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(
      makeReq("5", { status: "admin_reviewing" }),
      ctx("5"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for a non-numeric dispute id", async () => {
    const res = await POST(
      makeReq("xx", { status: "admin_reviewing" }),
      ctx("xx"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid status value", async () => {
    const res = await POST(makeReq("5", { status: "nope" }), ctx("5"));
    expect(res.status).toBe(400);
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/disputes/5/resolve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad",
      },
    );
    const res = await POST(req, ctx("5"));
    expect(res.status).toBe(400);
  });

  it("resolves a dispute and returns the updated record", async () => {
    const res = await POST(
      makeReq("5", { status: "admin_reviewing", resolution_notes: "ok" }),
      ctx("5"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dispute).toEqual({ id: 5, status: "admin_reviewing" });
    expect(json.refund).toBeNull();
    expect(mockSetStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        disputeId: 5,
        status: "admin_reviewing",
        resolvedByUserId: "user-1",
      }),
    );
  });

  it("runs the refund hook on resolved_for_consumer", async () => {
    mockSetStatus.mockResolvedValue({
      dispute: { id: 5, status: "resolved_for_consumer" },
      changed: true,
    });
    mockLoadRefundContext.mockResolvedValue({
      acceptedProfessionalId: 12,
      leadSpendCents: 500,
      briefId: 99,
      leadSpendEntryId: 1,
      consumerReferrerUserId: "ref-1",
      consumerAuthUserId: "consumer-1",
    });
    mockRecordLedgerEntry.mockResolvedValue({ idempotent: false });
    mockAwardCredits.mockResolvedValue(undefined);

    const res = await POST(
      makeReq("5", { status: "resolved_for_consumer" }),
      ctx("5"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refund).toEqual({
      proRefundCents: 500,
      referrerCreditsAwarded: true,
    });
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "lead_dispute_refund" }),
    );
  });

  it("maps a DisputeError to its carried status code", async () => {
    mockSetStatus.mockRejectedValue(new DisputeError("Already closed", 409));
    const res = await POST(
      makeReq("5", { status: "withdrawn" }),
      ctx("5"),
    );
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "Already closed" });
  });

  it("returns 500 on an unexpected error", async () => {
    mockSetStatus.mockRejectedValue(new Error("db down"));
    const res = await POST(
      makeReq("5", { status: "admin_reviewing" }),
      ctx("5"),
    );
    expect(res.status).toBe(500);
  });
});
