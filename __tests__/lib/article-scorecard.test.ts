import { describe, it, expect } from "vitest";
import {
  runScorecard,
  listScorecardChecks,
  type ScorecardInput,
} from "@/lib/article-scorecard";

/**
 * Test helper — a "good" article that passes every check. Individual
 * tests mutate one field at a time to assert a specific rule fires
 * without cascading failures from unrelated gaps.
 */
function goodArticle(
  over: Partial<ScorecardInput> = {},
): ScorecardInput {
  const body = `
## What you will learn

This piece is about investing in Australian share-trading platforms.

## How it works

The Australian Financial Services Licence (AFSL) regime governs brokers. Read
our guide at /article/afsl-explained and /broker/stake. This information is
general advice only and does not take into account your personal objectives,
financial situation or needs. Before acting on any information, consider
whether it's appropriate for you.

We may earn a commission from partner brokers when readers open accounts via
our affiliate links. This does not influence our editorial coverage.

## Fees

A typical trade on most brokers costs between five and ten dollars. Fee
structures vary by broker. See /compare to compare side by side.

## Getting started

Account opening takes about 15 minutes. You will need photo ID, a bank
account, and a verified email. Once approved, funds settle T+2.
`.trim();

  return {
    title: "Investing in Australian shares: a practical guide",
    excerpt:
      "Independent guide to investing in Australian share-trading platforms. Fees, tax and how to get started.",
    category: "beginners",
    tags: ["beginners", "shares"],
    body,
    templateSlug: "how_to",
    minWords: 10,
    ...over,
  };
}

describe("listScorecardChecks", () => {
  it("returns every check by default", () => {
    const all = listScorecardChecks();
    expect(all.length).toBeGreaterThan(10);
  });

  it("filters checks by template applicability", () => {
    const forNews = listScorecardChecks("news_brief");
    const forBroker = listScorecardChecks("broker_review");
    // affiliate_disclosure_on_reviews is gated on broker_review + comparison_post
    expect(forBroker.some((c) => c.code === "affiliate_disclosure_on_reviews")).toBe(true);
    expect(forNews.some((c) => c.code === "affiliate_disclosure_on_reviews")).toBe(false);
    expect(forNews.some((c) => c.code === "primary_source_on_news")).toBe(true);
    expect(forBroker.some((c) => c.code === "primary_source_on_news")).toBe(false);
  });
});

describe("runScorecard — clean article", () => {
  it("awards a high grade to a clean how-to", () => {
    const r = runScorecard(goodArticle());
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(r.grade);
    expect(r.failedChecks).not.toContain("general_advice_warning");
    expect(r.failedChecks).not.toContain("no_forward_looking_statements");
  });
});

describe("runScorecard — hard failures floor the grade at F", () => {
  it("flags missing general advice warning", () => {
    // Explicit body with no GA trigger phrases — affiliate disclosure
    // included so the only hard failure is the missing GA warning.
    const body = `
## Intro

Independent piece with enough length to meet the ten-word minimum bar.
Read /broker/stake and /broker/cmc. We may earn a commission from
partner brokers when readers open accounts via our affiliate links.
We carefully researched fee schedules and onboarding flows for a
long enough paragraph. The content continues below to pad out the
body so soft checks stay green.

## Fees

Different brokers charge different brokerage amounts. See /compare
for a side by side. Fee schedules update regularly. Pearler offers
autoinvest. Stake has flat brokerage. CMC has tiered pricing for
active traders.
`.trim();
    const r = runScorecard({ ...goodArticle(), body });
    expect(r.failedChecks).toContain("general_advice_warning");
    expect(r.grade).toBe("F");
    expect(r.remediation.some((x) => x.code === "general_advice_warning")).toBe(true);
  });

  it("flags forward-looking price targets", () => {
    const body =
      goodArticle().body +
      "\n\nBased on lithium demand, WDS will hit $40 within 12 months, doubling your money.";
    const r = runScorecard({ ...goodArticle(), body });
    expect(r.failedChecks).toContain("no_forward_looking_statements");
    expect(r.grade).toBe("F");
  });

  it("requires affiliate disclosure on a broker review", () => {
    const body = goodArticle().body.replace(
      /We may earn a commission from partner brokers[^]*?editorial coverage\./,
      "",
    );
    const r = runScorecard({
      ...goodArticle(),
      body,
      templateSlug: "broker_review",
      minWords: 10,
    });
    expect(r.failedChecks).toContain("affiliate_disclosure_on_reviews");
    expect(r.grade).toBe("F");
  });

  it("requires a primary source link on a news brief", () => {
    const r = runScorecard({
      ...goodArticle(),
      body: "## What happened\n\nAn announcement was made. This is general advice only and does not take into account your personal objectives.",
      templateSlug: "news_brief",
      minWords: 10,
    });
    expect(r.failedChecks).toContain("primary_source_on_news");
    expect(r.grade).toBe("F");
  });

  it("flags under-minimum word count", () => {
    const r = runScorecard({
      ...goodArticle(),
      body: "## Too short\n\nThis is general advice only and does not take into account your personal objectives.",
      minWords: 600,
    });
    expect(r.failedChecks).toContain("min_word_count");
    expect(r.grade).toBe("F");
  });
});

