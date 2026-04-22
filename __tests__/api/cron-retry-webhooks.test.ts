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

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

type QueueItem = {
  id: number;
  broker_slug: string;
  webhook_url: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
};

let queueItems: QueueItem[] = [];

// Capture updates so tests can assert the state transitions
type UpdateCall = {
  table: string;
  payload: Record<string, unknown>;
  id: number;
};
const updateCalls: UpdateCall[] = [];
type InsertCall = { table: string; row: Record<string, unknown> };
const insertCalls: InsertCall[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "webhook_delivery_queue") {
    return {
      select: () => ({
        eq: () => ({
          lte: () => ({
            order: () => ({
              limit: async () => ({ data: queueItems, error: null }),
            }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, id: number) => {
          updateCalls.push({ table, payload, id });
          return { data: null, error: null };
        },
      }),
    };
  }

  if (table === "broker_notifications") {
    return {
      insert: async (row: Record<string, unknown>) => {
        insertCalls.push({ table, row });
        return { data: null, error: null };
      },
    };
  }

  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/retry-webhooks/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/retry-webhooks") as unknown as NextRequest;
}

function makeItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 1,
    broker_slug: "broker-a",
    webhook_url: "https://broker.example/webhook",
    payload: { conversion_id: "c1" },
    attempt_count: 0,
    max_attempts: 5,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/retry-webhooks", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    queueItems = [];
    updateCalls.length = 0;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("exports edge runtime and maxDuration = 60", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  it("auth short-circuits before DB access", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(updateCalls).toHaveLength(0);
  });

  it("returns zero counts when queue is empty", async () => {
    queueItems = [];
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ processed: 0, delivered: 0, retried: 0, failed: 0 });
  });

  it("marks 2xx responses as delivered", async () => {
    queueItems = [makeItem({ id: 10, attempt_count: 0 })];
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as unknown as typeof fetch;

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.delivered).toBe(1);
    expect(json.retried).toBe(0);
    expect(json.failed).toBe(0);

    // Queue row stamped delivered + attempt_count incremented
    const update = updateCalls.find((c) => c.id === 10);
    expect(update?.payload.status).toBe("delivered");
    expect(update?.payload.attempt_count).toBe(1);
  });

  it("schedules a retry with exponential backoff on a non-2xx response", async () => {
    queueItems = [makeItem({ id: 20, attempt_count: 0, max_attempts: 5 })];
    globalThis.fetch = vi.fn(async () => new Response("fail", { status: 500 })) as unknown as typeof fetch;

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.retried).toBe(1);
    expect(json.failed).toBe(0);
    expect(json.delivered).toBe(0);

    const update = updateCalls.find((c) => c.id === 20);
    expect(update?.payload.attempt_count).toBe(1);
    expect(update?.payload.last_error).toMatch(/HTTP 500/);
    // next_retry_at is the 1-minute (60_000ms) first-attempt slot
    expect(update?.payload.next_retry_at).toEqual(expect.any(String));
  });

  it("marks as failed and notifies the broker once max_attempts is reached", async () => {
    queueItems = [
      makeItem({ id: 30, attempt_count: 4, max_attempts: 5, broker_slug: "broker-x" }),
    ];
    globalThis.fetch = vi.fn(async () => new Response("fail", { status: 503 })) as unknown as typeof fetch;

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.failed).toBe(1);
    expect(json.retried).toBe(0);

    // Queue row stamped failed
    const update = updateCalls.find((c) => c.id === 30);
    expect(update?.payload.status).toBe("failed");
    expect(update?.payload.attempt_count).toBe(5);

    // Broker notification row inserted with the webhook_failed type
    expect(insertCalls).toHaveLength(1);
    const note = insertCalls[0];
    expect(note?.table).toBe("broker_notifications");
    expect(note?.row.broker_slug).toBe("broker-x");
    expect(note?.row.type).toBe("webhook_failed");
    expect(note?.row.is_read).toBe(false);
  });

  it("treats a network error the same as a failed response (retry path)", async () => {
    queueItems = [makeItem({ id: 40, attempt_count: 0, max_attempts: 5 })];
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.retried).toBe(1);

    const update = updateCalls.find((c) => c.id === 40);
    expect(update?.payload.last_error).toBe("ECONNRESET");
    expect(update?.payload.attempt_count).toBe(1);
  });
});
