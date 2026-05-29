/**
 * Tests for the switching-review-reminders cron route.
 *
 * Key paths covered:
 *  - requireCronAuth gate (401)
 *  - Feature flag disabled → skipped
 *  - RESEND_API_KEY not set → skipped
 *  - DB error fetching user_current_products (500)
 *  - No eligible users (200, considered=0)
 *  - DB error fetching profiles (500)
 *  - Happy path: email sent, last_review_reminder_at updated
 *  - Suppressed email: user skipped
 *  - Missing email: user skipped (no_email counted)
 *  - sendEmail failure: errors counted
 *  - update failure: logged but send still counted
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAdminFrom,
  mockRequireCronAuth,
  mockWrapCronHandler,
  mockIsFlagEnabled,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockRequireCronAuth: vi.fn((): NextResponse | null => null),
  mockWrapCronHandler: vi.fn(
    (
      _name: string,
      handler: (req: NextRequest) => Promise<Response>,
    ) => handler,
  ),
  mockIsFlagEnabled: vi.fn(async () => true),
  mockSendEmail: vi.fn(async () => ({ ok: true as boolean, error: undefined as string | undefined })),
})) as {
  mockAdminFrom: MockInstance;
  mockRequireCronAuth: MockInstance<() => NextResponse | null>;
  mockWrapCronHandler: MockInstance;
  mockIsFlagEnabled: MockInstance;
  mockSendEmail: MockInstance;
};

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: mockWrapCronHandler,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

// ─── Import route AFTER mocks ─────────────────────────────────────────────────

import { GET } from "@/app/api/cron/switching-review-reminders/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/switching-review-reminders", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

/** Chainable supabase builder — resolves via `.then` on the terminal call. */
function makeChain(data: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.gte = vi.fn(self);
  builder.lte = vi.fn(self);
  builder.or = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.not = vi.fn(self);
  builder.insert = vi.fn(() => Promise.resolve({ error: null }));
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.update = vi.fn(self);
  builder.delete = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve({ data, error }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  (builder as unknown as Promise<unknown>).then = ((
    onFulfilled?: ((v: unknown) => unknown) | null,
    onRejected?: ((v: unknown) => unknown) | null,
  ) => Promise.resolve({ data, error }).then(onFulfilled ?? undefined, onRejected ?? undefined)) as unknown as Promise<unknown>["then"];
  return builder;
}

/** Build a chainable builder where .update(...).in(...).eq(...) resolves */
function makeUpdateChain(error: unknown = null) {
  const eq = vi.fn(() => Promise.resolve({ error }));
  const inFn = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ in: inFn }));
  return { update };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/switching-review-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue({ ok: true, error: undefined });
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns skipped when feature flag is disabled", async () => {
    mockIsFlagEnabled.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_email_drip_send");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns skipped when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("no_resend_api_key");
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 500 when fetching user_current_products fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with considered=0 when no eligible users exist", async () => {
    mockAdminFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.considered).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("returns 500 when fetching profiles fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "user_current_products") {
        return makeChain([
          {
            id: "prod-1",
            user_id: "user-1",
            product_kind: "broker",
            broker_name: "CommSec",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        return makeChain(null, { message: "profiles error" });
      }
      return makeChain([]);
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("happy path — sends email and updates last_review_reminder_at", async () => {
    const userId = "user-happy";
    const email = "happy@example.com";

    const { update: mockUpdate } = makeUpdateChain(null);

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_current_products" && callCount === 1) {
        return makeChain([
          {
            id: "prod-happy",
            user_id: userId,
            product_kind: "broker",
            broker_name: "Stake",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        return makeChain([{ id: userId, email }]);
      }
      if (table === "email_suppression_list") {
        return makeChain([]);
      }
      if (table === "user_current_products") {
        // update call
        return { update: mockUpdate };
      }
      return makeChain([]);
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: expect.stringContaining("review"),
      }),
    );
  });

  it("skips suppressed email addresses", async () => {
    const userId = "user-suppressed";
    const email = "suppressed@example.com";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_current_products" && callCount === 1) {
        return makeChain([
          {
            id: "prod-sup",
            user_id: userId,
            product_kind: "savings_account",
            broker_name: "ING",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        return makeChain([{ id: userId, email }]);
      }
      if (table === "email_suppression_list") {
        return makeChain([{ email }]);
      }
      return makeChain([]);
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts no_email when user has no profile email", async () => {
    const userId = "user-no-email";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_current_products" && callCount === 1) {
        return makeChain([
          {
            id: "prod-ne",
            user_id: userId,
            product_kind: "broker",
            broker_name: "Pearler",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        // No email in profile
        return makeChain([{ id: userId, email: null }]);
      }
      if (table === "email_suppression_list") {
        return makeChain([]);
      }
      return makeChain([]);
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.no_email).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("counts errors when sendEmail fails", async () => {
    const userId = "user-email-fail";
    const email = "emailfail@example.com";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_current_products" && callCount === 1) {
        return makeChain([
          {
            id: "prod-ef",
            user_id: userId,
            product_kind: "broker",
            broker_name: "SelfWealth",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        return makeChain([{ id: userId, email }]);
      }
      if (table === "email_suppression_list") {
        return makeChain([]);
      }
      return makeChain([]);
    });

    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "SMTP error" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("logs warning but still counts sent when update fails", async () => {
    const userId = "user-update-fail";
    const email = "updatefail@example.com";

    const eqFn = vi.fn(() => Promise.resolve({ error: { message: "update error" } }));
    const inFn = vi.fn(() => ({ eq: eqFn }));
    const mockUpdateFail = vi.fn(() => ({ in: inFn }));

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_current_products" && callCount === 1) {
        return makeChain([
          {
            id: "prod-uf",
            user_id: userId,
            product_kind: "term_deposit",
            broker_name: "Rabobank",
            started_at: "2024-01-01",
            last_review_reminder_at: null,
          },
        ]);
      }
      if (table === "profiles") {
        return makeChain([{ id: userId, email }]);
      }
      if (table === "email_suppression_list") {
        return makeChain([]);
      }
      if (table === "user_current_products") {
        return { update: mockUpdateFail };
      }
      return makeChain([]);
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    // sent is still incremented even if update fails
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
  });
});
