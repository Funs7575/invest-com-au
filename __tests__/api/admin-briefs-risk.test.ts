/**
 * Tests for POST /api/admin/briefs/[id]/risk.
 *
 * Admin-gated risk-review action (approve | reject) on a brief. The route
 * updates `advisor_auctions`, inserts a `brief_tracker_events` row, and
 * fires fire-and-forget notification helpers. We mock requireAdmin, the
 * admin Supabase client, and every notification dependency so we can assert
 * on auth gating, body validation, and the persisted state change.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("@/lib/briefs/routing", () => ({
  resolveEligibleProviders: vi.fn(async () => []),
}));
vi.mock("@/lib/marketplace-emails", () => ({
  sendProviderNewMatchRequest: vi.fn(async () => true),
}));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => true) }));
vi.mock("@/lib/seo", () => ({ SITE_URL: "https://invest.com.au" }));
vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotificationByEmail: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/admin/briefs/[id]/risk/route";

const ADMIN_OK = {
  ok: true as const,
  email: "admin@invest.com.au",
  userId: "user-1",
};

function denyGuard(status: number) {
  return {
    ok: false as const,
    response: new Response(JSON.stringify({ error: "denied" }), { status }),
  };
}

function makeReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/briefs/${id}/risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  // Default chainable builder: update().eq().select().maybeSingle() resolves
  // to a brief row; insert() resolves ok.
  mockAdminFrom.mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.update = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.select = vi.fn(chain);
    builder.maybeSingle = vi.fn(async () => ({
      data: { id: 7, contact_email: null, slug: "s", job_title: "Job" },
      error: null,
    }));
    builder.insert = vi.fn(async () => ({ data: null, error: null }));
    return builder;
  });
});

describe("POST /api/admin/briefs/[id]/risk", () => {
  it("propagates 401 when admin guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("7", { action: "approve" }), ctx("7"));
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("propagates 403 when admin guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("7", { action: "approve" }), ctx("7"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for a non-numeric brief id", async () => {
    const res = await POST(makeReq("abc", { action: "approve" }), ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/admin/briefs/7/risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req, ctx("7"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the action is not approve/reject", async () => {
    const res = await POST(makeReq("7", { action: "frobnicate" }), ctx("7"));
    expect(res.status).toBe(400);
  });

  it("approves: writes approved status and tracker event", async () => {
    const updateSpy = vi.fn();
    const insertSpy = vi.fn();
    mockAdminFrom.mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.update = vi.fn((u: unknown) => {
        updateSpy(table, u);
        return builder;
      });
      builder.eq = vi.fn(chain);
      builder.select = vi.fn(chain);
      builder.maybeSingle = vi.fn(async () => ({
        data: { id: 7, contact_email: null, slug: "s", job_title: "Job" },
        error: null,
      }));
      builder.insert = vi.fn(async (row: unknown) => {
        insertSpy(table, row);
        return { data: null, error: null };
      });
      return builder;
    });

    const res = await POST(makeReq("7", { action: "approve" }), ctx("7"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });

    expect(updateSpy).toHaveBeenCalledWith(
      "advisor_auctions",
      expect.objectContaining({ risk_review_status: "approved" }),
    );
    expect(insertSpy).toHaveBeenCalledWith(
      "brief_tracker_events",
      expect.objectContaining({ event_type: "risk_approved", actor_kind: "admin" }),
    );
  });

  it("rejects: writes rejected status and closes the brief", async () => {
    const updateSpy = vi.fn();
    mockAdminFrom.mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.update = vi.fn((u: unknown) => {
        updateSpy(table, u);
        return builder;
      });
      builder.eq = vi.fn(chain);
      builder.select = vi.fn(chain);
      builder.maybeSingle = vi.fn(async () => ({
        data: { id: 7, contact_email: null, slug: "s", job_title: "Job" },
        error: null,
      }));
      builder.insert = vi.fn(async () => ({ data: null, error: null }));
      return builder;
    });

    const res = await POST(
      makeReq("7", { action: "reject", note: "scam" }),
      ctx("7"),
    );
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      "advisor_auctions",
      expect.objectContaining({
        risk_review_status: "rejected",
        status: "closed",
        risk_review_decision_reason: "scam",
      }),
    );
  });
});
