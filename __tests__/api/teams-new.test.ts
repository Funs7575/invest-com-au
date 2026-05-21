import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true),
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

vi.mock("@/lib/squad-creation", () => ({
  classifyInvitee: vi.fn(async () => ({ kind: "new" })),
  dedupeSquadSlug: vi.fn(async () => "test-squad"),
  expertTeamSlugTaken: vi.fn(async () => false),
  lookupProfessionalByEmail: vi.fn(async () => null),
  SQUAD_MEMBER_ROLES: ["lead", "member", "observer"],
}));

vi.mock("@/lib/squad-creation-emails", () => ({
  sendSquadCreatedConfirmation: vi.fn(async () => undefined),
  sendSquadInvitePending: vi.fn(async () => undefined),
  sendSquadMemberInvite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/api-schemas", () => ({
  TEAM_CATEGORIES: ["financial_planning", "mortgage_broking", "accounting"],
}));

vi.mock("@/lib/briefs/templates", () => ({
  BRIEF_TEMPLATES: ["general_advice", "retirement_planning", "investment_review"],
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: vi.fn(
    (_schema: unknown, handler: (req: NextRequest, body: unknown) => unknown) =>
      async (req: NextRequest) => {
        try {
          const raw = await req.json();
          return handler(req, raw);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }
      },
  ),
}));

import { POST } from "@/app/api/teams/new/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/new", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const validBody = {
  name: "My Test Squad",
  team_category: "financial_planning",
  accepted_brief_templates: ["general_advice"],
  invites: [],
};

describe("/api/teams/new", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    // Default: active verified professional
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({
          data: { id: 42, name: "Test Advisor", email: "advisor@example.com", status: "active", verification_status: "verified" },
          error: null,
        });
      }
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1, slug: "test-squad", name: "My Test Squad" }, error: null });
      }
      if (table === "expert_team_members") {
        return makeBuilder({ data: {}, error: null });
      }
      return makeBuilder();
    });
  });

  it("rejects unauthenticated (no advisor session)", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 403 when advisor is not verified/active", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: { id: 42, name: "Advisor", email: "a@b.com", status: "pending", verification_status: "pending" }, error: null });
      }
      return makeBuilder();
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 403 when advisor not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: null, error: null });
      }
      return makeBuilder();
    });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(403);
  });
});
