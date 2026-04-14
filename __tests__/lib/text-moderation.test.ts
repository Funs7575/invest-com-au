import { describe, it, expect } from "vitest";
import { classifyText, type ModerationContext } from "@/lib/text-moderation";

function ctx(
  text: string,
  overrides: Partial<ModerationContext> = {},
): ModerationContext {
  return {
    text,
    title: null,
    surface: "broker_review",
    authorId: "user-1",
    authorVerified: true,
    authorPriorCount: 1,
    authorPriorRejections: 0,
    ...overrides,
  };
}

describe("classifyText — hard rejects", () => {
  it("rejects empty text", () => {
    const r = classifyText(ctx(""));
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects whitespace-only", () => {
    const r = classifyText(ctx("   \n   "));
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects explicit hate speech", () => {
    const r = classifyText(ctx("this is terrible, kill all people who use this platform"));
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects obvious scam terminology", () => {
    const r = classifyText(
      ctx("This broker runs a ponzi scheme and everyone should avoid"),
    );
    // "ponzi" hits the scam_terminology reject rule
    expect(r.verdict).toBe("auto_reject");
  });

  it("rejects link spam (5+ links)", () => {
    const r = classifyText(
      ctx(
        "check this out https://a.com https://b.com https://c.com https://d.com https://e.com best deal ever",
      ),
    );
    expect(r.verdict).toBe("auto_reject");
  });
});

describe("classifyText — legal escalation", () => {
  it("escalates 'scammed me'", () => {
    const r = classifyText(
      ctx(
        "This platform scammed me out of my savings. I am writing this review to warn everyone about their shady practices and loss of my hard earned money",
      ),
    );
    expect(r.verdict).toBe("escalate");
    expect(r.reasons).toContain("legal_risk_requires_human_review");
  });

  it("escalates 'fraud' claims", () => {
    const r = classifyText(
      ctx(
        "I believe this advisor committed fraud against multiple clients. The evidence is clear and I want a refund as a matter of principle",
      ),
    );
    expect(r.verdict).toBe("escalate");
  });

  it("escalates 'stole my money'", () => {
    const r = classifyText(
      ctx(
        "These people stole my money and refused to refund. Absolutely appalling behaviour from a supposedly regulated firm that I trusted",
      ),
    );
    expect(r.verdict).toBe("escalate");
  });
});

describe("classifyText — soft signals", () => {
  it("escalates too-short content for broker review", () => {
    const r = classifyText(ctx("ok"));
    expect(r.verdict).toBe("escalate");
  });

  it("escalates gibberish consonant runs", () => {
    const r = classifyText(
      ctx("this is my review bcdfghjklmnpqrstvwxyzbcdf qwerty very bad experience"),
    );
    expect(["escalate", "auto_reject"]).toContain(r.verdict);
  });

  it("escalates when author has prior rejections", () => {
    const r = classifyText(
      ctx(
        "This is a fairly long review of a broker I used for six months with mixed results",
        { authorPriorRejections: 3 },
      ),
    );
    expect(r.verdict).toBe("escalate");
  });
});

describe("classifyText — auto_publish path", () => {
  it("auto-publishes a normal broker review", () => {
    const r = classifyText(
      ctx(
        "I've been using CMC Markets for about 18 months for my ASX portfolio. The app is responsive and the fees are transparent. Customer support took a couple of days to respond to a transfer query but once they did it was resolved quickly. Would recommend for long-term investors.",
      ),
    );
    expect(r.verdict).toBe("auto_publish");
    expect(r.confidence).toBe("high");
  });

  it("auto-publishes a balanced advisor review", () => {
    const r = classifyText(
      ctx(
        "John helped us restructure our SMSF and the advice was thorough and well-documented. Communication could have been a bit faster during the ATO lodgement period but overall the experience was professional and we'd use him again.",
        { surface: "advisor_review" },
      ),
    );
    expect(r.verdict).toBe("auto_publish");
  });
});

describe("classifyText — advisor articles higher bar", () => {
  it("escalates a short advisor article", () => {
    const r = classifyText(
      ctx(
        "This article is about investing. Investing is good. You should consider it.",
        { surface: "advisor_article", title: "Investing Guide" },
      ),
    );
    expect(r.verdict).toBe("escalate");
  });

  it("auto-publishes a real advisor article", () => {
    const longText =
      "Retirement planning in Australia involves several distinct tax considerations that many pre-retirees overlook. ".repeat(10) +
      "The first is the interaction between age pension means testing and self-funded retirement assets. " +
      "The transfer balance cap of $1.9 million introduced in 2017 and indexed since 2023 affects how much you can move into retirement phase. " +
      "Transition to retirement pensions (TTR) and regular account-based pensions have different tax treatments on earnings that matter enormously at the margin. " +
      "You should consult a registered SMSF auditor or financial planner before making decisions.";
    const r = classifyText(
      ctx(longText, { surface: "advisor_article", title: "Retirement Tax Planning Guide" }),
    );
    expect(r.verdict).toBe("auto_publish");
  });
});
