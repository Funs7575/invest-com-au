import { describe, it, expect } from "vitest";

import {
  CONCIERGE_BASE_SYSTEM_PROMPT,
  buildConciergeSystemPrompt,
  extractCitedSlugs,
  validateNoHallucinations,
  type ConciergeRetrievedDoc,
} from "@/lib/concierge-retrieval";

const DOC = (
  type: string,
  id: string,
  title: string,
  excerpt = "body",
  score = 0.9,
): ConciergeRetrievedDoc => ({
  document_type: type,
  document_id: id,
  title,
  body_excerpt: excerpt,
  score,
});

describe("CONCIERGE_BASE_SYSTEM_PROMPT", () => {
  // Snapshot to catch silent prompt drift. If you intentionally edit
  // the system prompt, run `npm test -- --update` to refresh.
  it("matches the canonical snapshot", () => {
    expect(CONCIERGE_BASE_SYSTEM_PROMPT).toMatchInlineSnapshot(`
      "You are the invest.com.au investment concierge.
      You help Australians find the right investment platforms, advisors,
      and opportunities. You have access to Australia's leading comparison
      platform.

      Guidelines:
      - Keep responses concise. Aim for 3-6 sentences per turn with actionable
        links where possible.
      - Always include at least one relevant internal link when you mention a
        comparison, tool, or hub. Format: [Compare brokers](/compare).
      - When you mention a SPECIFIC ADVISOR by name, always render it as a
        link to their profile, e.g. [Casey Lin](/advisor/casey-lin), AND
        offer to add them to a side-by-side compare via
        [Add Casey Lin to compare](/advisors/compare?add=casey-lin).
      - When you mention a SPECIFIC BROKER by name, render it as a link to
        their page, e.g. [CommSec](/broker/commsec).
      - Only mention advisors and brokers that appear in the RETRIEVED
        CONTEXT below. Do not invent names, slugs, or fee figures.
      - If the retrieved context doesn't cover the question, say so plainly
        and suggest a tool or hub the user can explore.
      - Never give personal financial advice. Recommend seeking a licensed
        AFSL-authorised adviser for personal situations.
      - Never state a broker is "best" universally; frame recommendations as
        "best for X" scenarios and point to /best-for when appropriate.
      - For SMSF questions, point to /smsf. For foreign investors, point to
        /foreign-investment. For funds, /invest/funds. For the energy sector,
        /invest/oil-gas / /invest/uranium / /invest/hydrogen.
      - For users searching for a financial advisor, point to /find-advisor
        (the structured wizard) and /advisors (faceted directory with
        individual, firm, and expert-team filters).
      - Decline questions about specific stocks or crypto trades — say we
        cover platforms and educational context only.

      Platform: invest.com.au."
    `);
  });

  it("contains the AFSL personal-advice clause", () => {
    expect(CONCIERGE_BASE_SYSTEM_PROMPT).toMatch(/Never give personal financial advice/i);
    expect(CONCIERGE_BASE_SYSTEM_PROMPT).toMatch(/AFSL-authorised adviser/i);
  });

  it("contains the no-hallucination clause", () => {
    expect(CONCIERGE_BASE_SYSTEM_PROMPT).toMatch(/Do not invent names, slugs, or fee figures/);
  });
});

describe("buildConciergeSystemPrompt", () => {
  it("appends a (no context retrieved) marker when retrieval is empty", () => {
    const out = buildConciergeSystemPrompt([]);
    expect(out).toContain(CONCIERGE_BASE_SYSTEM_PROMPT);
    expect(out).toContain("(no context retrieved)");
  });

  it("renders each retrieved doc with index, type, title, slug + body", () => {
    const out = buildConciergeSystemPrompt([
      DOC("advisor", "casey-lin", "Casey Lin — Acme Wealth", "SMSF specialist in Brisbane"),
      DOC("broker", "commsec", "CommSec", "Major Australian broker"),
    ]);
    expect(out).toContain("[1] advisor — Casey Lin — Acme Wealth (slug: casey-lin)");
    expect(out).toContain("SMSF specialist in Brisbane");
    expect(out).toContain("[2] broker — CommSec (slug: commsec)");
    expect(out).toContain("Major Australian broker");
  });
});

describe("extractCitedSlugs", () => {
  it("returns empty for empty / linkless replies", () => {
    expect(extractCitedSlugs("")).toEqual([]);
    expect(extractCitedSlugs("No links here, just educational context.")).toEqual([]);
  });

  it("extracts /advisor/{slug}, /advisors/compare?add={slug}, /broker/{slug}", () => {
    const reply = `Based on retrieved profiles, [Casey Lin](/advisor/casey-lin)
specialises in SMSF. [Add Casey Lin to compare](/advisors/compare?add=casey-lin).
For brokers, see [CommSec](/broker/commsec).`;
    const out = extractCitedSlugs(reply);
    expect(out).toEqual(
      expect.arrayContaining([
        { kind: "advisor", slug: "casey-lin" },
        { kind: "advisor_compare", slug: "casey-lin" },
        { kind: "broker", slug: "commsec" },
      ]),
    );
  });

  it("normalises slug case", () => {
    expect(extractCitedSlugs("[X](/advisor/CASEY-LIN)")).toEqual([
      { kind: "advisor", slug: "casey-lin" },
    ]);
  });

  it("ignores invalid slugs", () => {
    expect(extractCitedSlugs("[X](/advisor/!!bad!!)")).toEqual([]);
    expect(extractCitedSlugs("[X](/advisor/)")).toEqual([]);
  });
});

describe("validateNoHallucinations", () => {
  const retrieved = [
    DOC("advisor", "casey-lin", "Casey Lin"),
    DOC("broker", "commsec", "CommSec"),
  ];

  it("returns empty when every cited slug is in retrieved context", () => {
    const reply =
      "[Casey Lin](/advisor/casey-lin) is a good option. [Add Casey Lin to compare](/advisors/compare?add=casey-lin). Brokers: [CommSec](/broker/commsec).";
    expect(validateNoHallucinations(reply, retrieved)).toEqual([]);
  });

  it("flags an advisor slug not in retrieved context", () => {
    const reply = "Try [Mystery Advisor](/advisor/mystery-advisor) instead.";
    expect(validateNoHallucinations(reply, retrieved)).toEqual([
      { kind: "advisor", slug: "mystery-advisor" },
    ]);
  });

  it("flags an advisor_compare slug that doesn't match a retrieved advisor", () => {
    const reply = "[Add to compare](/advisors/compare?add=fake-slug)";
    expect(validateNoHallucinations(reply, retrieved)).toEqual([
      { kind: "advisor_compare", slug: "fake-slug" },
    ]);
  });

  it("flags a broker slug not in retrieved context", () => {
    const reply = "[FakeBroker](/broker/fakebroker)";
    expect(validateNoHallucinations(reply, retrieved)).toEqual([
      { kind: "broker", slug: "fakebroker" },
    ]);
  });

  it("a broker slug in retrieved-as-advisor space still flags as hallucinated", () => {
    // Defence: if the model writes /broker/casey-lin (advisor masquerading
    // as broker) we flag it.
    const reply = "[X](/broker/casey-lin)";
    expect(validateNoHallucinations(reply, retrieved)).toEqual([
      { kind: "broker", slug: "casey-lin" },
    ]);
  });

  it("returns empty for a reply with no cited slugs", () => {
    expect(validateNoHallucinations("Just plain text.", retrieved)).toEqual([]);
  });
});
