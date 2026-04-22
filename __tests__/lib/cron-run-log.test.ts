import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextResponse } from "next/server";
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

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Shared state across mocks
let insertError: { message: string } | null = null;
let insertedRowId: number | null = 42;
let deleteCount: number | null = 0;
let deleteError: { message: string } | null = null;

type Row = Record<string, unknown>;
type InsertCall = { table: string; row: Row };
type UpdateCall = { table: string; payload: Row; id?: unknown };
type DeleteCall = { table: string; lt: [string, string] };

const insertCalls: InsertCall[] = [];
const updateCalls: UpdateCall[] = [];
const deleteCalls: DeleteCall[] = [];

const mockFrom = vi.fn((table: string) => {
  return {
    insert: (row: Row) => {
      insertCalls.push({ table, row });
      return {
        select: () => ({
          single: async () =>
            insertError
              ? { data: null, error: insertError }
              : { data: { id: insertedRowId }, error: null },
        }),
      };
    },

    update: (payload: Row) => ({
      eq: async (_col: string, id: unknown) => {
        updateCalls.push({ table, payload, id });
        return { data: null, error: null };
      },
    }),

    delete: (_opts?: unknown) => ({
      lt: async (col: string, val: string) => {
        deleteCalls.push({ table, lt: [col, val] });
        return { count: deleteCount, error: deleteError };
      },
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  withCronRunLog,
  wrapCronHandler,
  cleanupCronRunLog,
} from "@/lib/cron-run-log";

// ─── Tests ───────────────────────────────────────────────────────────

describe("cron-run-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertedRowId = 42;
    deleteCount = 0;
    deleteError = null;
    insertCalls.length = 0;
    updateCalls.length = 0;
    deleteCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("withCronRunLog", () => {
    it("inserts a running row before the handler runs, then stamps ok + duration", async () => {
      const response = await withCronRunLog("my_cron", async () => {
        return { response: "ok-result" as const, stats: { scanned: 5 } };
      });

      expect(response).toBe("ok-result");

      // Insert happened with status='running' + triggered_by default 'cron'
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0]!.row).toMatchObject({
        name: "my_cron",
        status: "running",
        triggered_by: "cron",
      });
      expect(insertCalls[0]!.row.started_at).toEqual(expect.any(String));

      // Update stamped the completion row
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]!.id).toBe(42);
      const payload = updateCalls[0]!.payload;
      expect(payload.status).toBe("ok");
      expect(payload.duration_ms).toEqual(expect.any(Number));
      expect(payload.stats).toEqual({ scanned: 5 });
    });

    it("marks status='partial' when stats.failed > 0", async () => {
      await withCronRunLog("my_cron", async () => ({
        response: "r" as const,
        stats: { scanned: 10, failed: 2 },
      }));
      expect(updateCalls[0]!.payload.status).toBe("partial");
    });

    it("marks status='partial' when stats.errored > 0 (alternate naming)", async () => {
      await withCronRunLog("my_cron", async () => ({
        response: "r" as const,
        stats: { scanned: 10, errored: 1 },
      }));
      expect(updateCalls[0]!.payload.status).toBe("partial");
    });

    it("rethrows handler errors AND stamps status='error' + truncated message", async () => {
      const longMsg = "x".repeat(600);
      await expect(
        withCronRunLog("failing_cron", async () => {
          throw new Error(longMsg);
        }),
      ).rejects.toThrow(longMsg);

      // Error path still writes an update with status=error
      expect(updateCalls).toHaveLength(1);
      const payload = updateCalls[0]!.payload;
      expect(payload.status).toBe("error");
      // error_message truncated to 500 chars
      expect((payload.error_message as string).length).toBe(500);
    });

    it("skips the update when the initial insert failed (no logRow to reference)", async () => {
      insertError = { message: "unique violation" };
      insertedRowId = null;

      const result = await withCronRunLog("my_cron", async () => ({
        response: "r" as const,
      }));
      expect(result).toBe("r");
      // handler ran but no update was issued (no logRow id)
      expect(updateCalls).toHaveLength(0);
    });

    it("honours an explicit triggered_by option", async () => {
      await withCronRunLog(
        "my_cron",
        async () => ({ response: "r" as const }),
        { triggeredBy: "admin_manual" },
      );
      expect(insertCalls[0]!.row.triggered_by).toBe("admin_manual");
    });
  });

  describe("wrapCronHandler", () => {
    function makeReq(headers: Record<string, string> = {}): NextRequest {
      return new Request("http://localhost/api/cron/test", {
        headers,
      }) as unknown as NextRequest;
    }

    it("wraps a GET handler: response flows through, stats parsed from JSON body", async () => {
      const handler = async () =>
        NextResponse.json({ ok: true, scanned: 3, published: 2 });
      const wrapped = wrapCronHandler("my_cron", handler);

      const res = await wrapped(makeReq());
      const json = await res.json();
      expect(json).toMatchObject({ ok: true, scanned: 3 });

      // Stats from the JSON body land on the run_log update
      expect(updateCalls[0]!.payload.stats).toMatchObject({
        ok: true,
        scanned: 3,
        published: 2,
      });
    });

    it("detects admin_manual trigger via x-admin-manual header", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = wrapCronHandler("my_cron", handler);

      await wrapped(makeReq({ "x-admin-manual": "finn@invest.com.au" }));

      expect(insertCalls[0]!.row.triggered_by).toBe("admin_manual");
    });

    it("falls back to triggered_by='cron' when the admin header is absent", async () => {
      const handler = async () => NextResponse.json({ ok: true });
      const wrapped = wrapCronHandler("my_cron", handler);

      await wrapped(makeReq());
      expect(insertCalls[0]!.row.triggered_by).toBe("cron");
    });

    it("handles non-JSON response bodies without throwing (stats stays empty)", async () => {
      const handler = async () =>
        new NextResponse("plain text", { status: 200 });
      const wrapped = wrapCronHandler("my_cron", handler);

      const res = await wrapped(makeReq());
      expect(res.status).toBe(200);
      expect(updateCalls[0]!.payload.stats).toEqual({});
    });
  });

  describe("cleanupCronRunLog", () => {
    it("deletes rows older than 90 days and returns the count", async () => {
      deleteCount = 123;

      const count = await cleanupCronRunLog();
      expect(count).toBe(123);

      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0]!.table).toBe("cron_run_log");
      // cutoff is started_at < now - 90d (ISO string)
      expect(deleteCalls[0]!.lt[0]).toBe("started_at");
      expect(deleteCalls[0]!.lt[1]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("returns 0 when the delete errors (never throws)", async () => {
      deleteError = { message: "db down" };
      expect(await cleanupCronRunLog()).toBe(0);
    });

    it("returns 0 when count is null (delete ran but Supabase didn't return an exact count)", async () => {
      deleteCount = null;
      // Note: function uses `count || 0` fallback
      expect(await cleanupCronRunLog()).toBe(0);
    });
  });
});
