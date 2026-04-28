import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/form-event/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const VALID_BODY = {
  session_id: "sess-abc",
  form_name: "quiz",
  step: "step_1",
  event: "view",
};

function makePost(rawBody: string | unknown, ip = "1.2.3.4"): NextRequest {
  const body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  return new NextRequest("http://localhost/api/form-event", {
    method: "POST",
    headers: { "Content-Type": "text/plain", "x-forwarded-for": ip },
    body,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/form-event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeChain({ error: null }));
  });

  // ── Parsing ───────────────────────────────────────────────────────────────

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST(makePost("not-json{{"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when session_id is missing", async () => {
    const { session_id: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when form_name is missing", async () => {
    const { form_name: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when step is missing", async () => {
    const { step: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when event is missing", async () => {
    const { event: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when form_name is not in allowlist", async () => {
    const res = await POST(makePost({ ...VALID_BODY, form_name: "unknown_form" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown form/i);
  });

  it("returns 400 when event is not in allowlist", async () => {
    const res = await POST(makePost({ ...VALID_BODY, event: "hover" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown event/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  // ── Allowed form_name values ──────────────────────────────────────────────

  it.each(["quiz", "advisor_enquiry", "advisor_signup", "advisor_apply", "broker_apply", "lead_form"])(
    "accepts form_name='%s'",
    async (form_name) => {
      const res = await POST(makePost({ ...VALID_BODY, form_name }));
      expect(res.status).toBe(200);
    },
  );

  // ── Allowed event values ──────────────────────────────────────────────────

  it.each(["view", "interact", "complete", "abandon"])(
    "accepts event='%s'",
    async (event) => {
      const res = await POST(makePost({ ...VALID_BODY, event }));
      expect(res.status).toBe(200);
    },
  );

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with ok=true on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("inserts required fields into form_events", async () => {
    await POST(makePost(VALID_BODY));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.session_id).toBe("sess-abc");
    expect(row.form_name).toBe("quiz");
    expect(row.step).toBe("step_1");
    expect(row.event).toBe("view");
  });

  it("passes through optional user_key when present", async () => {
    await POST(makePost({ ...VALID_BODY, user_key: "user-xyz" }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.user_key).toBe("user-xyz");
  });

  it("sets user_key to null when absent", async () => {
    await POST(makePost(VALID_BODY));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.user_key).toBeNull();
  });

  it("passes through optional step_index when a number", async () => {
    await POST(makePost({ ...VALID_BODY, step_index: 3 }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.step_index).toBe(3);
  });

  it("passes through optional meta object", async () => {
    await POST(makePost({ ...VALID_BODY, meta: { source: "organic" } }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((row.meta as Record<string, unknown>).source).toBe("organic");
  });

  it("sets meta to null when not an object", async () => {
    await POST(makePost({ ...VALID_BODY, meta: "not-object" }));
    const chain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const row = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.meta).toBeNull();
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ error: { message: "connection refused" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert_failed");
  });
});
