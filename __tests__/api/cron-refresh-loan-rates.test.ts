import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Unwrap wrapCronHandler so tests drive the handler directly.
// The mock returns `h` (the inner handler), so GET becomes handler.
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

const { mockRequireCronAuth } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

// ─── Supabase mock state ───────────────────────────────────────────────────────

let updateError: { message: string } | null = null;
let updatedRows: { id: string }[] = [{ id: "uuid-1" }, { id: "uuid-2" }];

const mockSelect = vi.fn(async () => ({
  data: updatedRows,
  error: updateError,
}));

const mockNeq = vi.fn(() => ({
  select: mockSelect,
}));

const mockUpdate = vi.fn(() => ({
  neq: mockNeq,
}));

const mockFrom = vi.fn(() => ({
  update: mockUpdate,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import {
  GET as _GET,
  runtime,
  maxDuration,
} from "@/app/api/cron/refresh-loan-rates/route";
import type { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

// When wrapCronHandler is mocked to return the inner handler directly,
// the exported GET has the same call signature but TS sees the mock
// return type. Cast once here so test assertions can access .status / .json().
const GET = _GET as unknown as (req: NextRequest) => Promise<NextResponse>;

function makeReq(adminManual = false): NextRequest {
  const headers: Record<string, string> = {};
  if (adminManual) headers["x-admin-manual"] = "true";
  return new Request("http://localhost/api/cron/refresh-loan-rates", {
    headers,
  }) as unknown as NextRequest;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/refresh-loan-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateError = null;
    updatedRows = [{ id: "uuid-1" }, { id: "uuid-2" }];
    mockRequireCronAuth.mockReturnValue(null);
    process.env.CRON_SECRET = "a-sufficiently-long-test-secret";
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when auth fails", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    // DB should not be touched
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 with updated count on the happy path", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.updated).toBe(2);
    expect(json.mode).toBe("stub");
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json.note).toContain("stub");
  });

  it("calls update on investment_loan_rates table", async () => {
    await GET(makeReq());
    expect(mockFrom).toHaveBeenCalledWith("investment_loan_rates");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) }),
    );
    expect(mockNeq).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledWith("id");
  });

  it("returns 500 when the DB update fails", async () => {
    updateError = { message: "connection refused" };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("connection refused");
  });

  it("handles empty result set (no rows to update) gracefully", async () => {
    updatedRows = [];

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.updated).toBe(0);
  });
});
