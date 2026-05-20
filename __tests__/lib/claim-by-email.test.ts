import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  CLAIMABLE_TABLES,
  claimByEmail,
  claimAllByEmail,
  type ClaimableTable,
} from "@/lib/claim/by-email";

function chainUpdate(result: { error: { message: string } | null; count: number | null }) {
  const headSpy = vi.fn().mockResolvedValue(result);
  const selectSpy = vi.fn().mockReturnValue(headSpy());
  const isSpy = vi.fn().mockReturnValue({ select: selectSpy });
  const eqSpy = vi.fn().mockReturnValue({ is: isSpy, select: selectSpy });
  const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy });
  return { from: vi.fn().mockReturnValue({ update: updateSpy }), eqSpy, isSpy };
}

const SPEC: ClaimableTable = {
  table: "quiz_leads",
  emailColumn: "email",
  userColumn: "user_id",
  claimedAtColumn: "converted_at",
};

describe("CLAIMABLE_TABLES registry", () => {
  it("covers the 8 documented almost-account tables", () => {
    const names = CLAIMABLE_TABLES.map((t) => t.table).sort();
    expect(names).toEqual(
      [
        "advisor_applications",
        "email_captures",
        "newsletter_subscribers",
        "professional_leads",
        "professional_reviews",
        "qa_questions",
        "quiz_leads",
        "user_reviews",
      ].sort(),
    );
  });

  it("every entry has emailColumn", () => {
    for (const t of CLAIMABLE_TABLES) {
      expect(t.emailColumn).toBeTruthy();
    }
  });
});

describe("claimByEmail", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns 0 + empty_email error when email is whitespace", async () => {
    const result = await claimByEmail({
      email: "   ",
      authUserId: "u-1",
      spec: SPEC,
    });
    expect(result.claimed).toBe(0);
    expect(result.error).toBe("empty_email");
  });

  it("returns 0 when there's nothing to stamp (no userColumn, no claimedAtColumn)", async () => {
    const result = await claimByEmail({
      email: "x@y.com",
      authUserId: "u-1",
      spec: { table: "x", emailColumn: "email", userColumn: null, claimedAtColumn: null },
    });
    expect(result.claimed).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("lowercases + trims the email before matching", async () => {
    const { from, eqSpy } = chainUpdate({ error: null, count: 1 });
    mockFrom.mockImplementation(from);
    await claimByEmail({
      email: "  ALICE@Example.com  ",
      authUserId: "u-1",
      spec: SPEC,
    });
    expect(eqSpy).toHaveBeenCalledWith("email", "alice@example.com");
  });

  it("reports the supabase error message back to caller", async () => {
    const { from } = chainUpdate({ error: { message: "boom" }, count: null });
    mockFrom.mockImplementation(from);
    const result = await claimByEmail({
      email: "x@y.com",
      authUserId: "u-1",
      spec: SPEC,
    });
    expect(result.error).toBe("boom");
    expect(result.claimed).toBe(0);
  });
});

describe("claimAllByEmail", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns one result per CLAIMABLE_TABLES entry", async () => {
    const { from } = chainUpdate({ error: null, count: 0 });
    mockFrom.mockImplementation(from);
    const results = await claimAllByEmail({ email: "x@y.com", authUserId: "u-1" });
    expect(results).toHaveLength(CLAIMABLE_TABLES.length);
    for (let i = 0; i < CLAIMABLE_TABLES.length; i++) {
      expect(results[i]!.table).toBe(CLAIMABLE_TABLES[i]!.table);
    }
  });
});
