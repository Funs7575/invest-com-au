import { describe, it, expect } from "vitest";
import { buildAdvisorUrl, buildQuizUrl } from "@/lib/prefill-url";

describe("buildAdvisorUrl", () => {
  it("includes only the need param when nothing else is supplied", () => {
    expect(buildAdvisorUrl({ need: "smsf" })).toBe("/find-advisor?need=smsf");
  });

  it("appends state, postcode, budget and first name with canonical keys", () => {
    const url = buildAdvisorUrl({
      need: "mortgage",
      state: "VIC",
      postcode: "3000",
      budget: "500k_1m",
      firstName: "Jane",
    });
    const params = new URL(url, "https://x.test").searchParams;
    expect(params.get("need")).toBe("mortgage");
    expect(params.get("state")).toBe("VIC");
    expect(params.get("postcode")).toBe("3000");
    expect(params.get("budget")).toBe("500k_1m");
    // firstName maps to the snake_case `first_name` key the wizard reads.
    expect(params.get("first_name")).toBe("Jane");
  });

  it("url-encodes values that need escaping", () => {
    const url = buildAdvisorUrl({ need: "tax", firstName: "Jo Anne" });
    expect(url).toContain("first_name=Jo+Anne");
  });
});

describe("buildQuizUrl", () => {
  it("includes only the vertical param by default", () => {
    expect(buildQuizUrl({ vertical: "etfs" })).toBe("/quiz?vertical=etfs");
  });

  it("appends the state param when supplied", () => {
    const params = new URL(buildQuizUrl({ vertical: "smsf", state: "NSW" }), "https://x.test")
      .searchParams;
    expect(params.get("vertical")).toBe("smsf");
    expect(params.get("state")).toBe("NSW");
  });
});
