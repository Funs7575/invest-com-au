import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockBuildEmailMap = vi.fn(async () => new Map<string, string>());
const mockNotifyUser = vi.fn(async () => false);
vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: (...args: unknown[]) => mockBuildEmailMap(...args),
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

import { GET } from "@/app/api/cron/price-drop-alerts/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "gte", "lte", "not", "is", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/price-drop-alerts", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockBuildEmailMap.mockResolvedValue(new Map());
  mockNotifyUser.mockResolvedValue(false);
  mockSendEmail.mockResolvedValue({ ok: true } as never);
});

describe("GET /api/cron/price-drop-alerts", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when fee_update_queue errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns sent:0 when no recent changes", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.decreases).toBe(0);
  });

  it("returns sent:0 when changes exist but none are decreases", async () => {
    // old_value=10, new_value=15 → increase, not a decrease
    const change = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", field_name: "asx_fee", old_value: "10", new_value: "15", reviewed_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [change], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.decreases).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("sends email to subscriber for relevant decrease", async () => {
    const change = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", field_name: "asx_fee", old_value: "20", new_value: "10", reviewed_at: new Date().toISOString() };
    const sub = { id: 1, email: "sub@ex.com", broker_slugs: [], alert_type: "decrease", unsubscribe_token: "tok" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [change], error: null }); // fee_update_queue
        if (call === 2) return makeChain({ data: [sub], error: null }); // subscribers
        return makeChain({ data: null, error: null }); // insert + update
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.decreases).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "sub@ex.com",
      subject: expect.stringContaining("ABC"),
    }));
  });

  it("skips subscriber with no relevant broker in their list", async () => {
    const change = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", field_name: "asx_fee", old_value: "20", new_value: "10", reviewed_at: new Date().toISOString() };
    // Subscriber only wants alerts for "xyz", not "abc"
    const sub = { id: 1, email: "sub@ex.com", broker_slugs: ["xyz"], alert_type: "decrease", unsubscribe_token: "tok" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [change], error: null });
        return makeChain({ data: [sub], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("fires in-app notification when user id resolves from email map", async () => {
    const change = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", field_name: "asx_fee", old_value: "20", new_value: "10", reviewed_at: new Date().toISOString() };
    const sub = { id: 1, email: "sub@ex.com", broker_slugs: [], alert_type: "any", unsubscribe_token: "tok" };
    mockBuildEmailMap.mockResolvedValue(new Map([["sub@ex.com", "user-uuid-1"]]));
    mockNotifyUser.mockResolvedValue(true);
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [change], error: null });
        if (call === 2) return makeChain({ data: [sub], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.inboxed).toBe(1);
    expect(mockNotifyUser).toHaveBeenCalled();
  });
});
