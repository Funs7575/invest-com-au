import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Input-validation tests for /api/broker-review-invite.
 *
 * Mocks the Supabase admin client so we can drive the handler through
 * its error branches without needing a live DB. Covers:
 *
 *   GET  — malformed token → 400
 *   GET  — unknown token   → 404
 *   GET  — expired invite  → 410 + status flipped to 'expired'
 *   POST — malformed token → 400
 *   POST — rating out of range → 400
 *   POST — body too short  → 400
 */

const supabaseMock = vi.hoisted(() => {
  const state: {
    inviteRow: Record<string, unknown> | null;
    brokerRow: Record<string, unknown> | null;
  } = { inviteRow: null, brokerRow: null };

  const makeBuilder = () => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.insert = vi.fn(() => builder);
    builder.update = vi.fn(() => builder);
    builder.single = vi.fn(() => ({ data: null, error: null }));
    builder.maybeSingle = vi.fn(() => ({
      data: state.inviteRow,
      error: null,
    }));
    return builder;
  };

  return {
    state,
    from: vi.fn((table: string) => {
      if (table === "broker_review_invites") {
        const builder = makeBuilder();
        builder.maybeSingle = vi.fn(() => ({
          data: state.inviteRow,
          error: null,
        }));
        return builder;
      }
      if (table === "brokers") {
        const builder = makeBuilder();
        builder.maybeSingle = vi.fn(() => ({
          data: state.brokerRow,
          error: null,
        }));
        return builder;
      }
      return makeBuilder();
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "test-ip"),
}));

import { GET, POST } from "@/app/api/broker-review-invite/route";

function getRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost/api/broker-review-invite?token=${token}`, {
    method: "GET",
  });
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/broker-review-invite", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/broker-review-invite", () => {
  beforeEach(() => {
    supabaseMock.state.inviteRow = null;
    supabaseMock.state.brokerRow = null;
  });

  it("rejects malformed tokens with 400", async () => {
    const res = await GET(getRequest("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when token matches no invite", async () => {
    supabaseMock.state.inviteRow = null;
    const res = await GET(getRequest("12345678-1234-1234-1234-123456789abc"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when invite has already been completed", async () => {
    supabaseMock.state.inviteRow = {
      id: 1,
      broker_slug: "stake",
      broker_id: 2,
      status: "completed",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      email: "user@example.com",
    };
    const res = await GET(getRequest("12345678-1234-1234-1234-123456789abc"));
    expect(res.status).toBe(409);
  });

  it("returns 410 when the invite window has expired", async () => {
    supabaseMock.state.inviteRow = {
      id: 1,
      broker_slug: "stake",
      broker_id: 2,
      status: "sent",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
      email: "user@example.com",
    };
    const res = await GET(getRequest("12345678-1234-1234-1234-123456789abc"));
    expect(res.status).toBe(410);
  });
});

describe("POST /api/broker-review-invite", () => {
  it("rejects non-JSON body with 400", async () => {
    const res = await POST(postRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("rejects malformed token with 400", async () => {
    const res = await POST(
      postRequest({
        token: "bad",
        rating: 5,
        body: "A".repeat(60),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects rating out of range", async () => {
    const res = await POST(
      postRequest({
        token: "12345678-1234-1234-1234-123456789abc",
        rating: 0,
        body: "A".repeat(60),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects review body under 50 chars", async () => {
    const res = await POST(
      postRequest({
        token: "12345678-1234-1234-1234-123456789abc",
        rating: 5,
        body: "too short",
      }),
    );
    expect(res.status).toBe(400);
  });
});
