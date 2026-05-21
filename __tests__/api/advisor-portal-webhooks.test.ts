import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsAllowed = vi.fn();
const mockRequireAdvisorSession = vi.fn();
const mockListEndpoints = vi.fn();
const mockCreateEndpoint = vi.fn();
const mockDisableEndpoint = vi.fn();
const mockAdminMaybeSingle = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/outbound-webhooks", () => ({
  listEndpoints: (...args: unknown[]) => mockListEndpoints(...args),
  createEndpoint: (...args: unknown[]) => mockCreateEndpoint(...args),
  disableEndpoint: (...args: unknown[]) => mockDisableEndpoint(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => mockAdminMaybeSingle());
    return chain;
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, DELETE, ALLOWED_EVENTS } from "@/app/api/advisor-portal/webhooks/route";

function makeReq(method: string, body?: unknown, url = "http://localhost/api/advisor-portal/webhooks"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function makeRawReq(method: string, raw: string): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/webhooks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
}

describe("GET /api/advisor-portal/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("lists endpoints without exposing the signing secret", async () => {
    mockListEndpoints.mockResolvedValueOnce([
      {
        id: 1,
        url: "https://hook.example/x",
        enabled: true,
        event_subscriptions: ["brief.accepted"],
        signing_secret: "shh-secret",
      },
    ]);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.endpoints[0]).toEqual({
      id: 1,
      url: "https://hook.example/x",
      enabled: true,
      event_subscriptions: ["brief.accepted"],
    });
    expect(JSON.stringify(body)).not.toContain("shh-secret");
    expect(body.allowedEvents).toEqual(ALLOWED_EVENTS);
    expect(mockListEndpoints).toHaveBeenCalledWith("professional", "42");
  });
});

describe("POST /api/advisor-portal/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq("POST", { url: "https://x.example", eventSubscriptions: ["brief.accepted"] }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq("POST", { url: "https://x.example", eventSubscriptions: ["brief.accepted"] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeRawReq("POST", "{bad"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 for a zod-invalid body (bad url)", async () => {
    const res = await POST(makeReq("POST", { url: "not-a-url", eventSubscriptions: ["brief.accepted"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no events survive the allow-list filter", async () => {
    const res = await POST(makeReq("POST", { url: "https://x.example", eventSubscriptions: ["bogus.event"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("No supported events");
    expect(mockCreateEndpoint).not.toHaveBeenCalled();
  });

  it("happy path — creates an endpoint and returns the signing secret once", async () => {
    mockCreateEndpoint.mockResolvedValueOnce({
      endpoint: {
        id: 9,
        url: "https://x.example",
        event_subscriptions: ["brief.accepted"],
        enabled: true,
      },
      signingSecret: "whsec_abc",
    });
    const res = await POST(
      makeReq("POST", { url: "https://x.example", eventSubscriptions: ["brief.accepted", "bogus.event"] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signingSecret).toBe("whsec_abc");
    expect(body.endpoint.id).toBe(9);
    // bogus.event filtered out before reaching createEndpoint
    expect(mockCreateEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerKind: "professional",
        ownerId: "42",
        eventSubscriptions: ["brief.accepted"],
      }),
    );
  });

  it("returns 500 when createEndpoint throws", async () => {
    mockCreateEndpoint.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeReq("POST", { url: "https://x.example", eventSubscriptions: ["brief.accepted"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to create endpoint." });
  });
});

describe("DELETE /api/advisor-portal/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq("DELETE", undefined, "http://localhost/api/advisor-portal/webhooks?id=1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when the id is missing or invalid", async () => {
    const res = await DELETE(makeReq("DELETE", undefined, "http://localhost/api/advisor-portal/webhooks"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing or invalid id." });
  });

  it("returns 404 when the endpoint is not owned by the caller", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await DELETE(makeReq("DELETE", undefined, "http://localhost/api/advisor-portal/webhooks?id=5"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Endpoint not found." });
    expect(mockDisableEndpoint).not.toHaveBeenCalled();
  });

  it("happy path — disables an owned endpoint", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: { id: 5 } });
    const res = await DELETE(makeReq("DELETE", undefined, "http://localhost/api/advisor-portal/webhooks?id=5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockDisableEndpoint).toHaveBeenCalledWith(5);
  });
});
