import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  findingSignature,
  type FindingInput,
} from "../../bots/findings/types";
import { FindingStore } from "../../bots/findings/store";

describe("normalizeUrl", () => {
  it("strips origin, query and hash", () => {
    expect(normalizeUrl("https://x.com/compare?tab=fees#top")).toBe("/compare");
    expect(normalizeUrl("/compare?tab=fees")).toBe("/compare");
  });
  it("collapses id-like segments", () => {
    expect(normalizeUrl("/brokers/123")).toBe("/brokers/:id");
    expect(normalizeUrl("/u/550e8400-e29b-41d4-a716-446655440000")).toBe("/u/:id");
    expect(normalizeUrl("/x/deadbeefdeadbeef01")).toBe("/x/:id");
  });
  it("keeps human slugs", () => {
    expect(normalizeUrl("/brokers/example-chess")).toBe("/brokers/example-chess");
  });
});

describe("findingSignature", () => {
  const base: FindingInput = {
    severity: "high",
    category: "http-error",
    title: "500",
    detail: "boom",
    url: "/api/x",
  };
  it("is stable for equal inputs", () => {
    expect(findingSignature(base)).toBe(findingSignature({ ...base }));
  });
  it("changes with category, url, or key", () => {
    expect(findingSignature(base)).not.toBe(
      findingSignature({ ...base, category: "a11y" }),
    );
    expect(findingSignature(base)).not.toBe(
      findingSignature({ ...base, url: "/api/y" }),
    );
    expect(findingSignature(base)).not.toBe(
      findingSignature({ ...base, signatureKey: "different" }),
    );
  });
  it("ignores title when signatureKey is provided", () => {
    const a = findingSignature({ ...base, title: "A", signatureKey: "k" });
    const b = findingSignature({ ...base, title: "B", signatureKey: "k" });
    expect(a).toBe(b);
  });
});

describe("FindingStore", () => {
  const mk = (over: Partial<FindingInput> = {}): FindingInput => ({
    severity: "medium",
    category: "console-error",
    title: "TypeError: x is undefined",
    detail: "...",
    url: "/p",
    ...over,
  });

  it("dedupes identical findings and counts occurrences", () => {
    const store = new FindingStore();
    store.add(mk({ persona: "alice" }));
    store.add(mk({ persona: "bob" }));
    expect(store.size).toBe(1);
    const [f] = store.all();
    expect(f?.occurrences).toBe(2);
    expect(f?.personas.sort()).toEqual(["alice", "bob"]);
    expect(f?.sampleUrls).toEqual(["/p"]);
  });

  it("escalates severity to the most severe seen", () => {
    const store = new FindingStore();
    store.add(mk({ severity: "low" }));
    store.add(mk({ severity: "critical" }));
    expect(store.all()[0]?.severity).toBe("critical");
  });

  it("dedupes across id-like URLs but keeps distinct samples", () => {
    const store = new FindingStore();
    store.add(mk({ category: "broken-link", url: "/brokers/1" }));
    store.add(mk({ category: "broken-link", url: "/brokers/2" }));
    expect(store.size).toBe(1);
    expect(store.all()[0]?.sampleUrls.sort()).toEqual(["/brokers/1", "/brokers/2"]);
  });

  it("sorts by severity then occurrences and summarizes", () => {
    const store = new FindingStore();
    store.add(mk({ severity: "low", title: "low-thing" }));
    store.add(mk({ severity: "critical", title: "crit-thing" }));
    store.add(mk({ severity: "critical", title: "crit-thing" }));
    const all = store.all();
    expect(all[0]?.severity).toBe("critical");
    const sum = store.summary();
    expect(sum.critical).toBe(2);
    expect(sum.low).toBe(1);
    expect(sum.total).toBe(3);
    expect(sum.distinct).toBe(2);
  });

  it("merges aggregated findings from shards", () => {
    const a = new FindingStore();
    a.add(mk({ title: "shared" }));
    const b = new FindingStore();
    b.add(mk({ title: "shared" }));
    b.add(mk({ title: "unique" }));
    a.merge(b.all());
    expect(a.size).toBe(2);
    const shared = a.all().find((f) => f.title === "shared");
    expect(shared?.occurrences).toBe(2);
  });
});
