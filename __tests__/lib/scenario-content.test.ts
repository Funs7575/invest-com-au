import { describe, it, expect } from "vitest";
import { SCENARIO_CONTENT, getScenarioContent } from "@/lib/scenario-content";

describe("SCENARIO_CONTENT", () => {
  it("has multiple scenario entries", () => {
    expect(Object.keys(SCENARIO_CONTENT).length).toBeGreaterThan(2);
  });

  it("every entry has sections + faqs + relatedLinks arrays", () => {
    for (const [slug, entry] of Object.entries(SCENARIO_CONTENT)) {
      expect(Array.isArray(entry.sections), `${slug}.sections`).toBe(true);
      expect(Array.isArray(entry.faqs), `${slug}.faqs`).toBe(true);
      expect(Array.isArray(entry.relatedLinks), `${slug}.relatedLinks`).toBe(true);
    }
  });

  it("every section has heading + body", () => {
    for (const [slug, entry] of Object.entries(SCENARIO_CONTENT)) {
      for (const s of entry.sections) {
        expect(s.heading, `${slug}.sections[].heading`).toBeTruthy();
        expect(s.body, `${slug}.sections[].body`).toBeTruthy();
      }
    }
  });

  it("every faq has question + answer", () => {
    for (const [slug, entry] of Object.entries(SCENARIO_CONTENT)) {
      for (const f of entry.faqs) {
        expect(f.question, `${slug}.faqs[].question`).toBeTruthy();
        expect(f.answer, `${slug}.faqs[].answer`).toBeTruthy();
      }
    }
  });

  it("every related link has label + href (internal /)", () => {
    for (const [slug, entry] of Object.entries(SCENARIO_CONTENT)) {
      for (const l of entry.relatedLinks) {
        expect(l.label, `${slug}.relatedLinks[].label`).toBeTruthy();
        expect(l.href, `${slug}.relatedLinks[].href`).toMatch(/^\//);
      }
    }
  });
});

describe("getScenarioContent", () => {
  it("returns undefined for unknown slug", () => {
    expect(getScenarioContent("not-a-scenario")).toBeUndefined();
  });

  it("returns the same entry as SCENARIO_CONTENT[slug] for known slugs", () => {
    const slug = Object.keys(SCENARIO_CONTENT)[0]!;
    expect(getScenarioContent(slug)).toBe(SCENARIO_CONTENT[slug]);
  });
});
