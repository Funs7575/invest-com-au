import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}
const sendEmailMock = vi.fn(async (_opts: SendArgs) => ({ ok: true as const }));
vi.mock("@/lib/resend", () => ({
  sendEmail: (opts: SendArgs) => sendEmailMock(opts),
}));

interface PreferenceRow {
  user_id: string;
  last_digest_window_start: string | null;
}
interface ItemRow {
  user_id: string;
  id: number;
  item_type: string;
  item_slug: string;
  display_name: string | null;
}
interface BrokerRow {
  slug: string;
  name: string;
  updated_at: string;
}
interface ArticleRow {
  slug: string;
  title: string;
  excerpt: string | null;
  related_brokers: unknown;
  published_at: string;
}

const state = {
  prefs: [] as PreferenceRow[],
  items: [] as ItemRow[],
  brokers: [] as BrokerRow[],
  articles: [] as ArticleRow[],
  updateCalls: [] as { user_id: string; patch: Record<string, unknown> }[],
  authUsers: [] as { id: string; email: string | null; user_metadata: Record<string, string> }[],
};

function thenable<T>(value: T) {
  return {
    then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
  };
}

const mockFrom = vi.fn((table: string) => {
  if (table === "watchlist_alert_preferences") {
    const chain = {
      select: () => chain,
      eq: () => chain,
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, userId: string) => {
          state.updateCalls.push({ user_id: userId, patch });
          return Promise.resolve({ error: null });
        },
      }),
      ...thenable({ data: state.prefs, error: null }),
    };
    return chain;
  }
  if (table === "user_watchlist_items") {
    const chain = {
      select: () => chain,
      in: () => chain,
      ...thenable({ data: state.items, error: null }),
    };
    return chain;
  }
  if (table === "brokers") {
    const chain = {
      select: () => chain,
      in: () => chain,
      gte: () => chain,
      ...thenable({ data: state.brokers, error: null }),
    };
    return chain;
  }
  if (table === "articles") {
    const chain = {
      select: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => chain,
      ...thenable({ data: state.articles, error: null }),
    };
    return chain;
  }
  throw new Error(`unexpected table: ${table}`);
});

const mockListUsers = vi.fn(async (_opts: { page: number; perPage: number }) => ({
  data: { users: state.authUsers },
  error: null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

import { GET } from "@/app/api/cron/watchlist-alerts/route";

function makeReq(): NextRequest {
  return {
    headers: new Headers({ Authorization: "Bearer test" }),
    url: "https://invest.com.au/api/cron/watchlist-alerts",
  } as unknown as NextRequest;
}

describe("cron/watchlist-alerts", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    state.prefs = [];
    state.items = [];
    state.brokers = [];
    state.articles = [];
    state.updateCalls.length = 0;
    state.authUsers = [];
    sendEmailMock.mockClear();
    mockListUsers.mockClear();
  });

  it("returns 500 when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("skips silently when no users have opted in", async () => {
    state.prefs = [];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body).toEqual({ ok: true, skipped: "no_opt_in" });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("skips users whose watchlists produced no signal", async () => {
    state.prefs = [{ user_id: "u-1", last_digest_window_start: null }];
    state.items = [{ user_id: "u-1", id: 1, item_type: "broker", item_slug: "commsec", display_name: "CommSec" }];
    state.brokers = []; // no recent broker updates
    state.articles = [];
    state.authUsers = [{ id: "u-1", email: "alice@x.com", user_metadata: {} }];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped_empty).toBe(1);
    expect(body.sent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends a digest when there is a recent broker update", async () => {
    const now = new Date();
    state.prefs = [{ user_id: "u-1", last_digest_window_start: null }];
    state.items = [{ user_id: "u-1", id: 1, item_type: "broker", item_slug: "commsec", display_name: "CommSec" }];
    state.brokers = [{ slug: "commsec", name: "CommSec", updated_at: now.toISOString() }];
    state.authUsers = [{ id: "u-1", email: "alice@x.com", user_metadata: { full_name: "Alice" } }];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledOnce();
    const sendCall = sendEmailMock.mock.calls[0] as unknown as [SendArgs];
    const sendArgs = sendCall[0];
    expect(sendArgs.to).toBe("alice@x.com");
    expect(sendArgs.subject).toMatch(/1 update/);
    expect(sendArgs.html).toContain("Hi Alice");
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]?.user_id).toBe("u-1");
  });

  it("skips users with no email on file rather than failing the run", async () => {
    state.prefs = [{ user_id: "u-1", last_digest_window_start: null }];
    state.items = [{ user_id: "u-1", id: 1, item_type: "broker", item_slug: "commsec", display_name: "CommSec" }];
    state.brokers = [{ slug: "commsec", name: "CommSec", updated_at: new Date().toISOString() }];
    state.authUsers = [{ id: "u-1", email: null, user_metadata: {} }];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped_no_email).toBe(1);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
