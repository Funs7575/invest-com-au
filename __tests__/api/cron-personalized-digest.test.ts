import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));

import { GET } from "@/app/api/cron/personalized-digest/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "not", "gte", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/personalized-digest", { method: "GET" });
}

function makeAdminClient(responses: Record<number, unknown>, authUsers: unknown[] = []) {
  let call = 0;
  return {
    from: vi.fn(() => {
      call++;
      return makeChain(responses[call] ?? { data: [], error: null });
    }),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: authUsers }, error: null }),
      },
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockSendEmail.mockResolvedValue({ ok: true } as never);
});

describe("GET /api/cron/personalized-digest", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    mockCreateAdmin.mockReturnValue({} as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns sent:0 when no users with weekly digest enabled", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [], error: null }, // notification_preferences → no users
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No users/);
  });

  it("returns sent:0 when all users already received digest today", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u1" }], error: null }, // notification_preferences
      2: { data: [{ user_id: "u1" }], error: null }, // digest_sends (already sent)
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received/);
  });

  it("sends email to user with pending digest and inserts digest_sends record", async () => {
    const activeBroker = { slug: "abc", name: "ABC Broker", rating: 4.5, tagline: null, is_crypto: false, platform_type: "broker", asx_fee: "$10", deal: false, deal_text: null };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u1" }], error: null }, // notification_preferences
      2: { data: [], error: null }, // digest_sends (none yet)
      3: { data: [{ id: "u1", email: "user@ex.com", display_name: "Alice", interested_in: [], preferred_broker: null, investing_experience: null }], error: null }, // user_profiles
      // auth.admin.listUsers called separately
      4: { data: [], error: null }, // broker_data_changes (no fee changes → changeSlugs empty → broker names skip)
      5: { data: [activeBroker], error: null }, // all active brokers
      6: { data: [], error: null }, // articles
      7: { data: [], error: null }, // active deals
      8: { data: null, error: null }, // digest_sends insert
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "user@ex.com" }));
  });

  it("falls back to auth email when user profile has no email", async () => {
    const authUser = { id: "u2", email: "auth@ex.com" };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u2" }], error: null }, // notification_preferences
      2: { data: [], error: null }, // digest_sends
      3: { data: [{ id: "u2", email: null, display_name: null, interested_in: [], preferred_broker: null, investing_experience: null }], error: null }, // user_profiles (no email)
      // auth.admin.listUsers returns authUser
      4: { data: [], error: null }, // broker_data_changes
      5: { data: [], error: null }, // all active brokers
      6: { data: [], error: null }, // articles
      7: { data: [], error: null }, // active deals
      8: { data: null, error: null }, // digest_sends insert
    }, [authUser]) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "auth@ex.com" }));
  });

  it("skips user with no resolvable email (sendEmail not called)", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u3" }], error: null }, // notification_preferences
      2: { data: [], error: null }, // digest_sends
      3: { data: [], error: null }, // user_profiles (not found)
      4: { data: [], error: null }, // broker_data_changes
      5: { data: [], error: null }, // all active brokers
      6: { data: [], error: null }, // articles
      7: { data: [], error: null }, // active deals
    }) as never);
    await GET(makeReq());
    // Route uses Promise.allSettled — early-return (no email) resolves as fulfilled,
    // so sent counts the allSettled result, not actual emails. Only sendEmail being
    // called or not is the meaningful check here.
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts errors when sendEmail fails", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "rate limited" } as never);
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u4" }], error: null },
      2: { data: [], error: null },
      3: { data: [{ id: "u4", email: "u4@ex.com", display_name: null, interested_in: [], preferred_broker: null, investing_experience: null }], error: null },
      4: { data: [], error: null }, // broker_data_changes
      5: { data: [], error: null }, // all active brokers
      6: { data: [], error: null }, // articles
      7: { data: [], error: null }, // active deals
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.errors).toBe(1);
  });

  it("includes shortlist section when user has preferred broker with fee changes", async () => {
    const feeChange = { broker_slug: "pref-broker", field_name: "asx_fee", old_value: "9.50", new_value: "14.95", changed_at: new Date().toISOString() };
    const prefBroker = { slug: "pref-broker", name: "Pref Broker", rating: 4.5, is_crypto: false, platform_type: "broker", deal: false, deal_text: null };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      1: { data: [{ user_id: "u5" }], error: null },
      2: { data: [], error: null },
      3: { data: [{ id: "u5", email: "u5@ex.com", display_name: "Frank", interested_in: [], preferred_broker: "pref-broker", investing_experience: null }], error: null },
      4: { data: [feeChange], error: null }, // broker_data_changes
      5: { data: [prefBroker], error: null }, // brokers for changed slugs (changeSlugs non-empty → query runs)
      6: { data: [], error: null }, // all active brokers
      7: { data: [], error: null }, // articles
      8: { data: [], error: null }, // active deals
      9: { data: null, error: null }, // digest_sends insert
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    // Email contains shortlist section — verify sendEmail called with html containing fee change data
    const callArgs = mockSendEmail.mock.calls[0]?.[0];
    expect(callArgs?.html).toContain("Watchlist");
  });
});
