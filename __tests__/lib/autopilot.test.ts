import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { isAutomationEnabled } from "@/lib/autopilot";

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockSettings(rows: { key: string; value: string }[] | null, error?: object) {
  const inBuilder = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error: error ?? null }),
  };
  mockFrom.mockReturnValue(inBuilder);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("isAutomationEnabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when no settings exist (default enabled)", async () => {
    mockSettings([]);
    expect(await isAutomationEnabled("check-fees")).toBe(true);
  });

  it("returns true when both toggles are 'true'", async () => {
    mockSettings([
      { key: "autopilot_enabled", value: "true" },
      { key: "autopilot_check-fees", value: "true" },
    ]);
    expect(await isAutomationEnabled("check-fees")).toBe(true);
  });

  it("returns false when master toggle is 'false'", async () => {
    mockSettings([{ key: "autopilot_enabled", value: "false" }]);
    expect(await isAutomationEnabled("check-fees")).toBe(false);
  });

  it("returns false when per-automation toggle is 'false'", async () => {
    mockSettings([
      { key: "autopilot_enabled", value: "true" },
      { key: "autopilot_expire-deals", value: "false" },
    ]);
    expect(await isAutomationEnabled("expire-deals")).toBe(false);
  });

  it("returns false when only per-automation toggle present and false", async () => {
    mockSettings([{ key: "autopilot_weekly-newsletter", value: "false" }]);
    expect(await isAutomationEnabled("weekly-newsletter")).toBe(false);
  });

  it("returns true (fail-open) on DB error", async () => {
    mockSettings(null, { message: "connection refused" });
    expect(await isAutomationEnabled("auto-publish")).toBe(true);
  });

  it("returns true (fail-open) when DB throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("timeout");
    });
    expect(await isAutomationEnabled("marketplace-stats")).toBe(true);
  });
});
