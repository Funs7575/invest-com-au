import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockError, mockInfo } = vi.hoisted(() => ({
  mockError: vi.fn(),
  mockInfo: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: mockInfo, warn: vi.fn(), error: mockError, debug: vi.fn() }),
}));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_n: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn(() => null) }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@example.com" }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

const mockLookupAfsl = vi.fn();
vi.mock("@/lib/advisor-application-resolver", () => ({
  lookupAfsl: (...a: unknown[]) => mockLookupAfsl(...a),
}));

// Per-from() result queue; every chain method returns the chain, and the
// chain is thenable so `await chain` resolves the next queued result no
// matter which method is last in the call.
interface Res { data?: unknown; error?: { message: string } | null }
const fromQueue: Res[] = [];
let fromIdx = 0;
function makeChain() {
  const res = fromQueue[fromIdx++] ?? { data: null };
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "not", "update", "limit", "insert"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => makeChain() }),
}));

import { GET } from "@/app/api/cron/afsl-expiry-monitor/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/afsl-expiry-monitor") as unknown as NextRequest;
}

const advisor = { id: 1, name: "Jane", email: "jane@x.com", afsl_number: "123456", type: "planner", status: "active" };

describe("GET /api/cron/afsl-expiry-monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromQueue.length = 0;
    fromIdx = 0;
    delete process.env.RESEND_API_KEY; // keep sendEmail a no-op (no real fetch)
  });

  it("fails loud (inert=true + log.error) when no lookup runs", async () => {
    fromQueue.push({ data: [advisor] }); // professionals fetch
    mockLookupAfsl.mockResolvedValue({ performed: false });
    const res = await GET(makeReq());
    const json = (await res.json()) as { ok: boolean; inert: boolean; skipped_no_lookup: number };
    expect(json.ok).toBe(true);
    expect(json.inert).toBe(true);
    expect(json.skipped_no_lookup).toBe(1);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("INERT"),
      expect.any(Object),
    );
  });

  it("is not inert when lookups run and licence is current", async () => {
    fromQueue.push({ data: [advisor] });
    mockLookupAfsl.mockResolvedValue({ performed: true, status: "current" });
    const res = await GET(makeReq());
    const json = (await res.json()) as { inert: boolean; still_current: number };
    expect(json.inert).toBe(false);
    expect(json.still_current).toBe(1);
    expect(mockError).not.toHaveBeenCalled();
  });
});
