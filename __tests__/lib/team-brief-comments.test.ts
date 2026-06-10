import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { getCommentsForBrief, addComment } from "@/lib/team-brief-comments";

/** Membership + brief-ownership lookups, shared by every access path. */
function accessTables(opts: { member: boolean; briefOwned: boolean }) {
  return {
    expert_team_members: {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: opts.member ? { id: 1 } : null, error: null }),
            }),
          }),
        }),
      }),
    },
    advisor_auctions: {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: opts.briefOwned ? { id: 500 } : null, error: null }),
          }),
        }),
      }),
    },
  } as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCommentsForBrief", () => {
  it("returns forbidden when the caller is not an active team member", async () => {
    const tables = accessTables({ member: false, briefOwned: true });
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await getCommentsForBrief(7, 10, 500);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns forbidden when the brief belongs to a different team", async () => {
    const tables = accessTables({ member: true, briefOwned: false });
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await getCommentsForBrief(7, 10, 500);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("returns comments with author display data attached", async () => {
    const tables = accessTables({ member: true, briefOwned: true });
    tables.team_brief_comments = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 1,
                    brief_id: 500,
                    team_id: 10,
                    author_professional_id: 7,
                    body: "Client prefers calls after 3pm.",
                    created_at: "2026-06-10T00:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    tables.professionals = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 7, name: "Dana Advisor", photo_url: null }],
          error: null,
        }),
      }),
    };
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await getCommentsForBrief(7, 10, 500);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]?.author_name).toBe("Dana Advisor");
      expect(result.comments[0]?.body).toBe("Client prefers calls after 3pm.");
    }
  });

  it("returns unavailable when the table has not been migrated yet", async () => {
    const tables = accessTables({ member: true, briefOwned: true });
    tables.team_brief_comments = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "42P01", message: 'relation "team_brief_comments" does not exist' },
              }),
            }),
          }),
        }),
      }),
    };
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await getCommentsForBrief(7, 10, 500);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("addComment", () => {
  it("inserts and returns the comment with author attached", async () => {
    const tables = accessTables({ member: true, briefOwned: true });
    tables.team_brief_comments = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 2,
              brief_id: 500,
              team_id: 10,
              author_professional_id: 7,
              body: "I'll take the tax side.",
              created_at: "2026-06-10T01:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    };
    tables.professionals = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { name: "Dana Advisor", photo_url: null }, error: null }),
        }),
      }),
    };
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await addComment({ professionalId: 7, teamId: 10, briefId: 500, body: "I'll take the tax side." });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.comment.id).toBe(2);
      expect(result.comment.author_name).toBe("Dana Advisor");
    }
  });

  it("refuses to write for a non-member", async () => {
    const tables = accessTables({ member: false, briefOwned: true });
    mockFrom.mockImplementation((table: string) => tables[table] ?? {});

    const result = await addComment({ professionalId: 7, teamId: 10, briefId: 500, body: "hi" });
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });
});
