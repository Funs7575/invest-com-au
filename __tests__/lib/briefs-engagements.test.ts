import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(async () => true),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

const { mockSendCheckin } = vi.hoisted(() => ({
  mockSendCheckin: vi.fn(async () => true),
}));
vi.mock("@/lib/marketplace-emails", () => ({
  sendEngagementCheckin: mockSendCheckin,
}));

vi.mock("@/lib/outcomes", () => ({
  newReviewToken: vi.fn(() => "tok_test_1234567890"),
}));

type QueuedResult = { data?: unknown; error?: unknown; count?: number | null };
const { tableQueues, mockFrom } = vi.hoisted(() => {
  const tableQueues = new Map<string, QueuedResult[]>();
  function makeBuilder(result: QueuedResult) {
    const b: Record<string, unknown> = {};
    for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
      b[m] = vi.fn(() => b);
    }
    b.then = (cb: (v: unknown) => unknown) =>
      Promise.resolve(cb({ data: null, error: null, count: null, ...result }));
    return b;
  }
  const mockFrom = vi.fn((table: string) => {
    const queue = tableQueues.get(table);
    const result = queue && queue.length > 0 ? queue.shift()! : {};
    return makeBuilder(result);
  });
  return { tableQueues, mockFrom };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  checkinDueAt,
  isAnnualStage,
  statusKeepsCadence,
  seedEngagements,
  sendDueCheckins,
  applyEngagementStatus,
  submitAnnualReview,
  runEngagementCheckins,
  CHECKIN_STAGE_DAYS,
  MAX_STAGES,
  type EngagementRow,
} from "@/lib/briefs/engagements";

function queue(table: string, ...results: QueuedResult[]) {
  tableQueues.set(table, [...(tableQueues.get(table) ?? []), ...results]);
}

const STARTED = "2026-01-01T00:00:00.000Z";

function makeEngagement(overrides: Partial<EngagementRow> = {}): EngagementRow {
  return {
    id: 1,
    brief_id: 77,
    professional_id: 42,
    team_id: null,
    consumer_email: "sam@example.com",
    status: "active",
    started_at: STARTED,
    checkin_token: "tok_test_1234567890",
    checkin_stage: 0,
    next_checkin_at: checkinDueAt(STARTED, 0),
    last_checkin_sent_at: null,
    last_status_update_at: null,
    annual_rating: null,
    annual_fee_band: null,
    considering_change: null,
    annual_review_at: null,
    created_at: STARTED,
    updated_at: STARTED,
    ...overrides,
  };
}

describe("cadence helpers", () => {
  it("schedules 30/90/365 days from the start, then stops", () => {
    expect(checkinDueAt(STARTED, 0)).toBe("2026-01-31T00:00:00.000Z");
    expect(checkinDueAt(STARTED, 1)).toBe("2026-04-01T00:00:00.000Z");
    expect(checkinDueAt(STARTED, 2)).toBe("2027-01-01T00:00:00.000Z");
    expect(checkinDueAt(STARTED, MAX_STAGES)).toBeNull();
    expect(checkinDueAt(STARTED, -1)).toBeNull();
    expect(CHECKIN_STAGE_DAYS).toEqual([30, 90, 365]);
  });

  it("stage 2 is the annual review", () => {
    expect(isAnnualStage(0)).toBe(false);
    expect(isAnnualStage(1)).toBe(false);
    expect(isAnnualStage(2)).toBe(true);
  });

  it("only active/engaged keep the cadence alive", () => {
    expect(statusKeepsCadence("active")).toBe(true);
    expect(statusKeepsCadence("engaged")).toBe(true);
    expect(statusKeepsCadence("completed")).toBe(false);
    expect(statusKeepsCadence("ended")).toBe(false);
  });
});

