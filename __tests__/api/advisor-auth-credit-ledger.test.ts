import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdvisorSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockGetLedgerPage = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ rows: [], total: 0 }));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  getLedgerPage: (...args: unknown[]) => mockGetLedgerPage(...args),
}));

import { GET } from "@/app/api/advisor-auth/credit-ledger/route";

function makeReq(searchParams = ""): NextRequest {
  return new NextRequest(`http://localhost/api/advisor-auth/credit-ledger${searchParams ? `?${searchParams}` : ""}`, {
    method: "GET",
  });
}

describe("/api/advisor-auth/credit-ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetLedgerPage.mockResolvedValue({ rows: [], total: 0 });
  });

  it("rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ledger page for authenticated advisor", async () => {
    const mockRows = [{ id: 1, amount_cents: 5000, type: "credit", created_at: "2024-01-01" }];
    mockGetLedgerPage.mockResolvedValue({ rows: mockRows, total: 1 });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("rows");
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("limit");
    expect(json).toHaveProperty("offset");
  });

  it("uses default limit=50 when not provided", async () => {
    await GET(makeReq());
    expect(mockGetLedgerPage).toHaveBeenCalledWith(42, { limit: 50, offset: 0 });
  });

  it("uses provided limit and offset", async () => {
    await GET(makeReq("limit=25&offset=50"));
    expect(mockGetLedgerPage).toHaveBeenCalledWith(42, { limit: 25, offset: 50 });
  });

  it("caps limit at 200", async () => {
    await GET(makeReq("limit=999"));
    expect(mockGetLedgerPage).toHaveBeenCalledWith(42, { limit: 200, offset: 0 });
  });
});
