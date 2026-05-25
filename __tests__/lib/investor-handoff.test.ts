import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select","update","eq","neq","order","single","maybeSingle","filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { getHandoff } from "@/lib/investor-handoff";

const VALID_TOKEN = "a".repeat(36);

const FUTURE_DATE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

const MOCK_HANDOFF_ROW = {
  id: "row-uuid",
  intent: "tax-prep",
  holdings_snapshot_json: [
    {
      ticker: "VAS",
      exchange: "ASX",
      shares: 100,
      cost_basis_per_share_cents: 9500,
      acquired_at: "2024-01-15",
      broker_slug: null,
      notes: null,
    },
  ],
  expires_at: FUTURE_DATE,
  consumed_at: null,
  created_at: new Date().toISOString(),
};

describe("getHandoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty token", async () => {
    const result = await getHandoff("");
    expect(result).toBeNull();
  });

  it("returns null for oversized token", async () => {
    const result = await getHandoff("x".repeat(201));
    expect(result).toBeNull();
  });

  it("returns null when DB lookup fails", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db error" } }));
    const result = await getHandoff(VALID_TOKEN);
    expect(result).toBeNull();
  });

  it("returns null when token not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const result = await getHandoff(VALID_TOKEN);
    expect(result).toBeNull();
  });

  it("returns null when token already consumed", async () => {
    const consumed = { ...MOCK_HANDOFF_ROW, consumed_at: new Date().toISOString() };
    mockFrom.mockImplementation(() => makeBuilder({ data: consumed, error: null }));
    const result = await getHandoff(VALID_TOKEN);
    expect(result).toBeNull();
  });

  it("returns null when token is expired", async () => {
    const expired = {
      ...MOCK_HANDOFF_ROW,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    mockFrom.mockImplementation(() => makeBuilder({ data: expired, error: null }));
    const result = await getHandoff(VALID_TOKEN);
    expect(result).toBeNull();
  });

  it("returns handoff data for a valid, unexpired, unconsumed token", async () => {
    // First call: maybeSingle lookup; second call: update consumed_at
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ data: MOCK_HANDOFF_ROW, error: null }))
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));

    const result = await getHandoff(VALID_TOKEN);
    expect(result).not.toBeNull();
    expect(result?.intent).toBe("tax-prep");
    expect(result?.holdings).toHaveLength(1);
    expect(result?.holdings[0]?.ticker).toBe("VAS");
  });

  it("still returns data if consumed_at update fails (best-effort)", async () => {
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ data: MOCK_HANDOFF_ROW, error: null }))
      .mockImplementationOnce(() => makeBuilder({ data: null, error: { message: "update failed" } }));

    const result = await getHandoff(VALID_TOKEN);
    expect(result).not.toBeNull();
    expect(result?.holdings).toHaveLength(1);
  });

  it("maps snapshot fields correctly including nulls", async () => {
    const rowWithNulls = {
      ...MOCK_HANDOFF_ROW,
      holdings_snapshot_json: [
        {
          ticker: "CBA",
          exchange: "ASX",
          shares: 50,
          cost_basis_per_share_cents: 10000,
          acquired_at: "2023-06-01",
          broker_slug: "commsec",
          notes: "Initial purchase",
        },
      ],
    };
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ data: rowWithNulls, error: null }))
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));

    const result = await getHandoff(VALID_TOKEN);
    expect(result?.holdings[0]?.broker_slug).toBe("commsec");
    expect(result?.holdings[0]?.notes).toBe("Initial purchase");
  });

  it("handles empty holdings snapshot", async () => {
    const emptyRow = { ...MOCK_HANDOFF_ROW, holdings_snapshot_json: [] };
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ data: emptyRow, error: null }))
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));

    const result = await getHandoff(VALID_TOKEN);
    expect(result?.holdings).toHaveLength(0);
  });
});
