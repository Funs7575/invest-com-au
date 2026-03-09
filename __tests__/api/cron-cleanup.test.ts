import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock logger before importing route (it imports @/lib/logger at module level)
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock Sentry (transitive dep via logger)
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Per-table delete counts
const tableCounts: Record<string, number> = {
  rate_limits: 15,
  analytics_events: 200,
  advisor_auth_tokens: 3,
  advisor_sessions: 8,
};

const mockFrom = vi.fn((table: string) => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  builder.delete = vi.fn(() => builder);
  builder.lt = vi.fn(() => builder);

  // Awaiting the builder resolves with { count }
  builder.then = vi.fn((cb: (v: any) => void) => {
    cb({ data: null, error: null, count: tableCounts[table] ?? 0 });
    return Promise.resolve();
  });

  return builder;
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import AFTER mocks
import { GET, runtime, maxDuration } from "@/app/api/cron/cleanup/route";

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Config ──

  it("exports edge runtime and maxDuration = 30", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(30);
  });

  // ── Success case ──

  it("returns 200 with cleanup counts for all tables", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.rate_limits_purged).toBe(15);
    expect(json.analytics_events_purged).toBe(200);
    expect(json.expired_tokens_purged).toBe(3);
    expect(json.expired_sessions_purged).toBe(8);
  });

  it("calls delete on all four tables", async () => {
    await GET();

    const calledTables = mockFrom.mock.calls.map((call) => call[0]);
    expect(calledTables).toContain("rate_limits");
    expect(calledTables).toContain("analytics_events");
    expect(calledTables).toContain("advisor_auth_tokens");
    expect(calledTables).toContain("advisor_sessions");
  });

  it("passes count: 'exact' to delete calls", async () => {
    await GET();

    // Each table's delete should have been called with { count: "exact" }
    for (const call of mockFrom.mock.results) {
      const builder = call.value;
      if (builder.delete.mock.calls.length > 0) {
        expect(builder.delete).toHaveBeenCalledWith({ count: "exact" });
      }
    }
  });

  // ── Error handling ──

  it("handles individual table cleanup errors gracefully", async () => {
    // Make rate_limits throw, others succeed
    mockFrom.mockImplementation((table: string) => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};

      builder.delete = vi.fn(() => builder);
      builder.lt = vi.fn(() => {
        if (table === "rate_limits") {
          throw new Error("Permission denied on rate_limits");
        }
        return builder;
      });

      builder.then = vi.fn((cb: (v: any) => void) => {
        cb({ data: null, error: null, count: tableCounts[table] ?? 0 });
        return Promise.resolve();
      });

      return builder;
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    // rate_limits_purged should be missing (error path skips it)
    // but the other tables should still be cleaned
    expect(json.analytics_events_purged).toBe(200);
    expect(json.expired_tokens_purged).toBe(3);
    expect(json.expired_sessions_purged).toBe(8);
  });

  it("returns ok:true even when all tables error", async () => {
    mockFrom.mockImplementation(() => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      builder.delete = vi.fn(() => builder);
      builder.lt = vi.fn(() => {
        throw new Error("Database offline");
      });
      builder.then = vi.fn((cb: (v: any) => void) => {
        cb({ data: null, error: null, count: 0 });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
