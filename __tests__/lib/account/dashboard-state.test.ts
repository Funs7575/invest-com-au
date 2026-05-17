import { describe, expect, it } from "vitest";
import { pickHero } from "@/lib/account/dashboard-state";

const emptyInputs = { plans: [], briefs: [], quotes: [] };

describe("pickHero priority order", () => {
  it("returns 'empty' when the user has nothing", () => {
    expect(pickHero(emptyInputs).kind).toBe("empty");
  });

  it("returns 'plan_in_progress' for a draft plan with no brief", () => {
    expect(
      pickHero({
        ...emptyInputs,
        plans: [{ id: 1, status: "draft", share_token: "t1" }],
      }).kind,
    ).toBe("plan_in_progress");
  });

  it("returns 'plan_saved_no_brief' for a saved plan with no brief yet", () => {
    const hero = pickHero({
      ...emptyInputs,
      plans: [{ id: 1, status: "saved", share_token: "t1" }],
    });
    expect(hero.kind).toBe("plan_saved_no_brief");
    expect(hero.cta_href).toBe("/briefs/new?plan_id=1");
  });

  it("escalates the saved-plan hero copy after 14d of aging", () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const hero = pickHero({
      ...emptyInputs,
      plans: [
        {
          id: 1,
          status: "saved",
          share_token: "t1",
          updated_at: fifteenDaysAgo,
        },
      ],
    });
    expect(hero.kind).toBe("plan_saved_no_brief");
    expect(hero.title).toMatch(/still considering/i);
    expect(hero.cta_href).toContain("plan_age_nudge");
  });

  it("does NOT escalate when the saved plan is fresh (<14d)", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const hero = pickHero({
      ...emptyInputs,
      plans: [
        {
          id: 1,
          status: "saved",
          share_token: "t1",
          updated_at: fiveDaysAgo,
        },
      ],
    });
    expect(hero.title).toBe("Ready to get quotes?");
  });

  it("returns 'brief_open' when a brief is open and unaccepted", () => {
    const hero = pickHero({
      ...emptyInputs,
      plans: [{ id: 1, status: "saved", share_token: "t1" }],
      briefs: [{ slug: "abc", status: "open", accepted_at: null }],
    });
    expect(hero.kind).toBe("brief_open");
    expect(hero.cta_href).toBe("/briefs/abc");
  });

  it("returns 'brief_accepted' when any brief has been accepted", () => {
    const hero = pickHero({
      ...emptyInputs,
      briefs: [
        { slug: "other", status: "open", accepted_at: null },
        { slug: "winner", status: "open", accepted_at: "2026-05-01T00:00:00Z" },
      ],
    });
    expect(hero.kind).toBe("brief_accepted");
    expect(hero.cta_href).toBe("/briefs/winner");
  });

  it("returns 'quote_awaiting_review' even when a brief is accepted", () => {
    const hero = pickHero({
      plans: [],
      briefs: [{ slug: "x", status: "open", accepted_at: "2026-05-01T00:00:00Z" }],
      quotes: [
        {
          review_token: "tok",
          amount_cents: 250000,
          expires_at: "2026-06-01T00:00:00Z",
        },
      ],
    });
    expect(hero.kind).toBe("quote_awaiting_review");
    expect(hero.cta_href).toBe("/quote/tok");
    expect(hero.body).toContain("2,500");
  });
});
