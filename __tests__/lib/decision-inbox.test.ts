import { describe, it, expect } from "vitest";
import {
  buildDecisionInbox,
  type GoalDbRow,
  type RateMemoryRow,
} from "@/lib/decision-inbox";
import type { ActionPlan } from "@/lib/getmatched/types";
import type { SavedSearchRow } from "@/lib/saved-searches";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-06-01T00:00:00Z").getTime();

function makeGoal(overrides: Partial<GoalDbRow> = {}): GoalDbRow {
  return {
    id: 1,
    label: "Retirement fund",
    goal_type: "retirement",
    target_cents: 80000000, // $800k
    target_date: "2028-06-01",
    current_balance_cents: 10000000, // $100k
    monthly_contribution_cents: 200000, // $2k/mo
    expected_return_pct: 7,
    ...overrides,
  };
}

function makePlan(overrides: Partial<ActionPlan> = {}): ActionPlan {
  return {
    id: 1,
    session_id: "s1",
    auth_user_id: "u1",
    email: null,
    intent_slug: "grow",
    secondary_intent_slug: null,
    route: "compare",
    goal: "Grow investment portfolio",
    answers: {},
    checklist: [
      { label: "Compare ETF brokers", href: "/compare", done: false },
      { label: "Open brokerage account", done: false },
    ],
    budget_band: null,
    timeline: null,
    location_state: null,
    country_of_residence: null,
    help_needed: [],
    risk_flags: [],
    risk_severity: null,
    linked_brief_id: null,
    share_token: "abc123",
    status: "saved",
    meta: {},
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeSearch(overrides: Partial<SavedSearchRow> = {}): SavedSearchRow {
  return {
    id: 1,
    user_id: "u1",
    kind: "advisors",
    label: "Sydney financial advisors",
    filters: {},
    email_frequency: "weekly",
    last_alerted_at: "2026-05-20T00:00:00Z",
    last_match_signature: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeRateMemory(overrides: Partial<RateMemoryRow> = {}): RateMemoryRow {
  return {
    id: "r1",
    broker_id: 10,
    broker_name: "CommBank",
    broker_slug: "commbank",
    product_kind: "savings",
    last_seen_rate_bps: 440, // 4.40%
    notified_rate_bps: 490, // 4.90% — was higher when notified
    notified_at: "2026-05-28T00:00:00Z",
    last_seen_at: "2026-05-30T00:00:00Z",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildDecisionInbox — goals", () => {
  it("on-track goal with plenty of time → low urgency, green badge", () => {
    const goal = makeGoal({
      target_cents: 50000000, // $500k
      current_balance_cents: 30000000, // $300k — comfortably on track
      monthly_contribution_cents: 400000, // $4k/mo
      expected_return_pct: 7,
      target_date: "2030-06-01", // 4 years away
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.urgency).toBe("low");
    expect(item?.badge).toBe("On track");
    expect(item?.badgeTone).toBe("green");
    expect(item?.kind).toBe("goal");
    expect(item?.href).toBe("/account/goals");
  });

  it("on-track goal due in ≤ 3 months → medium urgency", () => {
    // Due 2 months from TODAY (2026-06-01)
    const goal = makeGoal({
      target_cents: 10000000,
      current_balance_cents: 12000000, // already over target
      monthly_contribution_cents: 0,
      expected_return_pct: 0,
      target_date: "2026-08-01",
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.urgency).toBe("medium");
    expect(item?.badge).toBe("Due soon");
    expect(item?.badgeTone).toBe("amber");
  });

  it("off-track goal with > 6 months remaining → medium urgency", () => {
    const goal = makeGoal({
      target_cents: 80000000,
      current_balance_cents: 100000, // $1k — way behind
      monthly_contribution_cents: 50000,
      expected_return_pct: 7,
      target_date: "2028-06-01", // 24 months away
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.urgency).toBe("medium");
    expect(item?.badge).toBe("Off track");
    expect(item?.badgeTone).toBe("amber");
  });

  it("off-track goal with < 6 months remaining → high urgency", () => {
    const goal = makeGoal({
      target_cents: 80000000,
      current_balance_cents: 1000000,
      monthly_contribution_cents: 100000,
      expected_return_pct: 7,
      target_date: "2026-10-01", // 4 months away
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.urgency).toBe("high");
    expect(item?.badge).toBe("Off track");
    expect(item?.badgeTone).toBe("red");
  });

  it("overdue goal (target_date in the past) → high urgency, Overdue badge", () => {
    const goal = makeGoal({ target_date: "2026-01-01" }); // past
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.urgency).toBe("high");
    expect(item?.badge).toBe("Overdue");
    expect(item?.dueLabel).toBe("Target date passed");
  });

  it("off-track goal surfaces a nextAction contribution hint", () => {
    const goal = makeGoal({
      target_cents: 80000000,
      current_balance_cents: 500000,
      monthly_contribution_cents: 100000,
      expected_return_pct: 7,
      target_date: "2028-06-01",
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.nextAction).toMatch(/\$\d[\d,]*/);
    expect(item?.nextAction).toMatch(/\/mo/);
  });

  it("on-track goal has no nextAction hint", () => {
    const goal = makeGoal({
      target_cents: 5000000,
      current_balance_cents: 30000000, // way over
      monthly_contribution_cents: 0,
      expected_return_pct: 0,
      target_date: "2030-01-01",
    });
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.nextAction).toBeNull();
  });

  it("subtitle contains progress pct and formatted target", () => {
    const goal = makeGoal({ target_cents: 100000 }); // $1,000
    const [item] = buildDecisionInbox([goal], [], [], [], TODAY);
    expect(item?.subtitle).toContain("Target $1,000");
    expect(item?.subtitle).toMatch(/\d+%/);
  });
});

describe("buildDecisionInbox — plans", () => {
  it("converted plan is excluded", () => {
    const plan = makePlan({ status: "converted" });
    const items = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(items).toHaveLength(0);
  });

  it("expired plan is excluded", () => {
    const plan = makePlan({ status: "expired" });
    const items = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(items).toHaveLength(0);
  });

  it("saved plan with linked brief → brief item (not plan item)", () => {
    const plan = makePlan({ status: "saved", linked_brief_id: 42 });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.kind).toBe("brief");
    expect(item?.key).toBe("brief:42");
    expect(item?.urgency).toBe("high");
    expect(item?.badge).toBe("Awaiting response");
    expect(item?.href).toBe("/account/plans/1");
  });

  it("draft plan with checklist items → plan item", () => {
    const plan = makePlan({ status: "draft", linked_brief_id: null });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.kind).toBe("plan");
    expect(item?.key).toBe("plan:1");
    expect(item?.badge).toBe("Draft");
    expect(item?.badgeTone).toBe("slate");
  });

  it("saved plan with 3+ incomplete items → medium urgency", () => {
    const plan = makePlan({
      status: "saved",
      linked_brief_id: null,
      checklist: [
        { label: "Step 1", done: false },
        { label: "Step 2", done: false },
        { label: "Step 3", done: false },
      ],
    });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.urgency).toBe("medium");
  });

  it("saved plan with 1 incomplete item → low urgency", () => {
    const plan = makePlan({
      status: "saved",
      linked_brief_id: null,
      checklist: [{ label: "Last step", done: false }],
    });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.urgency).toBe("low");
  });

  it("saved plan with all items complete is excluded", () => {
    const plan = makePlan({
      status: "saved",
      linked_brief_id: null,
      checklist: [
        { label: "Step 1", done: true },
        { label: "Step 2", done: true },
      ],
    });
    const items = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(items).toHaveLength(0);
  });

  it("first incomplete checklist item becomes nextAction", () => {
    const plan = makePlan({
      status: "saved",
      linked_brief_id: null,
      checklist: [
        { label: "Already done", done: true },
        { label: "Compare ETF brokers", done: false },
      ],
    });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.nextAction).toBe("Compare ETF brokers");
  });

  it("goal field is used as title when present", () => {
    const plan = makePlan({ goal: "Buy an investment property", intent_slug: "property" });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.title).toBe("Buy an investment property");
  });

  it("intent_slug is humanised as fallback title when goal is null", () => {
    const plan = makePlan({ goal: null, intent_slug: "grow" });
    const [item] = buildDecisionInbox([], [plan], [], [], TODAY);
    expect(item?.title).toBe("Grow");
  });
});

describe("buildDecisionInbox — saved searches", () => {
  it("search with email_frequency=off is excluded", () => {
    const s = makeSearch({ email_frequency: "off" });
    const items = buildDecisionInbox([], [], [s], [], TODAY);
    expect(items).toHaveLength(0);
  });

  it("search with email_frequency=daily is included as low urgency", () => {
    const s = makeSearch({ email_frequency: "daily" });
    const [item] = buildDecisionInbox([], [], [s], [], TODAY);
    expect(item?.kind).toBe("saved_search");
    expect(item?.urgency).toBe("low");
    expect(item?.badge).toBe("Active alert");
    expect(item?.badgeTone).toBe("blue");
  });

  it("never-alerted search shows 'Never alerted yet' as dueLabel", () => {
    const s = makeSearch({ last_alerted_at: null });
    const [item] = buildDecisionInbox([], [], [s], [], TODAY);
    expect(item?.dueLabel).toBe("Never alerted yet");
  });

  it("alerted search shows formatted date as dueLabel", () => {
    const s = makeSearch({ last_alerted_at: "2026-05-20T00:00:00Z" });
    const [item] = buildDecisionInbox([], [], [s], [], TODAY);
    expect(item?.dueLabel).toMatch(/20 May/);
  });
});

describe("buildDecisionInbox — rate alerts", () => {
  it("rate memory without notified_at is excluded", () => {
    const r = makeRateMemory({ notified_at: null, notified_rate_bps: null });
    const items = buildDecisionInbox([], [], [], [r], TODAY);
    expect(items).toHaveLength(0);
  });

  it("rate memory with notified_at → medium urgency rate_alert item", () => {
    const r = makeRateMemory();
    const [item] = buildDecisionInbox([], [], [], [r], TODAY);
    expect(item?.kind).toBe("rate_alert");
    expect(item?.urgency).toBe("medium");
    expect(item?.badge).toBe("Rate changed");
    expect(item?.badgeTone).toBe("amber");
  });

  it("savings rate alert links to /savings/[slug]", () => {
    const r = makeRateMemory({ product_kind: "savings", broker_slug: "bankwest" });
    const [item] = buildDecisionInbox([], [], [], [r], TODAY);
    expect(item?.href).toBe("/savings/bankwest");
  });

  it("td rate alert links to /term-deposits/[slug]", () => {
    const r = makeRateMemory({ product_kind: "td", broker_slug: "ing" });
    const [item] = buildDecisionInbox([], [], [], [r], TODAY);
    expect(item?.href).toBe("/term-deposits/ing");
  });

  it("title mentions broker name and product kind", () => {
    const r = makeRateMemory({ broker_name: "CommBank", product_kind: "savings" });
    const [item] = buildDecisionInbox([], [], [], [r], TODAY);
    expect(item?.title).toContain("CommBank");
    expect(item?.title).toContain("savings account");
  });
});

describe("buildDecisionInbox — sorting", () => {
  it("sorts high before medium before low", () => {
    const overdueGoal = makeGoal({ id: 1, label: "Low urgency goal", target_date: "2029-01-01", target_cents: 1000, current_balance_cents: 5000, monthly_contribution_cents: 0, expected_return_pct: 0 });
    const offTrackGoal = makeGoal({ id: 2, label: "High urgency goal", target_date: "2026-01-01" }); // overdue
    const rateAlert = makeRateMemory(); // medium
    const search = makeSearch(); // low

    const items = buildDecisionInbox(
      [overdueGoal, offTrackGoal],
      [],
      [search],
      [rateAlert],
      TODAY,
    );

    const urgencies = items.map((i) => i.urgency);
    const highIdx = urgencies.indexOf("high");
    const medIdx = urgencies.indexOf("medium");
    const lowIdx = urgencies.indexOf("low");

    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });

  it("empty inputs produce empty output", () => {
    const items = buildDecisionInbox([], [], [], [], TODAY);
    expect(items).toHaveLength(0);
  });
});
