import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: () => mockGetUser() } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(() => false) }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { isRateLimited } from "@/lib/rate-limit";

function makeReq(method = "GET", body?: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/advisor-portal/marketplace-settings", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeProChain(pro: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: pro }),
  };
}

function makeUpdateChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  };
}

describe("GET /api/advisor-portal/marketplace-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "adv@example.com" } } });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when advisor not found", async () => {
    mockAdminFrom.mockReturnValue(makeProChain(null));
    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns current settings", async () => {
    const pro = {
      id: 1,
      accepts_new_clients: false,
      bid_templates: [{ id: "t1", label: "My template", body: "Hello, I am..." }],
      alert_preferences: { advisor_types: ["financial_planner"], states: ["NSW"], budget_bands: ["5k_10k"] },
    };
    mockAdminFrom.mockReturnValue(makeProChain(pro));

    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.accepts_new_clients).toBe(false);
    expect(body.bid_templates).toHaveLength(1);
    expect(body.alert_preferences).toEqual({ advisor_types: ["financial_planner"], states: ["NSW"], budget_bands: ["5k_10k"] });
  });

  it("returns defaults when DB fields are null", async () => {
    const pro = { id: 1, accepts_new_clients: null, bid_templates: null, alert_preferences: null };
    mockAdminFrom.mockReturnValue(makeProChain(pro));

    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.accepts_new_clients).toBe(true);
    expect(body.bid_templates).toEqual([]);
    expect(body.alert_preferences).toEqual({ advisor_types: [], states: [], budget_bands: [] });
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("crash"); });
    const { GET } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/advisor-portal/marketplace-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "adv@example.com" } } });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { accepts_new_clients: true }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { accepts_new_clients: true }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const pro = { id: 1, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    mockAdminFrom.mockReturnValue(makeProChain(pro));
    const req = new NextRequest("http://localhost/api/advisor-portal/marketplace-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when nothing to update (empty body)", async () => {
    const pro = { id: 1, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    mockAdminFrom.mockReturnValue(makeProChain(pro));
    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", {}));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/nothing to update/i);
  });

  it("updates accepts_new_clients successfully", async () => {
    const pro = { id: 5, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    const proChain = makeProChain(pro);
    const updateChain = makeUpdateChain(null);
    mockAdminFrom
      .mockReturnValueOnce(proChain)
      .mockReturnValueOnce(updateChain);

    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { accepts_new_clients: false }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith({ accepts_new_clients: false });
  });

  it("rejects bid_templates with >5 items", async () => {
    const pro = { id: 1, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    mockAdminFrom.mockReturnValue(makeProChain(pro));
    const templates = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, label: `T${i}`, body: "body" }));

    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { bid_templates: templates }));
    expect(res.status).toBe(400);
  });

  it("updates valid alert_preferences", async () => {
    const pro = { id: 5, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    const proChain = makeProChain(pro);
    const updateChain = makeUpdateChain(null);
    mockAdminFrom
      .mockReturnValueOnce(proChain)
      .mockReturnValueOnce(updateChain);

    const prefs = { advisor_types: ["financial_planner", "tax_agent"] as const, states: ["NSW", "VIC"] as const, budget_bands: ["5k_10k"] as const };
    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { alert_preferences: prefs }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("rejects invalid advisor_type in alert_preferences", async () => {
    const pro = { id: 1, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    mockAdminFrom.mockReturnValue(makeProChain(pro));

    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { alert_preferences: { advisor_types: ["invalid_type"], states: [], budget_bands: [] } }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB update error", async () => {
    const pro = { id: 5, accepts_new_clients: true, bid_templates: [], alert_preferences: null };
    const proChain = makeProChain(pro);
    const updateChain = makeUpdateChain({ message: "update failed" });
    mockAdminFrom
      .mockReturnValueOnce(proChain)
      .mockReturnValueOnce(updateChain);

    const { PATCH } = await import("@/app/api/advisor-portal/marketplace-settings/route");
    const res = await PATCH(makeReq("PATCH", { accepts_new_clients: false }));
    expect(res.status).toBe(500);
  });
});
