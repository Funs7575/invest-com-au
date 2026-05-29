import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── withValidatedBody real Zod mock ───────────────────────────────────────────

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody:
    (
      schema: {
        safeParse: (v: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      },
      handler: (req: NextRequest, body: unknown, ctx?: unknown) => unknown,
    ) =>
    async (req: NextRequest, ctx?: unknown) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400 },
        );
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error!.issues as Array<{
          path?: string[];
          message?: string;
        }>;
        const first = issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first?.message ?? "Invalid request body";
        return new Response(
          JSON.stringify({
            error: path ? `${path}: ${message}` : message,
            code: "validation_error",
            issues,
          }),
          { status: 400 },
        );
      }
      return handler(req, parsed.data, ctx);
    },
}));

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import {
  PATCH as _PATCH,
  DELETE,
} from "@/app/api/advisor-auth/case-studies/[caseStudyId]/route";
import { isRateLimited } from "@/lib/rate-limit";

// The real withValidatedBody returns (req) => ... but the inner handler accepts
// context as a third arg passed through Next.js. Our mock forwards ctx, so we
// cast to the two-arg form for tests.
type PatchFn = (req: NextRequest, ctx: RouteContext) => Promise<Response>;
const PATCH = _PATCH as unknown as PatchFn;

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 22;
const CASE_STUDY_ID = 4;

type RouteContext = { params: Promise<{ caseStudyId: string }> };

function makeContext(id: string = String(CASE_STUDY_ID)): RouteContext {
  return { params: Promise.resolve({ caseStudyId: id }) };
}

function makePatch(body: unknown, caseStudyId: string = String(CASE_STUDY_ID)): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/case-studies/${caseStudyId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    },
  );
}

function makeDeleteReq(caseStudyId: string = String(CASE_STUDY_ID)): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/case-studies/${caseStudyId}`,
    { method: "DELETE", headers: { "x-forwarded-for": "1.2.3.4" } },
  );
}

const existingRow = { id: CASE_STUDY_ID };

const mockCaseStudy = {
  id: CASE_STUDY_ID,
  title: "How we saved $50k in taxes",
  situation: "Client had a complex tax situation from multiple income sources.",
  approach: "We restructured their portfolio using a trust structure.",
  outcome: "Client saved $50,000 annually in tax.",
  client_type: "individual",
  outcome_type: "tax_saving",
  status: "draft",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const validPatchBody = {
  title: "Updated Case Study Title Here",
  status: "published",
};

// ── Tests: PATCH ──────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/case-studies/[caseStudyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // ownership check
        const b = makeBuilder(existingRow, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: existingRow, error: null });
        return b;
      }
      // update query
      const b = makeBuilder(mockCaseStudy, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockCaseStudy, error: null });
      return b;
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makePatch(validPatchBody), makeContext());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PATCH(makePatch(validPatchBody), makeContext());
    expect(res.status).toBe(429);
  });

  it("returns 400 when title is too short (under 5 chars)", async () => {
    const res = await PATCH(makePatch({ title: "Hi" }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 400 when client_type is invalid", async () => {
    const res = await PATCH(makePatch({ client_type: "corporation" }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 400 when outcome_type is invalid", async () => {
    const res = await PATCH(makePatch({ outcome_type: "lottery_win" }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    const res = await PATCH(makePatch({ status: "archived" }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 400 when caseStudyId is not a number", async () => {
    const res = await PATCH(makePatch(validPatchBody, "abc"), makeContext("abc"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid case study ID/i);
  });

  it("returns 404 when case study not found or not owned", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody), makeContext());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Case study not found/i);
  });

  it("updates case study and returns 200 with caseStudy data", async () => {
    const res = await PATCH(makePatch(validPatchBody), makeContext());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.caseStudy).toBeDefined();
  });

  it("allows updating all valid optional fields at once", async () => {
    const fullPatch = {
      title: "Complete Case Study Update",
      situation: "The client faced significant financial challenges over two decades.",
      approach: "We took a holistic approach to restructure their entire portfolio.",
      outcome: "Client achieved financial independence five years early.",
      client_type: "family",
      outcome_type: "retirement_planning",
      status: "published",
    };
    const res = await PATCH(makePatch(fullPatch), makeContext());
    expect(res.status).toBe(200);
  });

  it("returns 500 when DB update fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(existingRow, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: existingRow, error: null });
        return b;
      }
      const b = makeBuilder(null, { message: "update failed" });
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "update failed" },
      });
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody), makeContext());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to update case study/i);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/case-studies/[caseStudyId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(existingRow, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: existingRow, error: null });
        return b;
      }
      return makeBuilder(null, null);
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(makeDeleteReq(), makeContext());
    expect(res.status).toBe(429);
  });

  it("returns 400 when caseStudyId is not a number", async () => {
    const res = await DELETE(makeDeleteReq("nope"), makeContext("nope"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid case study ID/i);
  });

  it("returns 404 when case study not found or not owned", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await DELETE(makeDeleteReq(), makeContext());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Case study not found/i);
  });

  it("soft-deletes case study (sets status=draft) and returns success", async () => {
    const res = await DELETE(makeDeleteReq(), makeContext());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(existingRow, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: existingRow, error: null });
        return b;
      }
      return makeBuilder(null, { message: "delete failed" });
    });
    const res = await DELETE(makeDeleteReq(), makeContext());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete case study/i);
  });
});
