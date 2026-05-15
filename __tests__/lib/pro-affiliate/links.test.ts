import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared mocks need to be vi.hoisted so the factory closure sees them.
const {
  mockSelectMaybeSingle,
  mockInsertSingle,
  mockInsertSingleError,
} = vi.hoisted(() => ({
  mockSelectMaybeSingle: vi.fn(),
  mockInsertSingle: vi.fn(),
  mockInsertSingleError: { current: null as null | { code: string } },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: mockSelectMaybeSingle,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () =>
            mockInsertSingleError.current
              ? Promise.resolve({ data: null, error: mockInsertSingleError.current })
              : mockInsertSingle(),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { getOrCreateLink } from "@/lib/pro-affiliate/links";

describe("getOrCreateLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertSingleError.current = null;
  });

  it("returns the existing row if one is already present (idempotency)", async () => {
    const existing = {
      id: 1,
      pro_slug: "jane-doe",
      pro_kind: "professional",
      share_token: "ABCDEF1234",
      created_at: "2026-05-01T00:00:00Z",
      last_clicked_at: null,
      click_count: 0,
      signup_count: 0,
      brief_count: 0,
    };
    mockSelectMaybeSingle.mockResolvedValueOnce({ data: existing });

    const link = await getOrCreateLink({
      proSlug: "jane-doe",
      proKind: "professional",
    });

    expect(link).toEqual(existing);
    expect(mockInsertSingle).not.toHaveBeenCalled();
  });

  it("inserts a fresh row with a 10-char token when no row exists", async () => {
    mockSelectMaybeSingle.mockResolvedValueOnce({ data: null });
    mockInsertSingle.mockResolvedValueOnce({
      data: {
        id: 7,
        pro_slug: "team-alpha",
        pro_kind: "team",
        share_token: "ZyXwVu9876",
        created_at: "2026-05-14T00:00:00Z",
        last_clicked_at: null,
        click_count: 0,
        signup_count: 0,
        brief_count: 0,
      },
      error: null,
    });

    const link = await getOrCreateLink({
      proSlug: "team-alpha",
      proKind: "team",
    });

    expect(link?.share_token).toHaveLength(10);
    expect(link?.pro_kind).toBe("team");
  });

  it("recovers from a concurrent insert race (23505) by re-reading", async () => {
    // First select: no row. Insert: fails with conflict. Second select: row exists.
    mockSelectMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: 9,
          pro_slug: "jane-doe",
          pro_kind: "professional",
          share_token: "RACE777777",
          created_at: "2026-05-14T00:00:00Z",
          last_clicked_at: null,
          click_count: 0,
          signup_count: 0,
          brief_count: 0,
        },
      });
    mockInsertSingleError.current = { code: "23505" };

    const link = await getOrCreateLink({
      proSlug: "jane-doe",
      proKind: "professional",
    });

    expect(link?.share_token).toBe("RACE777777");
  });

  it("returns null when insert fails for non-conflict reasons", async () => {
    mockSelectMaybeSingle.mockResolvedValueOnce({ data: null });
    mockInsertSingleError.current = { code: "PGRSTXX" };

    const link = await getOrCreateLink({
      proSlug: "jane-doe",
      proKind: "professional",
    });

    expect(link).toBeNull();
  });
});
