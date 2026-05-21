import { describe, it, expect } from "vitest";
import {
  LIFE_EVENT_CATEGORIES,
  LIFE_EVENTS,
  buildLifeEventUrl,
  type LifeEvent,
  type LifeEventCategory,
} from "@/lib/life-events";

const CATEGORY_IDS: LifeEventCategory[] = [
  "property",
  "family",
  "career",
  "wealth",
  "business",
  "retirement",
];

describe("LIFE_EVENT_CATEGORIES", () => {
  it("covers exactly the six known categories", () => {
    expect(LIFE_EVENT_CATEGORIES.map((c) => c.id).sort()).toEqual([...CATEGORY_IDS].sort());
  });

  it("every category has a label and emoji", () => {
    for (const c of LIFE_EVENT_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.emoji.length).toBeGreaterThan(0);
    }
  });

  it("category ids are unique", () => {
    expect(new Set(LIFE_EVENT_CATEGORIES.map((c) => c.id)).size).toBe(LIFE_EVENT_CATEGORIES.length);
  });
});

describe("LIFE_EVENTS data invariants", () => {
  it("is non-empty", () => {
    expect(LIFE_EVENTS.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = LIFE_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every event has the required fields populated", () => {
    for (const e of LIFE_EVENTS) {
      expect(e.id.length).toBeGreaterThan(0);
      expect(e.emoji.length).toBeGreaterThan(0);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.subtitle.length).toBeGreaterThan(0);
      expect(e.need.length).toBeGreaterThan(0);
      expect(Array.isArray(e.context)).toBe(true);
      expect(e.context.length).toBeGreaterThan(0);
      expect(Array.isArray(e.suggestedTypes)).toBe(true);
      expect(e.suggestedTypes.length).toBeGreaterThan(0);
    }
  });

  it("every event's category is a known category", () => {
    for (const e of LIFE_EVENTS) {
      expect(CATEGORY_IDS).toContain(e.category);
    }
  });

  it("relatedHub, when present, is an absolute path", () => {
    for (const e of LIFE_EVENTS) {
      if (e.relatedHub !== undefined) {
        expect(e.relatedHub.startsWith("/")).toBe(true);
      }
    }
  });

  it("each category has at least one event", () => {
    for (const id of CATEGORY_IDS) {
      expect(LIFE_EVENTS.some((e) => e.category === id)).toBe(true);
    }
  });
});

describe("buildLifeEventUrl", () => {
  const sample: LifeEvent = {
    id: "buying_first_home",
    emoji: "🏠",
    title: "Buying My First Home",
    subtitle: "...",
    category: "property",
    need: "mortgage",
    context: ["first_home"],
    suggestedTypes: ["Mortgage Broker"],
  };

  it("builds a /find-advisor URL with need + context", () => {
    const url = buildLifeEventUrl(sample);
    expect(url.startsWith("/find-advisor?")).toBe(true);
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("need")).toBe("mortgage");
    expect(qs.get("context")).toBe("first_home");
  });

  it("joins multiple context values with a comma", () => {
    const url = buildLifeEventUrl({ ...sample, context: ["a", "b", "c"] });
    expect(new URLSearchParams(url.split("?")[1]).get("context")).toBe("a,b,c");
  });

  it("forwards state + postcode extras", () => {
    const url = buildLifeEventUrl(sample, { state: "VIC", postcode: "3000" });
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("state")).toBe("VIC");
    expect(qs.get("postcode")).toBe("3000");
  });

  it("omits state/postcode when not provided", () => {
    const qs = new URLSearchParams(buildLifeEventUrl(sample).split("?")[1]);
    expect(qs.has("state")).toBe(false);
    expect(qs.has("postcode")).toBe(false);
  });

  it("produces a valid URL for every real life event", () => {
    for (const e of LIFE_EVENTS) {
      const url = buildLifeEventUrl(e);
      const qs = new URLSearchParams(url.split("?")[1]);
      expect(qs.get("need")).toBe(e.need);
      expect(qs.get("context")).toBe(e.context.join(","));
    }
  });
});
