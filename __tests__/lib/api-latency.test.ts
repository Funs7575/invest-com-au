import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockInsert, mockFrom, mockCreateAdminClient, mockWarn } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));
  const mockWarn = vi.fn();
  return { mockInsert, mockFrom, mockCreateAdminClient, mockWarn };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ warn: mockWarn, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { recordLatencySample, withLatencySample } from "@/lib/api-latency";

beforeEach(() => {
  mockInsert.mockReset();
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockClear();
  mockCreateAdminClient.mockClear();
  mockWarn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withLatencySample", () => {
  it("does not sample when rate=0 (Math.random()>=0 always) and passes handler result through", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 < 0 === false -> no sample
    const sentinel = { ok: true };
    const handler = vi.fn().mockResolvedValue(sentinel);

    const wrapped = withLatencySample("/api/no-sample", handler, { rate: 0 });
    const result = await wrapped();

    expect(result).toBe(sentinel);
    expect(handler).toHaveBeenCalledOnce();
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("samples when rate=1 (Math.random()<1) and inserts route_path/status/duration_ms once", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 0.5 < 1 -> sample
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1042.4); // start, end
    const handler = vi.fn().mockResolvedValue({ value: 1 });

    const wrapped = withLatencySample("/api/sampled", handler, { rate: 1 });
    await wrapped();
    await Promise.resolve(); // flush fire-and-forget microtask

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledWith({
      route_path: "/api/sampled",
      duration_ms: 42, // Math.round(1042.4 - 1000)
      status: 200,
    });
  });

  it("reads status from a Response handler result (404 captured)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(performance, "now").mockReturnValue(0);
    const response = new Response("nope", { status: 404 });
    const handler = vi.fn().mockResolvedValue(response);

    const wrapped = withLatencySample("/api/not-found", handler, { rate: 1 });
    const result = await wrapped();
    await Promise.resolve();

    expect(result).toBe(response);
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert.mock.calls[0]?.[0]).toMatchObject({ status: 404 });
  });

  it("defaults status to 200 for a non-Response handler result", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(performance, "now").mockReturnValue(0);
    const handler = vi.fn().mockResolvedValue({ plain: "object" });

    const wrapped = withLatencySample("/api/plain", handler, { rate: 1 });
    await wrapped();
    await Promise.resolve();

    expect(mockInsert.mock.calls[0]?.[0]).toMatchObject({ status: 200 });
  });

  it("returns the handler result regardless of insert resolution (fire-and-forget)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(performance, "now").mockReturnValue(0);
    // Insert never resolves — the wrapped fn must still resolve with the result.
    mockInsert.mockReturnValue(new Promise(() => {}));
    const sentinel = { id: "abc" };
    const handler = vi.fn().mockResolvedValue(sentinel);

    const wrapped = withLatencySample("/api/ff", handler, { rate: 1 });
    const result = await wrapped();

    expect(result).toBe(sentinel);
  });

  it("rounds duration via Math.round and records a non-negative value", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(10.2) // start
      .mockReturnValueOnce(20.9); // end -> 10.7 -> round 11
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrapped = withLatencySample("/api/round", handler, { rate: 1 });
    await wrapped();
    await Promise.resolve();

    const arg = mockInsert.mock.calls[0]?.[0] as { duration_ms: number };
    expect(arg.duration_ms).toBe(11);
    expect(arg.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("uses the default 1% sample rate when no rate option is provided", async () => {
    // Math.random() = 0.5 -> 0.5 < 0.01 === false -> no sample at default rate
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const handler = vi.fn().mockResolvedValue("x");

    const wrapped = withLatencySample("/api/default", handler);
    await wrapped();
    await Promise.resolve();

    expect(mockInsert).not.toHaveBeenCalled();

    // Math.random() = 0.005 -> 0.005 < 0.01 === true -> sample
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValue(0.005);
    vi.spyOn(performance, "now").mockReturnValue(0);
    await wrapped();
    await Promise.resolve();

    expect(mockInsert).toHaveBeenCalledOnce();
  });
});

describe("recordLatencySample", () => {
  it("early-returns without inserting when durationMs < 0", async () => {
    await recordLatencySample("/api/neg", -1, 200);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("early-returns without inserting when durationMs > 600000", async () => {
    await recordLatencySample("/api/huge", 600_001, 200);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts for a valid duration", async () => {
    await recordLatencySample("/api/cron-job", 1234, 200);
    expect(mockCreateAdminClient).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith("api_latency_samples");
    expect(mockInsert).toHaveBeenCalledWith({
      route_path: "/api/cron-job",
      duration_ms: 1234,
      status: 200,
    });
  });

  it("catches and logs an insert error without throwing", async () => {
    mockInsert.mockRejectedValue(new Error("boom"));

    await expect(recordLatencySample("/api/err", 100, 500)).resolves.toBeUndefined();
    expect(mockWarn).toHaveBeenCalledOnce();
    expect(mockWarn.mock.calls[0]?.[0]).toBe("latency sample insert failed");
    expect(mockWarn.mock.calls[0]?.[1]).toMatchObject({ route: "/api/err", err: "boom" });
  });
});