describe("runScorecard — soft failures only deduct points", () => {
  it("flags a too-short title but stays above F", () => {
    const r = runScorecard({ ...goodArticle(), title: "Short" });
    expect(r.failedChecks).toContain("title_length_sane");
    // Only a 5-point deduction — still well above F
    expect(r.grade).not.toBe("F");
  });

  it("flags missing tags", () => {
    const r = runScorecard({ ...goodArticle(), tags: [] });
    expect(r.failedChecks).toContain("tags_present");
  });

  it("flags marketing cliches in the body", () => {
    const r = runScorecard({
      ...goodArticle(),
      body: goodArticle().body + "\n\nThis is a best-in-class revolutionary platform.",
    });
    expect(r.failedChecks).toContain("no_marketing_fluff");
  });

  it("flags missing H2 structure", () => {
    const r = runScorecard({
      ...goodArticle(),
      body:
        "This is a long piece without headings but with enough words to clear the minimum word count. " +
        "The text continues without structure. This information is general advice only and does not take into account your personal objectives. " +
        "Read our guide at /article/shares and /broker/cmc. " +
        "More body content continues here to make sure the body is long enough to clear any minimum and to give enough test coverage for the checker. ".repeat(3),
    });
    expect(r.failedChecks).toContain("h2_structure");
  });

  it("flags missing internal links", () => {
    const body = goodArticle().body.replace(
      /\/article\/afsl-explained/g,
      "example",
    ).replace(/\/broker\/stake/g, "example").replace(/\/compare/g, "example");
    const r = runScorecard({ ...goodArticle(), body });
    expect(r.failedChecks).toContain("has_internal_links");
  });

  it("flags overlong paragraphs", () => {
    const longParagraph = Array.from(
      { length: 150 },
      (_, i) => `word${i}`,
    ).join(" ");
    const r = runScorecard({
      ...goodArticle(),
      body:
        goodArticle().body + "\n\n" + longParagraph,
    });
    expect(r.failedChecks).toContain("paragraph_length");
  });
});

describe("runScorecard — grade boundaries", () => {
  it("grades A at 90+", () => {
    // Clean article — should be ≥ 90
    const r = runScorecard(goodArticle());
    if (r.score >= 90) expect(r.grade).toBe("A");
    else expect(["A", "B"]).toContain(r.grade);
  });

  it("grades F when any hard check fails even if soft checks are all perfect", () => {
    // Body with zero GA trigger phrases. Affiliate disclosure is still
    // present so only one hard check fails — proving that a single
    // hard failure floors the grade at F regardless of the 95% of
    // the scorecard that passes.
    const body = `
## Intro

Thoughtful editorial content explaining how fees work in practice.
Read /broker/stake and /broker/cmc. We may earn a commission from
partner brokers when readers sign up via our affiliate links.
Independent coverage is the norm on this site.

## Body

The body continues with enough paragraphs to pass soft checks.
Pearler offers autoinvest. Stake has flat brokerage structure.
CMC runs tiered pricing for active traders who execute often.
`.trim();
    const r = runScorecard({ ...goodArticle(), body });
    expect(r.grade).toBe("F");
  });
});

describe("runScorecard — deterministic", () => {
  it("is pure — same input, same output", () => {
    const input = goodArticle();
    const a = runScorecard(input);
    const b = runScorecard(input);
    expect(a).toEqual(b);
  });

  it("returns a remediation message for every failed check", () => {
    const r = runScorecard({ ...goodArticle(), tags: [], category: "" });
    for (const failed of r.failedChecks) {
      expect(r.remediation.some((x) => x.code === failed)).toBe(true);
    }
  });
});
