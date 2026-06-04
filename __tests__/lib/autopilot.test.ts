import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkAutopilotGate, _resetAutopilotCache } from "@/lib/autopilot";

const { mockFrom, mockLike, mockCreateAdminClient } = vi.hoisted(() => {
  const mockLike = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ like: mockLike })),
  }));
  const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));
  return { mockFrom, mockLike, mockCreateAdminClient };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

/** Set the rows returned by the (mocked) site_settings query. */
function setRows(rows: Array<{ key: string; value: string }> | null, error: { message: string } | null = null) {
  mockLike.mockResolvedValue({ data: rows, error });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetAutopilotCache();
  setRows([]);
});

describe("checkAutopilotGate", () => {
  it("returns null (runs) when there are no settings rows — defaults enabled", async () => {
    setRows([]);
    const res = await checkAutopilotGate("check-fees");
    expect(res).toBeNull();
  });

  it("returns a 503 when the master switch is disabled", async () => {
    setRows([{ key: "autopilot_enabled", value: "false" }]);
    const res = await checkAutopilotGate("check-fees");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const body = await res!.json();
    expect(body).toEqual({ skipped: true, reason: "autopilot_master_disabled" });
  });

  it("returns a 503 when a per-automation toggle is disabled while master is enabled", async () => {
    setRows([
      { key: "autopilot_enabled", value: "true" },
      { key: "autopilot_check-fees", value: "false" },
    ]);
    const res = await checkAutopilotGate("check-fees");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const body = await res!.json();
    expect(body).toEqual({ skipped: true, reason: "autopilot_check-fees_disabled" });
  });

  it("returns null when the per-automation toggle is explicitly true", async () => {
    setRows([
      { key: "autopilot_enabled", value: "true" },
      { key: "autopilot_check-fees", value: "true" },
    ]);
    const res = await checkAutopilotGate("check-fees");
    expect(res).toBeNull();
  });

  it("defaults an absent per-automation id to enabled (returns null)", async () => {
    setRows([
      { key: "autopilot_enabled", value: "true" },
      { key: "autopilot_other-job", value: "false" },
    ]);
    const res = await checkAutopilotGate("check-fees");
    expect(res).toBeNull();
  });

  it("fails open (returns null) when the DB read errors", async () => {
    setRows(null, { message: "connection refused" });
    const res = await checkAutopilotGate("check-fees");
    expect(res).toBeNull();
  });

  it("caches within the TTL and reloads only after _resetAutopilotCache", async () => {
    setRows([{ key: "autopilot_enabled", value: "true" }]);

    await checkAutopilotGate("check-fees");
    await checkAutopilotGate("check-fees");
    // Two calls within the TTL hit loadSettings (and therefore .from) once.
    expect(mockFrom).toHaveBeenCalledTimes(1);

    _resetAutopilotCache();
    await checkAutopilotGate("check-fees");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
