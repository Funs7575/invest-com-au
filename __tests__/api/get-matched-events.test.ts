/**
 * Tests for POST /api/get-matched/events
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockLogEvent = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
vi.mock("@/lib/getmatched/events", () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

import { POST } from "@/app/api/get-matched/events/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const VALID_BODY = {
  session_id: "sess-12345678",
  event_type: "plan_shown",
};

describe("POST /api/get-matched/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockLogEvent.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/events", {
      method: "POST",
      body: "!!!",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema (missing session_id)", async () => {
    const res = await POST(makeReq({ event_type: "plan_shown" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when event_type is invalid", async () => {
    const res = await POST(makeReq({ session_id: "sess-12345678", event_type: "unknown_event" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 on valid event body", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("calls logEvent with correct args", async () => {
    await POST(makeReq({ ...VALID_BODY, step: 2, payload: { plan_id: 5 } }));
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "sess-12345678", eventType: "plan_shown", step: 2 }),
    );
  });
});
