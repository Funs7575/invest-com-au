import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockGetUser, mockServerFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

import { POST } from "@/app/api/account/holdings/import-csv/route";

// ── Helpers ───────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/holdings/import-csv", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

interface InsertResult {
  data: unknown;
  error: { message: string } | null;
  count: number | null;
}

type InsertSpy = (
  payload: Array<Record<string, unknown>>,
  opts?: { count: "exact" | "planned" | "estimated" },
) => Promise<InsertResult>;

/** Build a mocked supabase chain whose `.insert(...)` resolves to `result`. */
function setupInsertChain(result: InsertResult) {
  const insertSpy = vi.fn<InsertSpy>(
    () =>
      ({
        // Awaiting the insert directly returns the result envelope. This
        // mirrors how `await supabase.from(...).insert(payload, { count })`
        // resolves at runtime — Supabase's builder is a thenable.
        then: (cb: (v: InsertResult) => unknown) => Promise.resolve(cb(result)),
      }) as unknown as Promise<InsertResult>,
  );
  mockServerFrom.mockReturnValue({ insert: insertSpy });
  return insertSpy;
}

const VALID_CSV = [
  "Date,Reference,Details,Debit($),Credit($),Balance($)",
  "01/03/2026,T1,B 100 BHP @ 45.00,4500.00,,0",
  "15/03/2026,T2,B 50 CBA @ 110.50,5525.00,,0",
].join("\n");

const ALL_INVALID_CSV = [
  "Date,Reference,Details,Debit($),Credit($),Balance($)",
  "BAD-DATE,T1,B 100 BHP @ 45.00,4500.00,,0",
  "02/03/2026,T2,S 50 CBA @ 110.00,,5500.00,0",
].join("\n");

describe("POST /api/account/holdings/import-csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      makePost({ broker_slug: "commsec", csv_text: VALID_CSV }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects unknown broker_slug at the Zod gate (400)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await POST(
      makePost({ broker_slug: "fakebroker", csv_text: VALID_CSV }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects oversized csv_text (>500K) at the Zod gate (400)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await POST(
      makePost({ broker_slug: "commsec", csv_text: "x".repeat(500_001) }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 422 when every parsed row fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const insertSpy = setupInsertChain({ data: null, error: null, count: 0 });
    const res = await POST(
      makePost({ broker_slug: "commsec", csv_text: ALL_INVALID_CSV }),
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { inserted: number; errors: unknown[] };
    expect(json.inserted).toBe(0);
    expect(json.errors.length).toBeGreaterThan(0);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns 200 with inserted=N on the happy path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const insertSpy = setupInsertChain({ data: null, error: null, count: 2 });
    const res = await POST(
      makePost({ broker_slug: "commsec", csv_text: VALID_CSV }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { inserted: number; errors: unknown[] };
    expect(json.inserted).toBe(2);
    expect(json.errors).toEqual([]);

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const callArgs = insertSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const payload = callArgs?.[0] ?? [];
    expect(payload).toHaveLength(2);
    expect(payload[0]?.auth_user_id).toBe("u1");
    expect(payload[0]?.ticker).toBe("BHP");
    expect(payload[0]?.broker_slug).toBe("commsec");
  });

  it("returns 500 when the supabase insert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    setupInsertChain({
      data: null,
      error: { message: "RLS denied" },
      count: null,
    });
    const res = await POST(
      makePost({ broker_slug: "commsec", csv_text: VALID_CSV }),
    );
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("insert_failed");
  });

  it("returns 400 on unparseable JSON body", async () => {
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
  });
});
