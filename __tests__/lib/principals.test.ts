import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { getPrincipalForAuthUser, getPrincipalById } from "@/lib/principals";

function chainMaybeSingle(result: { data: unknown; error: { message: string } | null }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(result),
        }),
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

const SAMPLE_ROW = {
  id: "p-1",
  kind: "human",
  auth_user_id: "u-1",
  display_name: "Test User",
  slug: null,
  status: "active",
  metadata: { foo: "bar" },
  created_at: "2026-05-19T00:00:00Z",
  updated_at: "2026-05-19T00:00:00Z",
};

describe("principals", () => {
  beforeEach(() => mockFrom.mockReset());

  describe("getPrincipalForAuthUser", () => {
    it("maps a row to a Principal object", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: SAMPLE_ROW, error: null }));
      const result = await getPrincipalForAuthUser("u-1");
      expect(result).toEqual({
        id: "p-1",
        kind: "human",
        authUserId: "u-1",
        displayName: "Test User",
        slug: null,
        status: "active",
        metadata: { foo: "bar" },
        createdAt: "2026-05-19T00:00:00Z",
        updatedAt: "2026-05-19T00:00:00Z",
      });
    });

    it("returns null on supabase error", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: { message: "boom" } }));
      expect(await getPrincipalForAuthUser("u-1")).toBeNull();
    });

    it("returns null when no row exists", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: null }));
      expect(await getPrincipalForAuthUser("missing")).toBeNull();
    });

    it("treats missing metadata as empty object", async () => {
      mockFrom.mockReturnValue(
        chainMaybeSingle({ data: { ...SAMPLE_ROW, metadata: null }, error: null }),
      );
      const result = await getPrincipalForAuthUser("u-1");
      expect(result?.metadata).toEqual({});
    });
  });

  describe("getPrincipalById", () => {
    it("maps a row to a Principal", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: SAMPLE_ROW, error: null }));
      const result = await getPrincipalById("p-1");
      expect(result?.id).toBe("p-1");
      expect(result?.displayName).toBe("Test User");
    });

    it("returns null on error", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: { message: "boom" } }));
      expect(await getPrincipalById("p-1")).toBeNull();
    });

    it("returns null when no row found", async () => {
      mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: null }));
      expect(await getPrincipalById("missing")).toBeNull();
    });
  });
});
