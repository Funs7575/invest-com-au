import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn(async () => 42);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockIsAllowed = vi.fn(async () => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockListEndpoints = vi.fn(async () => []);
const mockCreateEndpoint = vi.fn(async () => ({
  endpoint: {
    id: 1,
    url: "https://example.com/webhook",
    event_subscriptions: ["brief.accepted"],
    enabled: true,
  },
  signingSecret: "whsec_test123",
}));
const mockDisableEndpoint = vi.fn(async () => {});

vi.mock("@/lib/outbound-webhooks", () => ({
  listEndpoints: (...args: unknown[]) => mockListEndpoints(...args),
  createEndpoint: (...args: unknown[]) => mockCreateEndpoint(...args),
  disableEndpoint: (...args: unknown[]) => mockDisableEndpoint(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET, POST, DELETE } from "@/app/api/advisor-portal/webhooks/route";

function makeReq(method = "GET", body?: unknown, searchParams = ""): NextRequest {
  const url = `http://localhost/api/advisor-portal/webhooks${searchParams ? `?${searchParams}` : ""}`;
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const validPostBody = {
  url: "https://example.com/webhook",
  eventSubscriptions: ["brief.accepted"],
};

describe("/api/advisor-portal/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockIsAllowed.mockResolvedValue(true);
    mockListEndpoints.mockResolvedValue([]);
    mockCreateEndpoint.mockResolvedValue({
      endpoint: {
        id: 1,
        url: "https://example.com/webhook",
        event_subscriptions: ["brief.accepted"],
        enabled: true,
      },
      signingSecret: "whsec_test123",
    });
    mockDisableEndpoint.mockResolvedValue(undefined);
    mockFrom.mockImplementation(() => makeBuilder({ data: { id: 1 }, error: null }));
  });

  // ── GET ──────────────────────────────────────────────────────────────────
  it("GET rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns endpoints list", async () => {
    const endpoints = [
      { id: 1, url: "https://ex.com/wh", enabled: true, event_subscriptions: ["brief.accepted"], signing_secret: "s" },
    ];
    mockListEndpoints.mockResolvedValue(endpoints);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("endpoints");
    expect(json).toHaveProperty("allowedEvents");
    // Signing secret must not be in response
    expect(JSON.stringify(json)).not.toContain("signing_secret");
  });

  // ── POST ─────────────────────────────────────────────────────────────────
  it("POST returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("POST", validPostBody));
    expect(res.status).toBe(429);
  });

  it("POST rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq("POST", validPostBody));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid URL", async () => {
    const res = await POST(makeReq("POST", { url: "not-a-url", eventSubscriptions: ["brief.accepted"] }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for unsupported event type", async () => {
    const res = await POST(makeReq("POST", { url: "https://ex.com/wh", eventSubscriptions: ["unsupported.event"] }));
    expect(res.status).toBe(400);
  });

  it("POST creates endpoint successfully", async () => {
    const res = await POST(makeReq("POST", validPostBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("endpoint");
    expect(json).toHaveProperty("signingSecret");
  });

  // ── DELETE ───────────────────────────────────────────────────────────────
  it("DELETE rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE", undefined, "id=1"));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 404 when endpoint not owned by advisor", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await DELETE(makeReq("DELETE", undefined, "id=1"));
    expect(res.status).toBe(404);
  });

  it("DELETE disables endpoint successfully", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: { id: 1 }, error: null }));
    const res = await DELETE(makeReq("DELETE", undefined, "id=1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
