/**
 * Tests for app/api/advisor-portal/push-subscription/route.ts
 *
 * Covers auth + Zod validation across GET / POST / PATCH / DELETE:
 *   - 429 rate-limited
 *   - 401 unauthenticated (no advisor session)
 *   - 400 invalid JSON / invalid body (unknown pref key, missing keys)
 *   - happy-path writes scoped to the authed advisor's professional_id
 *   - GET reflects the advisor_push flag (feature dark ⇒ enabled:false)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockIsFlagEnabled: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

const { mockUpsert, mockUpdateEq2, mockDeleteEq3, mockSelectMaybeSingle } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockUpdateEq2: vi.fn(),
  mockDeleteEq3: vi.fn(),
  mockSelectMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      // POST → upsert(...)
      upsert: mockUpsert,
      // PATCH → update(...).eq().eq()
      update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: mockUpdateEq2 })) })),
      // DELETE → delete().eq().eq().eq()
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: mockDeleteEq3 })) })),
      })),
      // GET → select().eq().eq().order().limit().maybeSingle()
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({ maybeSingle: mockSelectMaybeSingle })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/advisor-portal/push-subscription/route";

const SUB = {
  subscription: {
    endpoint: "https://push.example.com/abc",
    keys: { p256dh: "p256", auth: "auth" },
  },
};

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/push-subscription", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockRequireAdvisorSession.mockResolvedValue(42);
  mockIsFlagEnabled.mockResolvedValue(true);
  mockUpsert.mockResolvedValue({ error: null });
  mockUpdateEq2.mockResolvedValue({ error: null });
  mockDeleteEq3.mockResolvedValue({ error: null });
  mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/advisor-portal/push-subscription", () => {
  it("429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    expect((await POST(req("POST", SUB))).status).toBe(429);
  });

  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    expect((await POST(req("POST", SUB))).status).toBe(401);
  });

  it("400 on invalid JSON", async () => {
    expect((await POST(req("POST", "not-json"))).status).toBe(400);
  });

  it("400 when the subscription object is missing keys", async () => {
    const res = await POST(req("POST", { subscription: { endpoint: "x" } }));
    expect(res.status).toBe(400);
  });

  it("400 when preferences carry an unknown key (strict)", async () => {
    const res = await POST(req("POST", { ...SUB, preferences: { bogus: true } }));
    expect(res.status).toBe(400);
  });

  it("upserts scoped to the advisor with owner_kind='advisor' and prefs", async () => {
    const res = await POST(req("POST", { ...SUB, preferences: { new_brief: false } }));
    expect(res.status).toBe(200);
    const [payload, opts] = mockUpsert.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(payload).toMatchObject({
      endpoint: SUB.subscription.endpoint,
      owner_kind: "advisor",
      professional_id: 42,
      user_id: null,
      notification_prefs: { new_brief: false },
    });
    expect(opts).toMatchObject({ onConflict: "endpoint" });
  });

  it("500 when the upsert errors", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "boom" } });
    expect((await POST(req("POST", SUB))).status).toBe(500);
  });
});

describe("PATCH /api/advisor-portal/push-subscription", () => {
  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    expect((await PATCH(req("PATCH", { preferences: { new_brief: true } }))).status).toBe(401);
  });

  it("400 when preferences is missing", async () => {
    expect((await PATCH(req("PATCH", {}))).status).toBe(400);
  });

  it("updates preferences and returns ok", async () => {
    const res = await PATCH(req("PATCH", { preferences: { sla_warning: false } }));
    expect(res.status).toBe(200);
    expect(mockUpdateEq2).toHaveBeenCalled();
  });

  it("500 when the update errors", async () => {
    mockUpdateEq2.mockResolvedValue({ error: { message: "boom" } });
    expect((await PATCH(req("PATCH", { preferences: { new_brief: true } }))).status).toBe(500);
  });
});

describe("DELETE /api/advisor-portal/push-subscription", () => {
  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    expect((await DELETE(req("DELETE", { endpoint: "x" }))).status).toBe(401);
  });

  it("400 when endpoint is missing", async () => {
    expect((await DELETE(req("DELETE", {}))).status).toBe(400);
  });

  it("deletes the endpoint scoped to the advisor", async () => {
    const res = await DELETE(req("DELETE", { endpoint: SUB.subscription.endpoint }));
    expect(res.status).toBe(200);
    expect(mockDeleteEq3).toHaveBeenCalled();
  });
});

describe("GET /api/advisor-portal/push-subscription", () => {
  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    expect((await GET(req("GET"))).status).toBe(401);
  });

  it("returns enabled:false when the advisor_push flag is off (feature dark)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET(req("GET"));
    const json = await res.json();
    expect(json.enabled).toBe(false);
    expect(json.subscribed).toBe(false);
  });

  it("returns enabled:true + subscribed:false with default prefs when no row exists", async () => {
    const res = await GET(req("GET"));
    const json = await res.json();
    expect(json.enabled).toBe(true);
    expect(json.subscribed).toBe(false);
    expect(json.preferences).toMatchObject({
      new_brief: true,
      new_message: true,
      dispute: true,
      sla_warning: true,
    });
  });

  it("merges saved prefs over defaults when a row exists", async () => {
    mockSelectMaybeSingle.mockResolvedValue({
      data: { notification_prefs: { sla_warning: false } },
      error: null,
    });
    const res = await GET(req("GET"));
    const json = await res.json();
    expect(json.subscribed).toBe(true);
    expect(json.preferences.sla_warning).toBe(false);
    expect(json.preferences.new_brief).toBe(true);
  });
});
