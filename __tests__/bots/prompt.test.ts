import { describe, it, expect } from "vitest";
import { buildSystemPrompt, formatObservation, firstUserTurn } from "../../bots/ai/prompt";
import type { PageObservation } from "../../bots/ai/types";

describe("buildSystemPrompt", () => {
  const sys = buildSystemPrompt("first-home-buyer", "find a mortgage broker");
  it("embeds the persona and goal", () => {
    expect(sys).toContain("first-home-buyer");
    expect(sys).toContain("find a mortgage broker");
  });
  it("documents the action protocol and one-action rule", () => {
    expect(sys).toContain("report_issue");
    expect(sys).toContain("finish");
    expect(sys).toMatch(/one action/i);
    expect(sys).toMatch(/JSON object/i);
  });
  it("instructs it to watch for missing compliance disclosures", () => {
    expect(sys).toMatch(/disclosure|disclaimer/i);
    expect(sys).toContain("compliance");
  });
  it("forbids real personal/payment data", () => {
    expect(sys).toMatch(/fake|never enter real/i);
  });
});

describe("formatObservation", () => {
  const obs: PageObservation = {
    url: "/compare",
    title: "Compare",
    elements: [
      { ref: "e1", role: "link", name: "Home" },
      { ref: "e2", role: "textbox", name: "Email", inputType: "email", value: "x@y.z" },
    ],
  };
  it("lists each element with its ref, role and name", () => {
    const out = formatObservation(obs);
    expect(out).toContain("URL: /compare");
    expect(out).toContain('[e1] link "Home"');
    expect(out).toContain('[e2] textbox "Email" <email>');
  });
  it("notes when a page has no interactable elements", () => {
    const out = formatObservation({ url: "/x", title: "X", elements: [] });
    expect(out).toMatch(/none found/i);
  });
  it("firstUserTurn frames the starting page", () => {
    expect(firstUserTurn(obs)).toMatch(/first step/i);
    expect(firstUserTurn(obs)).toContain("/compare");
  });
});
