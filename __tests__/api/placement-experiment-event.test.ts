import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// createRateLimiter is called at module-init time; returning a controlled
// fn via this mock means the module-level isRateLimited uses our spy.
const rateLimitFn = vi.hoisted(() => vi.fn<() => boolean>(() => false));

vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: () => rateLimitFn,
}));

const recordMock = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>());

vi.mock("@/lib/placement-experiments-server", () => ({
  recordPlacementEvent: recordMock,
}));

import { POST } from "@/app/api/placement-experiment/event/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/placement-experiment/event", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "5.6.7.8" },
  });
}

describe("POST /api/placement-experiment/event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitFn.mockReturnValue(false);
    recordMock.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    rateLimitFn.mockReturnValueOnce(true);
    const res = await POST(
      makeReq({ experiment_id: 1, variant: "control", event_type: "impressions" }),
    );
    expect(res.status).toBe(429);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/placement-experiment/event", {
      method: "POST",
      body: "bad json{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when experiment_id is missing", async () => {
    const res = await POST(makeReq({ variant: "control", event_type: "impressions" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when experiment_id is non-positive", async () => {
    const res = await POST(
      makeReq({ experiment_id: 0, variant: "control", event_type: "impressions" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when variant fails the regex", async () => {
    const res = await POST(
      makeReq({ experiment_id: 1, variant: "Control", event_type: "impressions" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when event_type is unknown", async () => {
    const res = await POST(
      makeReq({ experiment_id: 1, variant: "a", event_type: "view" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 + invokes recordPlacementEvent on impressions", async () => {
    const res = await POST(
      makeReq({ experiment_id: 9, variant: "challenger", event_type: "impressions" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(recordMock).toHaveBeenCalledWith(9, "challenger", "impressions");
  });

  it("returns 200 + invokes recordPlacementEvent on clicks", async () => {
    const res = await POST(
      makeReq({ experiment_id: 12, variant: "a", event_type: "clicks" }),
    );
    expect(res.status).toBe(200);
    expect(recordMock).toHaveBeenCalledWith(12, "a", "clicks");
  });

  it("returns 200 on conversions even if record swallows errors", async () => {
    // recordPlacementEvent is best-effort — it never throws. Asserting
    // here that even when it does nothing visible, the route still 200s.
    recordMock.mockResolvedValueOnce(undefined);
    const res = await POST(
      makeReq({ experiment_id: 3, variant: "b", event_type: "conversions" }),
    );
    expect(res.status).toBe(200);
  });
});