describe("seedEngagements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
  });

  it("creates rows for accepted briefs with the 30d check-in scheduled", async () => {
    queue("advisor_auctions", {
      data: [
        {
          id: 77,
          accepted_at: STARTED,
          accepted_by_professional_id: 42,
          accepted_by_team_id: null,
          contact_email: "Sam@Example.com",
        },
      ],
    });
    queue("engagement_registry", { data: [{ id: 1 }] });

    const seeded = await seedEngagements();
    expect(seeded).toBe(1);

    const upsertBuilder = mockFrom.mock.results
      .map((r) => r.value as { upsert?: ReturnType<typeof vi.fn> })
      .find((b) => b.upsert?.mock.calls.length);
    const [rows] = upsertBuilder!.upsert!.mock.calls[0] as [Record<string, unknown>[]];
    expect(rows[0]).toMatchObject({
      brief_id: 77,
      professional_id: 42,
      consumer_email: "sam@example.com",
      checkin_stage: 0,
      next_checkin_at: "2026-01-31T00:00:00.000Z",
    });
  });

  it("skips briefs without a usable email", async () => {
    queue("advisor_auctions", {
      data: [{ id: 1, accepted_at: STARTED, contact_email: "not-an-email" }],
    });
    const seeded = await seedEngagements();
    expect(seeded).toBe(0);
  });
});

describe("sendDueCheckins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
    mockSendCheckin.mockResolvedValue(true);
  });

  it("sends the due check-in and advances the cadence", async () => {
    const row = makeEngagement();
    queue("engagement_registry", { data: [row] }, { data: null }); // scan, then update
    queue("professionals", { data: { name: "Pro Penny" } });
    queue("advisor_auctions", { data: { job_title: "Help with SMSF" } });

    const now = new Date("2026-02-05T00:00:00.000Z");
    const stats = await sendDueCheckins(now);

    expect(stats).toEqual({ due: 1, sent: 1 });
    expect(mockSendCheckin).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerEmail: "sam@example.com",
        providerName: "Pro Penny",
        stage: 0,
        annual: false,
        checkinUrl: "/engagement/tok_test_1234567890",
      }),
    );
  });

  it("marks the 365-day touch as the annual review", async () => {
    const row = makeEngagement({
      checkin_stage: 2,
      next_checkin_at: checkinDueAt(STARTED, 2),
    });
    queue("engagement_registry", { data: [row] }, { data: null });
    queue("professionals", { data: { name: "Pro" } });
    queue("advisor_auctions", { data: { job_title: "Brief" } });

    await sendDueCheckins(new Date("2027-01-02T00:00:00.000Z"));
    expect(mockSendCheckin).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 2, annual: true }),
    );
  });
});

describe("status + annual review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
  });

  it("ending statuses clear the next check-in", async () => {
    queue(
      "engagement_registry",
      { data: makeEngagement() }, // token lookup
      { data: makeEngagement({ status: "ended", next_checkin_at: null }) }, // update
    );
    const row = await applyEngagementStatus("tok_test_1234567890", "ended");
    expect(row?.status).toBe("ended");

    const updateBuilder = mockFrom.mock.results
      .map((r) => r.value as { update?: ReturnType<typeof vi.fn> })
      .find((b) => b.update?.mock.calls.length);
    const [updates] = updateBuilder!.update!.mock.calls[0] as [Record<string, unknown>];
    expect(updates.next_checkin_at).toBeNull();
  });

  it("returns null for an unknown token", async () => {
    queue("engagement_registry", { data: null });
    expect(await applyEngagementStatus("tok_unknown_123", "engaged")).toBeNull();
  });

  it("annual review returns a pre-filled re-brief URL when considering a change", async () => {
    queue(
      "engagement_registry",
      { data: makeEngagement() },
      { data: makeEngagement({ considering_change: true }) },
    );
    queue("advisor_auctions", {
      data: { brief_template: "smsf_property", provider_preference: "any" },
    });

    const result = await submitAnnualReview("tok_test_1234567890", {
      rating: 2,
      feeBand: "2k_5k",
      consideringChange: true,
    });
    expect(result?.rebriefUrl).toBe(
      "/briefs/new?template=smsf_property&provider_preference=any",
    );
  });

  it("annual review omits the re-brief URL when staying put", async () => {
    queue(
      "engagement_registry",
      { data: makeEngagement() },
      { data: makeEngagement({ considering_change: false }) },
    );
    const result = await submitAnnualReview("tok_test_1234567890", {
      rating: 5,
      feeBand: null,
      consideringChange: false,
    });
    expect(result?.rebriefUrl).toBeNull();
  });
});

describe("runEngagementCheckins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
  });

  it("is a no-op when the engagement_checkins flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const stats = await runEngagementCheckins();
    expect(stats).toEqual({ enabled: false, seeded: 0, due: 0, sent: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
