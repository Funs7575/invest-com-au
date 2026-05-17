import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdminFrom = vi.fn();
const mockGetUser = vi.fn();
let cookieSubData: { status: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: cookieSubData, error: null }),
      };
      return chain;
    }),
  })),
}));

import { getGatedReport, getGatedNewsletter } from "@/lib/server/premium-content";

function setReport(row: unknown) {
  mockAdminFrom.mockImplementationOnce(() => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({ data: row, error: null }),
    };
    return chain;
  });
}

function setEdition(row: unknown, capturedEqCalls?: [string, unknown][]) {
  mockAdminFrom.mockImplementationOnce(() => {
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        capturedEqCalls?.push([col, val]);
        return chain;
      },
      single: async () => ({ data: row, error: null }),
    };
    return chain;
  });
}

describe("getGatedReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    mockAdminFrom.mockReset();
    cookieSubData = null;
  });

  it("returns null report when slug does not exist", async () => {
    setReport(null);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await getGatedReport("missing");
    expect(res.report).toBeNull();
    expect(res.isPro).toBe(false);
  });

  it("strips premium fields for non-Pro users", async () => {
    setReport({
      id: 1,
      title: "Q1 2026 State of Investing",
      slug: "q1-2026",
      quarter: "Q1",
      year: 2026,
      executive_summary: "summary",
      key_findings: ["finding"],
      sections: [
        { heading: "Section A", body: "Long body A".repeat(50) },
        { heading: "Section B", body: "Long body B".repeat(50) },
        { heading: "Section C", body: "Long body C".repeat(50) },
      ],
      fee_changes_summary: [
        { broker: "X", field: "asx", old_value: "$5", new_value: "$3" },
      ],
      new_entrants: ["NewBroker"],
      status: "published",
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const res = await getGatedReport("q1-2026");
    expect(res.isPro).toBe(false);
    expect(res.totals).toEqual({ sections: 3, feeChanges: 1, newEntrants: 1 });
    expect(res.report?.sections.length).toBe(2);
    expect(res.report?.sections[0]?.body.endsWith("…")).toBe(true);
    expect(res.report?.fee_changes_summary).toEqual([]);
    expect(res.report?.new_entrants).toEqual([]);
  });

  it("returns the full report for Pro users", async () => {
    setReport({
      id: 1,
      title: "Q1 2026",
      slug: "q1-2026",
      sections: [{ heading: "A", body: "full" }],
      fee_changes_summary: [{ broker: "X", field: "f", old_value: "1", new_value: "2" }],
      new_entrants: ["Y"],
      key_findings: [],
      executive_summary: "",
      quarter: "Q1",
      year: 2026,
      status: "published",
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    cookieSubData = { status: "active" };

    const res = await getGatedReport("q1-2026");
    expect(res.isPro).toBe(true);
    expect(res.report?.sections).toHaveLength(1);
    expect(res.report?.sections[0]?.body).toBe("full");
    expect(res.report?.fee_changes_summary).toHaveLength(1);
    expect(res.report?.new_entrants).toEqual(["Y"]);
  });
});

describe("getGatedNewsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    mockAdminFrom.mockReset();
    cookieSubData = null;
  });

  it("returns null edition when not found", async () => {
    setEdition(null);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await getGatedNewsletter("2026-01-01");
    expect(res.edition).toBeNull();
  });

  it("truncates html_content to teaser for non-Pro users", async () => {
    const longHtml = "<p>" + "a".repeat(2000) + "</p>";
    setEdition({
      id: 1,
      edition_date: "2026-05-10",
      subject: "Weekly Digest",
      html_content: longHtml,
      fee_changes_count: 2,
      articles_count: 3,
      deals_count: 1,
      created_at: "2026-05-10T00:00:00Z",
      status: "sent",
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const res = await getGatedNewsletter("2026-05-10");
    expect(res.isPro).toBe(false);
    const visibleText = res.truncatedHtml.replace(/<[^>]*>/g, "").replace(/…$/, "");
    expect(visibleText.length).toBeLessThanOrEqual(820);
    expect(res.truncatedHtml.length).toBeLessThan(longHtml.length);
    expect(res.edition?.html_content).toBe(res.truncatedHtml);
  });

  it("scopes the query to status='sent' so drafts cannot leak", async () => {
    const captured: [string, unknown][] = [];
    setEdition(null, captured);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    await getGatedNewsletter("2026-05-10");

    expect(captured).toContainEqual(["status", "sent"]);
    expect(captured).toContainEqual(["edition_date", "2026-05-10"]);
  });

  it("returns full html_content for Pro users", async () => {
    const longHtml = "<p>" + "a".repeat(2000) + "</p>";
    setEdition({
      id: 1,
      edition_date: "2026-05-10",
      subject: "Weekly Digest",
      html_content: longHtml,
      fee_changes_count: 2,
      articles_count: 3,
      deals_count: 1,
      created_at: "2026-05-10T00:00:00Z",
      status: "sent",
    });
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    cookieSubData = { status: "trialing" };

    const res = await getGatedNewsletter("2026-05-10");
    expect(res.isPro).toBe(true);
    expect(res.edition?.html_content).toBe(longHtml);
    expect(res.truncatedHtml).toBe(longHtml);
  });
});
