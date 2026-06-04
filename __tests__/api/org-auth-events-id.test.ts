import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ───────────────────────────────────────────────────────

const { mockIsRateLimited, mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<() => Promise<boolean>>(async () => false),
  mockRequireOrgSession: vi.fn<
    () => Promise<{ organisationId: number; email: string; role?: string }>
  >(async () => ({ organisationId: 1, email: "org@example.com" })),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: mockRequireOrgSession,
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (_schema: unknown, handler: (req: NextRequest, body: unknown) => unknown) =>
    async (req: NextRequest) => {
      const body = await req.json().catch(() => ({}));
      return handler(req, body);
    },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new Request(url, {
    method,
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const EVENT_URL = "http://localhost/api/org-auth/events/99";

// ── Route under test (imported after all mocks) ─────────────────────────────

import { PATCH, DELETE } from "@/app/api/org-auth/events/[eventId]/route";

// ── PATCH ───────────────────────────────────────────────────────────────────

describe("PATCH /api/org-auth/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue({ organisationId: 1, email: "org@example.com" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(429);
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric eventId", async () => {
    const req = makeReq("PATCH", "http://localhost/api/org-auth/events/abc", { title: "Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid event id/i);
  });

  it("returns 404 when event not found or not owned", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 when updating a cancelled event", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 99, status: "cancelled", organisation_id: 1 }, error: null }),
    );
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/cancelled/i);
  });

  it("returns 400 for invalid status transition (draft → completed)", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null }),
    );
    const req = makeReq("PATCH", EVENT_URL, { status: "completed" });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/cannot transition/i);
  });

  it("returns 500 when update query fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: null, error: { message: "db error" } });
    });
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });

  it("returns 200 with updated event on success", async () => {
    const updatedEvent = { id: 99, title: "New Title", status: "draft" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: updatedEvent, error: null });
    });
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("event");
    expect(json.event.title).toBe("New Title");
  });

  it("allows valid draft → published transition", async () => {
    const updatedEvent = { id: 99, title: "My Event", status: "published" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: updatedEvent, error: null });
    });
    const req = makeReq("PATCH", EVENT_URL, { status: "published" });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event.status).toBe("published");
  });

  it("returns 403 when the session role is viewer", async () => {
    mockRequireOrgSession.mockResolvedValue({
      organisationId: 1,
      email: "viewer@example.com",
      role: "viewer",
    });
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/forbidden/i);
    // Guard must short-circuit before any DB access
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it.each(["editor", "admin"])("allows a %s to edit an event", async (role) => {
    mockRequireOrgSession.mockResolvedValue({
      organisationId: 1,
      email: `${role}@example.com`,
      role,
    });
    const updatedEvent = { id: 99, title: "New Title", status: "draft" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: updatedEvent, error: null });
    });
    const req = makeReq("PATCH", EVENT_URL, { title: "New Title" });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
  });
});

// ── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/org-auth/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue({ organisationId: 1, email: "org@example.com" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(429);
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric eventId", async () => {
    const req = makeReq("DELETE", "http://localhost/api/org-auth/events/abc");
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when event not found or not owned", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when event is not in draft status", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 99, status: "published", organisation_id: 1 }, error: null }),
    );
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/only draft/i);
  });

  it("returns 500 when delete query fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: null, error: { message: "db error" } });
    });
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(500);
  });

  it("returns 200 with success on successful deletion", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: null, error: null });
    });
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 403 when the session role is viewer", async () => {
    mockRequireOrgSession.mockResolvedValue({
      organisationId: 1,
      email: "viewer@example.com",
      role: "viewer",
    });
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/forbidden/i);
    // Guard must short-circuit before any DB access
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it.each(["editor", "admin"])("allows a %s to delete a draft event", async (role) => {
    mockRequireOrgSession.mockResolvedValue({
      organisationId: 1,
      email: `${role}@example.com`,
      role,
    });
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1)
        return makeChain({ data: { id: 99, status: "draft", organisation_id: 1 }, error: null });
      return makeChain({ data: null, error: null });
    });
    const req = makeReq("DELETE", EVENT_URL);
    const res = await DELETE(req, { params: Promise.resolve({ eventId: "99" }) });
    expect(res.status).toBe(200);
  });
});
