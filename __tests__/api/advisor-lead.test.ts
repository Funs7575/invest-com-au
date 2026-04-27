import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/posthog/server", () => ({
  captureServerEvent: vi.fn(() => Promise.resolve()),
}));

import { POST } from "@/app/api/advisor-lead/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID = {
  name: "Alice Lead",
  phone: "0411567890",
  email: "alice@test.com",
  advisor_type: "financial-planner",
  quiz_answers: { goal: "retirement", horizon: "10y" },
  consent: true,
};

function buildRequest(body: Record<string, unknown>, ip = "8.8.8.8") {
  return makeRequest("/api/advisor-lead", body, { ip });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockFrom.mockReset();
    mockFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  // ── Validation ──

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/advisor-lead", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
  });

  it("returns 400 when name is missing", async () => {
    const req = buildRequest({ ...VALID, name: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short", async () => {
    const req = buildRequest({ ...VALID, name: "X" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid AU phone (non-international)", async () => {
    const req = buildRequest({ ...VALID, phone: "123" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("accepts non-AU phone when is_international=true", async () => {
    const req = buildRequest({
      ...VALID,
      is_international: true,
      phone: "+1 415 555 0100",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 for too-short phone when is_international=true", async () => {
    const req = buildRequest({
      ...VALID,
      is_international: true,
      phone: "12",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const req = buildRequest({ ...VALID, email: "not-email" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when consent is missing", async () => {
    const req = buildRequest({ ...VALID, consent: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Consent is required");
  });

  // ── Rate limit ──

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = buildRequest(VALID);
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── Happy paths ──

  it("inserts an advisor lead with quiz_answers and returns success", async () => {
    const req = buildRequest(VALID);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const captureCalls = supabaseCalls.email_captures || [];
    const insertCall = captureCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.email).toBe("alice@test.com");
    expect(args.source).toBe("advisor-lead");
    const ctx = args.context as Record<string, unknown>;
    expect(ctx.advisor_type).toBe("financial-planner");
    expect(ctx.is_international).toBe(false);
    expect(ctx.quiz_answers).toEqual({ goal: "retirement", horizon: "10y" });
  });

  it("tags lead as international with extra context fields", async () => {
    const req = buildRequest({
      ...VALID,
      is_international: true,
      phone: "+1 415 555 0100",
      investor_country: "USA",
      visa_status: "permanent_resident",
      investor_goal_intl: "buy_property",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const captureCalls = supabaseCalls.email_captures || [];
    const insertCall = captureCalls.find((c) => c.method === "insert");
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.source).toBe("advisor-lead-international");
    const ctx = args.context as Record<string, unknown>;
    expect(ctx.is_international).toBe(true);
    expect(ctx.investor_country).toBe("USA");
    expect(ctx.lead_tier).toBe("international");
  });

  // ── Duplicate handling ──

  it("treats duplicate email (Postgres 23505) as success", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "email_captures") {
        // Override insert to return a duplicate-key error directly via thenable
        b.insert = vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "23505", message: "duplicate key value" },
          }),
        );
      }
      return b;
    });

    const req = buildRequest(VALID);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 on non-duplicate insert error", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "email_captures") {
        b.insert = vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "OTHER", message: "connection refused" },
          }),
        );
      }
      return b;
    });

    const req = buildRequest(VALID);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  // ── Sanitization ──

  it("sanitizes oversize fields", async () => {
    const longName = "A".repeat(500);
    const longCountry = "X".repeat(200);
    const req = buildRequest({
      ...VALID,
      name: longName,
      is_international: true,
      phone: "+1 415 555 0100",
      investor_country: longCountry,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const captureCalls = supabaseCalls.email_captures || [];
    const insertCall = captureCalls.find((c) => c.method === "insert");
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect((args.name as string).length).toBeLessThanOrEqual(100);
    const ctx = args.context as Record<string, unknown>;
    expect((ctx.investor_country as string).length).toBeLessThanOrEqual(50);
  });
});
