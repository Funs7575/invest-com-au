import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const { mockConfigured, mockVerifySecret, mockSend, mockIsValidEmail } = vi.hoisted(() => ({
  mockConfigured: vi.fn(),
  mockVerifySecret: vi.fn(),
  mockSend: vi.fn(),
  mockIsValidEmail: vi.fn(),
}));

vi.mock("@/lib/telegram", () => ({
  isTelegramConfigured: () => mockConfigured(),
  verifyTelegramWebhookSecret: (...args: unknown[]) => mockVerifySecret(...args),
  sendTelegramMessage: (...args: unknown[]) => mockSend(...args),
  escapeMarkdownV2: (s: string) => s,
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (...args: unknown[]) => mockIsValidEmail(...args),
}));

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/webhooks/telegram/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECRET = "tg-secret-123";

function makePost(body: unknown, secretHeader: string | null = SECRET): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secretHeader !== null) headers["x-telegram-bot-api-secret-token"] = secretHeader;
  return new NextRequest("http://localhost/api/webhooks/telegram", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

function message(text: string, chatId = 555, firstName = "Sam") {
  return { message: { chat: { id: chatId }, from: { id: 1, first_name: firstName }, text } };
}

// Builder for handleStart: .select(_, {count}).eq().limit() resolves to {count}.
function emailCaptureChain(count: number) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.limit = vi.fn(() => Promise.resolve({ count, error: null }));
  return c;
}
// Builder for the upsert into telegram_subscriptions.
function upsertChain(error: unknown = null) {
  return { upsert: vi.fn(() => Promise.resolve({ error })) };
}
// Builder for handleStop: .update().eq() resolves to {error}.
function updateChain(error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve({ error }));
  return c;
}
// Builder for handleStatus: .select().eq().limit().maybeSingle().
function statusChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

// Flush the fire-and-forget handleUpdate microtasks scheduled after POST returns.
const flush = () => new Promise((r) => setTimeout(r, 0));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/telegram — gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    mockVerifySecret.mockReturnValue(true);
    mockSend.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
  });
  afterEach(() => vi.clearAllMocks());

  it("returns 503 when Telegram is not configured", async () => {
    mockConfigured.mockReturnValue(false);
    const res = await POST(makePost(message("/status")));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("returns 403 when the secret token header is invalid", async () => {
    mockVerifySecret.mockReturnValue(false);
    const res = await POST(makePost(message("/status"), "wrong"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden");
    expect(mockVerifySecret).toHaveBeenCalledWith("wrong");
  });

  it("returns 403 when the secret token header is absent", async () => {
    mockVerifySecret.mockReturnValue(false);
    const res = await POST(makePost(message("/status"), null));
    expect(res.status).toBe(403);
    expect(mockVerifySecret).toHaveBeenCalledWith(null);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("acknowledges 200 ok:true for an unrecognised update shape (e.g. channel post)", async () => {
    const res = await POST(makePost({ channel_post: { id: 9 } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    await flush();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 ok:true and sends help text for an unknown command", async () => {
    const res = await POST(makePost(message("hello there")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0]?.[1] as string;
    expect(sent).toContain("Commands");
  });

  it("ignores a message with no text without touching the DB", async () => {
    const res = await POST(makePost({ message: { chat: { id: 7 } } }));
    expect(res.status).toBe(200);
    await flush();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/telegram — /start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    mockVerifySecret.mockReturnValue(true);
    mockSend.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
  });

  it("prompts for an email when /start has no/invalid email argument", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makePost(message("/start")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0]?.[1]).toContain("/start your@email");
  });

  it("subscribes + confirms when the email is already known", async () => {
    const upsert = upsertChain(null);
    mockFrom.mockImplementation((table: string) =>
      table === "email_captures" ? emailCaptureChain(1) : upsert,
    );
    const res = await POST(makePost(message("/start Known@Example.com")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockFrom).toHaveBeenCalledWith("email_captures");
    expect(mockFrom).toHaveBeenCalledWith("telegram_subscriptions");
    const upsertArg = (upsert.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      confirmed: boolean;
      email: string;
      telegram_chat_id: number;
    };
    expect(upsertArg.confirmed).toBe(true);
    expect(upsertArg.email).toBe("known@example.com"); // lowercased
    expect(upsertArg.telegram_chat_id).toBe(555);
    expect(mockSend.mock.calls[0]?.[1]).toContain("subscribed");
  });

  it("upserts unconfirmed + nudges to sign up when the email is unknown", async () => {
    const upsert = upsertChain(null);
    mockFrom.mockImplementation((table: string) =>
      table === "email_captures" ? emailCaptureChain(0) : upsert,
    );
    const res = await POST(makePost(message("/start new@example.com")));
    expect(res.status).toBe(200);
    await flush();
    const upsertArg = (upsert.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      confirmed: boolean;
    };
    expect(upsertArg.confirmed).toBe(false);
    expect(mockSend.mock.calls[0]?.[1]).toContain("don't have");
  });

  it("sends an error message when the subscription upsert fails", async () => {
    const upsert = upsertChain({ message: "boom" });
    mockFrom.mockImplementation((table: string) =>
      table === "email_captures" ? emailCaptureChain(1) : upsert,
    );
    const res = await POST(makePost(message("/start known@example.com")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockSend.mock.calls[0]?.[1]).toMatch(/went wrong/i);
  });
});

describe("POST /api/webhooks/telegram — /stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    mockVerifySecret.mockReturnValue(true);
    mockSend.mockResolvedValue(true);
  });

  it("deactivates the subscription and confirms with a goodbye", async () => {
    const chain = updateChain(null);
    mockFrom.mockReturnValue(chain);
    const res = await POST(makePost(message("/stop")));
    expect(res.status).toBe(200);
    await flush();
    expect(mockFrom).toHaveBeenCalledWith("telegram_subscriptions");
    expect(chain.update).toHaveBeenCalledWith({ active: false });
    expect(chain.eq).toHaveBeenCalledWith("telegram_chat_id", 555);
    expect(mockSend.mock.calls[0]?.[1]).toMatch(/paused/i);
  });

  it("sends an error message when the stop update fails", async () => {
    mockFrom.mockReturnValue(updateChain({ message: "db down" }));
    await POST(makePost(message("/stop")));
    await flush();
    expect(mockSend.mock.calls[0]?.[1]).toMatch(/went wrong/i);
  });
});

describe("POST /api/webhooks/telegram — /status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    mockVerifySecret.mockReturnValue(true);
    mockSend.mockResolvedValue(true);
  });

  it("reports Active for a confirmed + active subscription", async () => {
    mockFrom.mockReturnValue(
      statusChain({ email: "a@b.com", rate_alerts: true, fee_alerts: false, confirmed: true, active: true }),
    );
    await POST(makePost(message("/status")));
    await flush();
    const sent = mockSend.mock.calls[0]?.[1] as string;
    expect(sent).toContain("Active");
    expect(sent).toContain("a@b.com");
    expect(sent).toContain("Rate alerts: on");
    expect(sent).toContain("Fee alerts: off");
  });

  it("reports no-subscription when none is found", async () => {
    mockFrom.mockReturnValue(statusChain(null));
    await POST(makePost(message("/status")));
    await flush();
    expect(mockSend.mock.calls[0]?.[1]).toMatch(/No subscription found/i);
  });
});
