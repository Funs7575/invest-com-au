import { describe, it, expect } from "vitest";
import {
  renderHtmlReport,
  renderMarkdownSummary,
  summarize,
  verdict,
  type RunMeta,
} from "../../bots/findings/report";
import type { Finding } from "../../bots/findings/types";

const META: RunMeta = {
  runId: "2026-05-29T00-00-00-abc123",
  baseUrl: "http://localhost:3000",
  targetClass: "sandbox",
  startedAt: "2026-05-29T00:00:00.000Z",
  finishedAt: "2026-05-29T00:05:00.000Z",
  sessions: 3,
  personas: ["first-home-buyer", "retiree"],
};

function finding(over: Partial<Finding> = {}): Finding {
  return {
    id: "abc",
    severity: "high",
    category: "http-error",
    title: "500 on /api/quiz/submit",
    detail: "Server returned 500",
    url: "/get-matched",
    occurrences: 2,
    firstSeenAt: "2026-05-29T00:01:00.000Z",
    sampleUrls: ["/get-matched"],
    personas: ["retiree"],
    ...over,
  };
}

describe("summarize", () => {
  it("counts by occurrences and distinct", () => {
    const sum = summarize([finding({ severity: "high", occurrences: 2 }), finding({ id: "z", severity: "low", occurrences: 5 })]);
    expect(sum.high).toBe(2);
    expect(sum.low).toBe(5);
    expect(sum.total).toBe(7);
    expect(sum.distinct).toBe(2);
  });
});

describe("renderHtmlReport", () => {
  it("renders a clean-run message when empty", () => {
    const html = renderHtmlReport([], META);
    expect(html).toContain("No findings");
    expect(html).toContain(META.runId);
    expect(html).toContain("localhost:3000");
  });

  it("renders findings with severity, category and occurrence count", () => {
    const html = renderHtmlReport([finding()], META);
    expect(html).toContain("500 on /api/quiz/submit");
    expect(html).toContain("high");
    expect(html).toContain("http-error");
    expect(html).toContain("×2");
  });

  it("escapes HTML in dynamic content (no injection)", () => {
    const html = renderHtmlReport(
      [finding({ title: "<script>alert(1)</script>", detail: "a & b < c" })],
      META,
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b &lt; c");
  });

  it("includes a cost line when meta.cost is present", () => {
    const html = renderHtmlReport([], {
      ...META,
      cost: { inputTokens: 1000, outputTokens: 500, usd: 0.1234, calls: 3 },
    });
    expect(html).toContain("AI cost");
    expect(html).toContain("$0.1234");
    expect(html).toContain("3 calls");
  });

  it("shows a plain-English verdict and 'what this means' explainer", () => {
    const html = renderHtmlReport([finding({ category: "a11y", severity: "high" })], META);
    expect(html).toMatch(/important issue/i); // verdict for a high finding
    expect(html).toContain("What this means");
    expect(html).toContain("accessibility"); // a11y category help text
  });
});

describe("verdict", () => {
  it("is all-clear when empty", () => {
    expect(verdict(summarize([])).text).toMatch(/all clear/i);
  });
  it("flags serious issues when criticals are present", () => {
    const v = verdict(summarize([finding({ severity: "critical" })]));
    expect(v.text).toMatch(/serious/i);
    expect(v.emoji).toBe("🛑");
  });
  it("flags minor when only low/medium are present", () => {
    expect(verdict(summarize([finding({ severity: "low" })])).text).toMatch(/minor/i);
  });
});

describe("renderMarkdownSummary", () => {
  it("leads with the verdict and a severity table", () => {
    const md = renderMarkdownSummary(
      [finding({ severity: "critical", title: "500 on /x" })],
      META,
    );
    expect(md).toContain("# 🤖 Bot fleet — latest results");
    expect(md).toMatch(/serious issue/i);
    expect(md).toContain("| Severity | Count |");
    expect(md).toContain("500 on /x");
  });
  it("says nothing-to-action on a clean run", () => {
    expect(renderMarkdownSummary([], META)).toMatch(/no problems|nothing to action/i);
  });
  it("omits info-level findings from the action list", () => {
    const md = renderMarkdownSummary(
      [finding({ severity: "info", category: "safety", title: "safety-net-summary" })],
      META,
    );
    expect(md).not.toContain("safety-net-summary");
  });
});
