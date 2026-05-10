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

const sendCalls: { to: string; subject: string }[] = [];
const sendEmailMock = vi.fn(async (opts: { to: string; subject: string }) => {
  sendCalls.push({ to: opts.to, subject: opts.subject });
  return { ok: true };
});
vi.mock("@/lib/resend", () => ({
  sendEmail: (opts: { to: string; subject: string; html: string }) => sendEmailMock(opts),
}));

let alertsRows: unknown[] = [];
let subscriberRows: unknown[] = [];
let alreadySentRows: unknown[] = [];
const insertCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "country_rule_alerts") {
    const chain = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      then: (resolve: (v: unknown) => void) => Promise.resolve({ data: alertsRows, error: null }).then(resolve),
    };
    return chain;
  }
  if (table === "email_captures") {
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        // simulate filtering: only return rows matching
        if (col === "newsletter_opt_in" && val !== true) return { ...chain, then: (r: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(r) };
        return chain;
      },
      then: (resolve: (v: unknown) => void) => Promise.resolve({ data: subscriberRows, error: null }).then(resolve),
    };
    return chain;
  }
  if (table === "newsletter_sends") {
    const selectChain = {
      select: () => selectChain,
      eq: () => selectChain,
      then: (resolve: (v: unknown) => void) => Promise.resolve({ data: alreadySentRows, error: null }).then(resolve),
    };
    return {
      select: () => selectChain,
      insert: async (row: Record<string, unknown>) => {
        insertCalls.push(row);
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/cron/country-rule-alerts-digest/route";

function makeReq(): NextRequest {
  return {
    headers: new Headers({ Authorization: "Bearer test" }),
    url: "https://invest.com.au/api/cron/country-rule-alerts-digest",
  } as unknown as NextRequest;
}

const SAMPLE_ALERT = {
  alert_key: "uk-firb-2025",
  country_code: "uk",
  severity: "warning",
  headline: "AU established-dwelling ban active until 31 March 2027",
  body: "Foreign buyers cannot purchase established AU residential dwellings…",
  source: "Treasury / FIRB",
  cta_href: "/foreign-investment/united-kingdom",
  cta_label: "UK investor guide",
  created_at: "2026-05-08T00:00:00Z",
  updated_at: null,
};

describe("country-rule-alerts-digest", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    sendCalls.length = 0;
    insertCalls.length = 0;
    alertsRows = [];
    subscriberRows = [];
    alreadySentRows = [];
    sendEmailMock.mockClear();
  });

  it("returns 500 when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("skips when there are no alerts in the last 7 days", async () => {
    alertsRows = [];
    subscriberRows = [{ email: "u@x.com", name: null }];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body).toEqual({ ok: true, skipped: "no_alerts_in_window" });
    expect(sendCalls).toHaveLength(0);
  });

  it("skips when there are alerts but no opted-in subscribers", async () => {
    alertsRows = [SAMPLE_ALERT];
    subscriberRows = [];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe("no_subscribers");
    expect(body.alerts).toBe(1);
    expect(sendCalls).toHaveLength(0);
  });

  it("sends one email per recipient with the digest subject", async () => {
    alertsRows = [SAMPLE_ALERT];
    subscriberRows = [
      { email: "a@x.com", name: "Alex" },
      { email: "b@x.com", name: null },
    ];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.alerts).toBe(1);
    expect(sendCalls).toHaveLength(2);
    expect(sendCalls[0]?.subject).toMatch(/1 update/);
  });

  it("subject pluralises correctly", async () => {
    alertsRows = [SAMPLE_ALERT, { ...SAMPLE_ALERT, alert_key: "us-fatca", country_code: "us" }];
    subscriberRows = [{ email: "a@x.com", name: null }];
    await GET(makeReq());
    expect(sendCalls[0]?.subject).toMatch(/2 updates/);
  });

  it("dedupes against newsletter_sends — already-sent recipients are skipped", async () => {
    alertsRows = [SAMPLE_ALERT];
    subscriberRows = [
      { email: "a@x.com", name: null },
      { email: "b@x.com", name: null },
    ];
    alreadySentRows = [{ email: "a@x.com" }];
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.deduped).toBe(1);
    expect(sendCalls.map((s) => s.to)).toEqual(["b@x.com"]);
  });

  it("inserts a newsletter_sends row for each successful send", async () => {
    alertsRows = [SAMPLE_ALERT];
    subscriberRows = [{ email: "a@x.com", name: "Alex" }];
    await GET(makeReq());
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      email: "a@x.com",
      edition_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}-country-digest$/),
    });
  });
});
