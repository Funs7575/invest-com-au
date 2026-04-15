import { describe, it, expect } from "vitest";
import {
  FormEventRequest,
  AttributionTouchRequest,
  SearchResponse,
  PrivacyRequestInput,
  BulkActionRequest,
  BulkActionResponse,
  assertContract,
} from "@/lib/api-schemas";

describe("FormEventRequest", () => {
  it("accepts a valid event", () => {
    const r = FormEventRequest.safeParse({
      session_id: "s123",
      form_name: "quiz",
      step: "q1",
      event: "view",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown form_name", () => {
    const r = FormEventRequest.safeParse({
      session_id: "s123",
      form_name: "other",
      step: "q1",
      event: "view",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown event", () => {
    const r = FormEventRequest.safeParse({
      session_id: "s123",
      form_name: "quiz",
      step: "q1",
      event: "ghost",
    });
    expect(r.success).toBe(false);
  });
});

describe("AttributionTouchRequest", () => {
  it("accepts a view event", () => {
    const r = AttributionTouchRequest.safeParse({
      session_id: "s1",
      event: "view",
      page_path: "/compare",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing session_id", () => {
    const r = AttributionTouchRequest.safeParse({ event: "view" });
    expect(r.success).toBe(false);
  });
});

describe("SearchResponse", () => {
  it("accepts an empty result set", () => {
    const r = SearchResponse.safeParse({ hits: [] });
    expect(r.success).toBe(true);
  });

  it("requires type/id/title/excerpt/score on each hit", () => {
    const r = SearchResponse.safeParse({
      hits: [
        {
          type: "article",
          id: "how-to",
          title: "How to",
          excerpt: "An article",
          score: 0.9,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a hit with score out of range", () => {
    const r = SearchResponse.safeParse({
      hits: [
        { type: "article", id: "x", title: "x", excerpt: "x", score: 1.5 },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("PrivacyRequestInput", () => {
  it("accepts a well-formed request", () => {
    const r = PrivacyRequestInput.safeParse({
      email: "alex@example.com",
      type: "export",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const r = PrivacyRequestInput.safeParse({
      email: "not-an-email",
      type: "export",
    });
    expect(r.success).toBe(false);
  });
});

describe("BulkActionRequest", () => {
  it("caps rowIds at 500", () => {
    const r = BulkActionRequest.safeParse({
      feature: "listing_scam",
      targetVerdict: "rejected",
      rowIds: new Array(600).fill(0).map((_, i) => i + 1),
    });
    expect(r.success).toBe(false);
  });

  it("accepts a valid payload", () => {
    const r = BulkActionRequest.safeParse({
      feature: "listing_scam",
      targetVerdict: "rejected",
      rowIds: [1, 2, 3],
    });
    expect(r.success).toBe(true);
  });
});

describe("BulkActionResponse", () => {
  it("accepts a normal response", () => {
    const r = BulkActionResponse.safeParse({
      ok: true,
      updated: 3,
      failed: 0,
      errors: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("assertContract", () => {
  it("returns the parsed data on success", () => {
    const body = { hits: [] };
    const data = assertContract(SearchResponse, body);
    expect(data.hits).toEqual([]);
  });

  it("throws with a helpful message on failure", () => {
    expect(() =>
      assertContract(SearchResponse, { hits: [{ type: "nope" }] }),
    ).toThrow(/Contract mismatch/);
  });
});
