import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockSendCoAuthorInvitation } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSendCoAuthorInvitation: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendCoAuthorInvitation: mockSendCoAuthorInvitation,
}));

import { inviteCoAuthor, respondToInvite, listAcceptedCoAuthors } from "@/lib/article-co-authors";

function articleTable(article: { id: number; professional_id: number; title: string; status: string } | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: article, error: null }),
      }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
}

function professionalsTable(invitee: { id: number; name: string; email: string; status: string } | null) {
  return {
    select: vi.fn().mockReturnValue({
      ilike: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: invitee, error: null }),
        }),
      }),
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Owner Advisor" }, error: null }),
      }),
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendCoAuthorInvitation.mockResolvedValue(true);
});

describe("inviteCoAuthor", () => {
  it("refuses when the inviter does not own the article", async () => {
    const tables: Record<string, unknown> = {
      advisor_articles: articleTable({ id: 5, professional_id: 99, title: "T", status: "draft" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await inviteCoAuthor({ articleId: 5, invitedByProfessionalId: 1, coAuthorEmail: "x@y.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
  });

  it("refuses when the invitee has no advisor account", async () => {
    const tables: Record<string, unknown> = {
      advisor_articles: articleTable({ id: 5, professional_id: 1, title: "T", status: "draft" }),
      professionals: professionalsTable(null),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await inviteCoAuthor({ articleId: 5, invitedByProfessionalId: 1, coAuthorEmail: "x@y.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("creates the invite and emails the invitee", async () => {
    const insertedRow = {
      id: 11,
      article_id: 5,
      professional_id: 2,
      invited_by_professional_id: 1,
      status: "pending",
      responded_at: null,
      created_at: "2026-06-10T00:00:00Z",
    };
    const tables: Record<string, unknown> = {
      advisor_articles: articleTable({ id: 5, professional_id: 1, title: "Tax basics", status: "draft" }),
      professionals: professionalsTable({ id: 2, name: "Co Author", email: "co@firm.com", status: "active" }),
      article_co_authors: {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await inviteCoAuthor({ articleId: 5, invitedByProfessionalId: 1, coAuthorEmail: "co@firm.com" });
    expect(result.ok).toBe(true);
    expect(mockSendCoAuthorInvitation).toHaveBeenCalledWith("co@firm.com", "Co Author", "Owner Advisor", "Tax basics");
  });

  it("maps a unique violation to duplicate", async () => {
    const tables: Record<string, unknown> = {
      advisor_articles: articleTable({ id: 5, professional_id: 1, title: "T", status: "draft" }),
      professionals: professionalsTable({ id: 2, name: "Co", email: "co@firm.com", status: "active" }),
      article_co_authors: {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await inviteCoAuthor({ articleId: 5, invitedByProfessionalId: 1, coAuthorEmail: "co@firm.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("duplicate");
  });

  it("returns unavailable when the table has not been migrated", async () => {
    const tables: Record<string, unknown> = {
      advisor_articles: articleTable({ id: 5, professional_id: 1, title: "T", status: "draft" }),
      professionals: professionalsTable({ id: 2, name: "Co", email: "co@firm.com", status: "active" }),
      article_co_authors: {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "42P01", message: 'relation "article_co_authors" does not exist' },
            }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await inviteCoAuthor({ articleId: 5, invitedByProfessionalId: 1, coAuthorEmail: "co@firm.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });
});

describe("respondToInvite", () => {
  function coAuthorsTable(invite: { id: number; professional_id: number; status: string } | null) {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: invite, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    };
  }

  it("only the addressed professional may respond", async () => {
    const tables: Record<string, unknown> = {
      article_co_authors: coAuthorsTable({ id: 11, professional_id: 2, status: "pending" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await respondToInvite({ inviteId: 11, professionalId: 3, accept: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
  });

  it("accepts a pending invite", async () => {
    const tables: Record<string, unknown> = {
      article_co_authors: coAuthorsTable({ id: 11, professional_id: 2, status: "pending" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await respondToInvite({ inviteId: 11, professionalId: 2, accept: true });
    expect(result.ok).toBe(true);
  });

  it("rejects double-answering", async () => {
    const tables: Record<string, unknown> = {
      article_co_authors: coAuthorsTable({ id: 11, professional_id: 2, status: "accepted" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await respondToInvite({ inviteId: 11, professionalId: 2, accept: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("duplicate");
  });
});

describe("listAcceptedCoAuthors", () => {
  it("returns [] (not a throw) when the table is missing", async () => {
    const tables: Record<string, unknown> = {
      article_co_authors: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "42P01", message: "does not exist" },
              }),
            }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    await expect(listAcceptedCoAuthors(5)).resolves.toEqual([]);
  });

  it("returns public display rows for accepted co-authors", async () => {
    const tables: Record<string, unknown> = {
      article_co_authors: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ professional_id: 2 }],
                error: null,
              }),
            }),
          }),
        }),
      },
      professionals: {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 2, name: "Co Author", slug: "co-author", photo_url: null, firm_name: "Firm" }],
              error: null,
            }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await listAcceptedCoAuthors(5);
    expect(result).toEqual([
      { professional_id: 2, name: "Co Author", slug: "co-author", photo_url: null, firm_name: "Firm" },
    ]);
  });
});
