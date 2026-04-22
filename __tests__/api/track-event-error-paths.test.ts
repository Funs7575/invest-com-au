import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

/**
 * Error-path coverage for POST /api/track-event. The original
 * track-event test covers 400 + 200 but not 500 or invalid JSON.
 * This suite fills those gaps via a mocked Supabase admin client.
 */

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let insertError: { message: string } | null = null;
const insertCalls: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: async (row: Record<string, unknown>) => {
        insertCalls.push(row);
        return { data: null, error: insertError };
      },
    })),
  })),
}));

import { POST } from "@/app/api/track-event/route";

function makeRequest(
  body: Record<string, unknown> | string,
  ip: string,
): NextRequest {
  const isString = typeof body === "string";
  return new NextRequest("http://localhost/api/track-event", {
    method: "POST",
    body: isString ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/track-event — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 on invalid JSON body (unparseable)", async () => {
    const req = makeRequest("not json at all", "21.0.0.1");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 400 when event_type is a non-string value (not allowed)", async () => {
    const req = makeRequest({ event_type: 42 as unknown as string }, "21.0.0.2");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid event_type");
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 500 when DB insert errors", async () => {
    insertError = { message: "constraint violation" };

    const req = makeRequest(
      { event_type: "quiz_complete", page: "/quiz" },
      "21.0.0.3",
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to track event");
    expect(insertCalls).toHaveLength(1);
  });

  it("truncates oversized page / session_id / user_agent fields before insert", async () => {
    const longPage = "/" + "x".repeat(1000);
    const longSession = "s".repeat(500);

    const req = makeRequest(
      {
        event_type: "calculator_use",
        page: longPage,
        session_id: longSession,
        event_data: { k: "v" },
      },
      "21.0.0.4",
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0] as {
      page: string;
      session_id: string;
      user_agent: string;
      event_data: Record<string, unknown>;
    };
    expect(row.page.length).toBeLessThanOrEqual(500);
    expect(row.session_id.length).toBeLessThanOrEqual(100);
    expect(row.user_agent.length).toBeLessThanOrEqual(500);
    // event_data passed through
    expect(row.event_data).toEqual({ k: "v" });
  });

  it("defaults page to '/' when absent and event_data to {} when absent", async () => {
    const req = makeRequest({ event_type: "quiz_start" }, "21.0.0.5");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const row = insertCalls[0] as { page: string; event_data: Record<string, unknown> };
    expect(row.page).toBe("/");
    expect(row.event_data).toEqual({});
  });

  it("hashes IP to a 16-char token (no raw IP stored)", async () => {
    const req = makeRequest(
      { event_type: "outbound_click" },
      "21.0.0.6",
    );
    await POST(req);
    const row = insertCalls[0] as { ip_hash: string };
    expect(row.ip_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(row.ip_hash).not.toContain("21.0.0.6");
  });
});
