import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockConfigured = vi.fn((..._a: unknown[]) => true);
const mockVerify = vi.fn((..._a: unknown[]) => true);
const mockSendTelegram = vi.fn(async (..._a: unknown[]): Promise<void> => {});
const mockEscape = vi.fn((s: unknown) => String(s ?? ""));
vi.mock("@/lib/telegram", () => ({
  isTelegramConfigured: (...a: unknown[]) => mockConfigured(...a),
  verifyTelegramWebhookSecret: (...a: unknown[]) => mockVerify(...a),
  sendTelegramMessage: (...a: unknown[]) => mockSendTelegram(...a),
  escapeMarkdownV2: (s: unknown) => mockEscape(s),
}));

const mockIsValidEmail = vi.fn((..._a: unknown[]) => true);
vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (...a: unknown[]) => mockIsValidEmail(...a),
}));

function makeBuilder(result: { data?: unknown; error?: unknown; count?: number } = { data: [], error: null }) {
  const c: Record<string, unknown> = {
    then: (r: (v: unknown) => unknown) => Promise.resolve(r(result)),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}
const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: (...a: unknown[]) => mockFrom(...a) })),
}));

import { POST } from "@/app/api/webhooks/telegram/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown, opts: { raw?: string } = {}): NextRequest {
  return new Request("http://localhost/api/webhooks/telegram", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "s", "content-type": "application/json" },
    body: opts.raw !== undefined ? opts.raw : JSON.stringify(body),
  }) as unknown as NextRequest;
}
function msg(text: string) {
  return { message: { chat: { id: 555 }, from: { id: 1, first_name: "Sam" }, text } };
}
// handleUpdate is fire-and-forget; flush macrotasks so its awaited chain runs.
const flush = async () => {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    mockVerify.mockReturnValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockEscape.mockImplementation((s: unknown) => String(s ?? ""));
    mockSendTelegram.mockResolvedValue(undefined);
    mockFrom.mockReset();
    mockFrom.mockReturnValue(makeBuilder());
  });

  it("returns 503 when Telegram is not configured", async () => {
    mockConfigured.mockReturnValue(false);
    const res = await POST(makeReq(msg("/status")));
    expect(res.status).toBe(503);
  });

  it("returns 403 when the secret token is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeReq(msg("/status")));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(makeReq(null, { raw: "not json{" }));
    expect(res.status).toBe(400);
  });

  it("acknowledges (200) an update whose shape fails the schema", async () => {
    const res = await POST(makeReq({ message: { chat: { id: "not-a-number" } } }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    await flush();
    expect(mockSendTelegram).not.toHaveBeenCalled();
  });

  it("acknowledges (200) and does nothing for a message with no text", async () => {
    const res = await POST(makeReq({ message: { chat: { id: 555 } } }));
    expect(res.status).toBe(200);
    await flush();
    expect(mockSendTelegram).not.toHaveBeenCalled();
  });

  it("/start with a known email subscribes and confirms", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ count: 1 })) // email_captures count
      .mockReturnValueOnce(makeBuilder({ error: null })); // upsert
    const res = await POST(makeReq(msg("/start sam@example.com")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockSendTelegram).toHaveBeenCalledTimes(1);
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/subscribed/i);
  });

  it("/start with an unknown email asks them to sign up first", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ count: 0 }))
      .mockReturnValueOnce(makeBuilder({ error: null }));
    await POST(makeReq(msg("/start nobody@example.com")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/don't have|come back/i);
  });

  it("/start with an invalid email prompts for the correct format and does not touch the DB", async () => {
    mockIsValidEmail.mockReturnValue(false);
    await POST(makeReq(msg("/start garbage")));
    await flush();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/your@email/i);
  });

  it("/start surfaces a friendly error when the upsert fails", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ count: 1 }))
      .mockReturnValueOnce(makeBuilder({ error: { message: "db down" } }));
    await POST(makeReq(msg("/start sam@example.com")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/went wrong/i);
  });

  it("/stop deactivates the subscription", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ error: null }));
    await POST(makeReq(msg("/stop")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/bye|paused/i);
  });

  it("/stop surfaces an error when the update fails", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ error: { message: "db down" } }));
    await POST(makeReq(msg("/stop")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/went wrong/i);
  });

  it("/status reports an active subscription", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { email: "sam@example.com", rate_alerts: true, fee_alerts: true, confirmed: true, active: true }, error: null }),
    );
    await POST(makeReq(msg("/status")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/active/i);
  });

  it("/status reports no subscription when none exists", async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    await POST(makeReq(msg("/status")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/no subscription/i);
  });

  it("replies with help text for an unrecognised command", async () => {
    await POST(makeReq(msg("hello there")));
    await flush();
    expect(String(mockSendTelegram.mock.calls[0]?.[1])).toMatch(/Commands:/);
  });
});
