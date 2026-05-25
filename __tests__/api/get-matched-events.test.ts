/**
 * Tests for POST /api/get-matched/events — Get Matched funnel analytics.
 *
 * Fire-and-forget event ingestion: rate-limit → JSON parse →
 * LogGmEventRequest schema (real) → logEvent (mocked). The real schema is
 * used so the 400 contract (e.g. session_id min length, event_type enum)
 * is exercised end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockLogEvent } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockLogEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

import { POST } from "@/app/api/get-matched/events/route";

function makeReq(body?: unknown, ua?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ua) headers["user-agent"] = ua;
  return new NextRequest("http://localhost/api/get-matched/events", {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_EVENT = {
  session_id: "sess-abcdef12",
  event_type: "plan_shown",
  step: 3,
  payload: { plan_id: 9 },
  source_page: "/get-matched",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockLogEvent.mockResolvedValue(undefined);
});

describe("POST /api/get-matched/events", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_EVENT));
    expect(res.status).toBe(429);
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/get-matched/events", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body." });
  });

  it("returns 400 when session_id is too short", async () => {
    const res = await POST(makeReq({ ...VALID_EVENT, session_id: "short" }));
    expect(res.status).toBe(400);
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown event_type", async () => {
    const res = await POST(makeReq({ ...VALID_EVENT, event_type: "bogus" }));
    expect(res.status).toBe(400);
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it("logs the event and returns success, forwarding the user-agent header", async () => {
    const res = await POST(makeReq(VALID_EVENT, "vitest-agent/1.0"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockLogEvent).toHaveBeenCalledWith({
      sessionId: "sess-abcdef12",
      eventType: "plan_shown",
      step: 3,
      payload: { plan_id: 9 },
      sourcePage: "/get-matched",
      userAgent: "vitest-agent/1.0",
    });
  });

  it("defaults optional fields (step → null) when omitted", async () => {
    const res = await POST(
      makeReq({ session_id: "sess-abcdef12", event_type: "started" }),
    );
    expect(res.status).toBe(200);
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "sess-abcdef12",
        eventType: "started",
        step: null,
        payload: undefined,
        userAgent: null,
      }),
    );
  });
});
