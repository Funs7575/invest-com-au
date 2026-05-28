import { describe, it, expect } from "vitest";
import { buildAdvisorUrl, buildQuizUrl } from "@/lib/prefill-url";

// ── buildAdvisorUrl ───────────────────────────────────────────────────────────

describe("buildAdvisorUrl", () => {
  it("starts with /find-advisor?", () => {
    expect(buildAdvisorUrl({ need: "smsf" })).toMatch(/^\/find-advisor\?/);
  });

  it("always includes the need param", () => {
    const url = buildAdvisorUrl({ need: "retirement" });
    expect(new URL(url, "https://x.test").searchParams.get("need")).toBe("retirement");
  });

  it("includes state when provided", () => {
    const url = buildAdvisorUrl({ need: "smsf", state: "VIC" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("state")).toBe("VIC");
  });

  it("includes postcode when provided", () => {
    const url = buildAdvisorUrl({ need: "smsf", postcode: "3000" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("postcode")).toBe("3000");
  });

  it("includes budget when provided", () => {
    const url = buildAdvisorUrl({ need: "smsf", budget: "over_1m" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("budget")).toBe("over_1m");
  });

  it("uses first_name (not firstName) as the query param", () => {
    const url = buildAdvisorUrl({ need: "smsf", firstName: "Sarah" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("first_name")).toBe("Sarah");
    expect(params.has("firstName")).toBe(false);
  });

  it("joins context array with commas", () => {
    const url = buildAdvisorUrl({ need: "smsf", context: ["buying_home", "married"] });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("context")).toBe("buying_home,married");
  });

  it("omits context param when context array is empty", () => {
    const url = buildAdvisorUrl({ need: "smsf", context: [] });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.has("context")).toBe(false);
  });

  it("omits optional params when not provided", () => {
    const url = buildAdvisorUrl({ need: "smsf" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.has("state")).toBe(false);
    expect(params.has("postcode")).toBe(false);
    expect(params.has("budget")).toBe(false);
    expect(params.has("first_name")).toBe(false);
    expect(params.has("context")).toBe(false);
  });

  it("URL-encodes special characters in need", () => {
    const url = buildAdvisorUrl({ need: "home loan & mortgage" });
    // URLSearchParams encodes spaces and & correctly
    expect(url).toContain("need=");
    expect(url).not.toContain(" ");
  });

  it("all options together produce a parseable URL", () => {
    const url = buildAdvisorUrl({
      need: "etf",
      state: "NSW",
      postcode: "2000",
      budget: "200k_500k",
      firstName: "Alex",
      context: ["first_home", "investing"],
    });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("need")).toBe("etf");
    expect(params.get("state")).toBe("NSW");
    expect(params.get("postcode")).toBe("2000");
    expect(params.get("budget")).toBe("200k_500k");
    expect(params.get("first_name")).toBe("Alex");
    expect(params.get("context")).toBe("first_home,investing");
  });
});

// ── buildQuizUrl ──────────────────────────────────────────────────────────────

describe("buildQuizUrl", () => {
  it("starts with /quiz?", () => {
    expect(buildQuizUrl({ vertical: "smsf" })).toMatch(/^\/quiz\?/);
  });

  it("always includes the vertical param", () => {
    const url = buildQuizUrl({ vertical: "etfs" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("vertical")).toBe("etfs");
  });

  it("includes state when provided", () => {
    const url = buildQuizUrl({ vertical: "crypto", state: "QLD" });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("state")).toBe("QLD");
  });

  it("omits state when not provided", () => {
    const url = buildQuizUrl({ vertical: "crypto" });
    expect(new URL(url, "https://x.test").searchParams.has("state")).toBe(false);
  });
});
