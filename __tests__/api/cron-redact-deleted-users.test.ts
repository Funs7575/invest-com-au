import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

let killSwitchOn = false;
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: vi.fn(async () => killSwitchOn),
}));

// Isolate the cron's orchestration from the soft-delete SQL helpers.
const { mockMark, mockRedact } = vi.hoisted(() => ({
  mockMark: vi.fn(async () => ({ failedTables: [] as string[] })),
  mockRedact: vi.fn(async () => ({ failedTables: [] as string[] })),
}));
vi.mock("@/lib/gdpr-soft-delete", () => ({
  markUserEntitiesDeleted: mockMark,
  redactUserEntities: mockRedact,
}));

const { mockErase } = vi.hoisted(() => ({
  mockErase: vi.fn(async () => ({}) as Record<string, number>),
}));
vi.mock("@/lib/privacy-data", () => ({
  eraseUserData: mockErase,
}));

// account_deletion_requests fetch + status-update mock.
let candidatesFetch: {
  data: { id: number; user_id: string; email: string | null }[] | null;
  error: { message: string; code?: string } | null;
} = { data: [], error: null };

const statusUpdateCalls: { id: number; payload: Record<string, unknown> }[] = [];
let statusUpdateError: { message: string } | null = null;

const mockFrom = vi.fn((table: string) => {
  if (table !== "account_deletion_requests") {
    throw new Error(`unexpected table ${table}`);
  }
  return {
    // fetch chain: select().eq().lt().is().limit()
    select: () => ({
      eq: () => ({
        lt: () => ({
          is: () => ({
            limit: async () => candidatesFetch,
          }),
        }),
      }),
    }),
    // status-update chain: update().eq().eq()
    update: (payload: Record<string, unknown>) => ({
      eq: (_col: string, id: number) => ({
        eq: async () => {
          statusUpdateCalls.push({ id, payload });
          return { error: statusUpdateError };
        },
      }),
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/redact-deleted-users/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/redact-deleted-users") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/redact-deleted-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    killSwitchOn = false;
    candidatesFetch = { data: [], error: null };
    statusUpdateCalls.length = 0;
    statusUpdateError = null;
    mockMark.mockResolvedValue({ failedTables: [] });
    mockRedact.mockResolvedValue({ failedTables: [] });
    mockErase.mockResolvedValue({});
  });

  afterAll(() => vi.restoreAllMocks());

  it("exports nodejs runtime and maxDuration = 300", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("auth short-circuits before any DB read", async () => {
    const unauth = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauth as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockRedact).not.toHaveBeenCalled();
  });

  it("honours the kill switch", async () => {
    killSwitchOn = true;
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toEqual({ ok: true, skipped: "kill_switch_on" });
    expect(mockRedact).not.toHaveBeenCalled();
  });

  it("returns skipped (not 500) when the table is not migrated", async () => {
    candidatesFetch = { data: null, error: { message: "relation does not exist", code: "42P01" } };
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, skipped: "table_not_migrated" });
  });

  it("returns 500 on a generic fetch error", async () => {
    candidatesFetch = { data: null, error: { message: "db down" } };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "fetch_failed" });
  });

  it("redacts each expired request and marks it purged", async () => {
    candidatesFetch = {
      data: [
        { id: 1, user_id: "u-1", email: "a@example.com" },
        { id: 2, user_id: "u-2", email: "b@example.com" },
      ],
      error: null,
    };
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, scanned: 2, redacted: 2, failed: 0 });

    expect(mockMark).toHaveBeenCalledTimes(2);
    expect(mockRedact).toHaveBeenCalledTimes(2);
    // Email-keyed surfaces erased for each request that carries an email.
    expect(mockErase).toHaveBeenCalledWith(expect.anything(), "a@example.com");
    expect(mockErase).toHaveBeenCalledWith(expect.anything(), "b@example.com");
    expect(statusUpdateCalls).toHaveLength(2);
    expect(statusUpdateCalls[0]?.payload).toMatchObject({ status: "purged" });
    expect(statusUpdateCalls[0]?.payload.fulfilled_at).toEqual(expect.any(String));
    expect(statusUpdateCalls[0]?.payload.pii_redacted_at).toEqual(expect.any(String));
  });

  it("counts a request as failed when the status update errors", async () => {
    candidatesFetch = { data: [{ id: 9, user_id: "u-9", email: "c@example.com" }], error: null };
    statusUpdateError = { message: "update boom" };
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, scanned: 1, redacted: 0, failed: 1 });
  });
});
