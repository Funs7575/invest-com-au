import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  SHORTLIST_MAX,
  ShortlistError,
  addToShortlist,
  removeFromShortlist,
  updateNote,
} from "@/lib/brief-shortlist";

beforeEach(() => {
  vi.clearAllMocks();
});

function countMock(value: number) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: value, error: null, data: null }),
    }),
  };
}

function insertSuccessMock() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 1, brief_id: 5 }, error: null }),
      }),
    }),
  };
}

describe("addToShortlist", () => {
  it("inserts when under the 5-max limit", async () => {
    mockFrom
      .mockImplementationOnce(() => countMock(2))
      .mockImplementationOnce(() => insertSuccessMock());
    const row = await addToShortlist({
      briefId: 5,
      providerKind: "professional",
      providerId: 11,
      addedByEmail: "x@y.com",
    });
    expect(row.id).toBe(1);
  });

  it("throws limit_reached when at the 5-max", async () => {
    mockFrom.mockImplementationOnce(() => countMock(SHORTLIST_MAX));
    await expect(
      addToShortlist({
        briefId: 5,
        providerKind: "professional",
        providerId: 11,
        addedByEmail: "x@y.com",
      }),
    ).rejects.toThrow(/limit_reached/);
  });

  it("throws duplicate on 23505 unique violation", async () => {
    mockFrom
      .mockImplementationOnce(() => countMock(0))
      .mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "23505", message: "dup" },
            }),
          }),
        }),
      }));
    await expect(
      addToShortlist({
        briefId: 5,
        providerKind: "professional",
        providerId: 11,
        addedByEmail: "x@y.com",
      }),
    ).rejects.toThrow(/duplicate/);
  });
});

describe("removeFromShortlist", () => {
  it("deletes when owner email matches", async () => {
    const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 1, added_by_email: "x@y.com" },
              error: null,
            }),
        }),
      }),
      delete: vi.fn().mockReturnValue({ eq: deleteEq }),
    }));
    await removeFromShortlist(1, "x@y.com");
    expect(deleteEq).toHaveBeenCalled();
  });

  it("throws not_owner when email mismatches", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 1, added_by_email: "a@b.com" },
              error: null,
            }),
        }),
      }),
      delete: vi.fn(),
    }));
    await expect(removeFromShortlist(1, "x@y.com")).rejects.toThrow(/not_owner/);
  });

  it("throws not_found when row is missing", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));
    await expect(removeFromShortlist(1, "x@y.com")).rejects.toThrow(/not_found/);
  });
});

describe("updateNote", () => {
  it("updates note when owner email matches", async () => {
    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 1, added_by_email: "x@y.com" },
              error: null,
            }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: updateEq }),
    }));
    await updateNote({ shortlistId: 1, note: "good fit", ownerEmail: "x@y.com" });
    expect(updateEq).toHaveBeenCalled();
  });

  it("truncates notes longer than 1000 chars", async () => {
    let captured = "";
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 1, added_by_email: "x@y.com" },
              error: null,
            }),
        }),
      }),
      update: vi.fn().mockImplementation((row: Record<string, unknown>) => {
        captured = (row.note as string) ?? "";
        return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    }));
    await updateNote({
      shortlistId: 1,
      note: "x".repeat(2000),
      ownerEmail: "x@y.com",
    });
    expect(captured.length).toBe(1000);
  });
});

describe("ShortlistError", () => {
  it("preserves code on construction", () => {
    const e = new ShortlistError("duplicate");
    expect(e.code).toBe("duplicate");
    expect(e.name).toBe("ShortlistError");
  });
});
