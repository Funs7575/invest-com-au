import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockSetStatus = vi.fn();
const mockLoadRefundContext = vi.fn();
vi.mock("@/lib/disputes", () => ({
  DisputeError: class DisputeError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  loadRefundContext: (...args: unknown[]) => mockLoadRefundContext(...args),
  setStatus: (...args: unknown[]) => mockSetStatus(...args),
}));

const mockRecordLedgerEntry = vi.fn();
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: (...args: unknown[]) => mockRecordLedgerEntry(...args),
}));

const mockAwardCredits = vi.fn();
vi.mock("@/lib/investor-referrals", () => ({
  awardCredits: (...args: unknown[]) => mockAwardCredits(...args),
}));

import { POST } from "@/app/api/admin/disputes/[id]/resolve/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/disputes/1/resolve", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> };

describe("/api/admin/disputes/[id]/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockSetStatus.mockResolvedValue({
      dispute: { id: 1, status: "admin_reviewing" },
      changed: false,
    });
    mockLoadRefundContext.mockResolvedValue(null);
  });

  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ status: "admin_reviewing" }), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for non-numeric id", async () => {
    const res = await POST(makeReq({ status: "admin_reviewing" }), ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/admin/disputes/1/resolve", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req, ctx("1"));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for body that fails Zod validation", async () => {
    const res = await POST(makeReq({ status: "invalid_status" }), ctx("1"));
    expect(res.status).toBe(400);
  });

  it("POST resolves dispute with valid body", async () => {
    const res = await POST(makeReq({ status: "admin_reviewing" }), ctx("1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dispute).toBeDefined();
  });

  it("POST applies refund hook when status=resolved_for_consumer and changed=true", async () => {
    mockSetStatus.mockResolvedValue({
      dispute: { id: 1, status: "resolved_for_consumer" },
      changed: true,
    });
    mockLoadRefundContext.mockResolvedValue(null); // no context = no refund
    const res = await POST(makeReq({ status: "resolved_for_consumer" }), ctx("1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refund).toEqual({ proRefundCents: 0, referrerCreditsAwarded: false });
  });
});
