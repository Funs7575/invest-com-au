import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));
vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { linkProfessionalAuthUser } from "@/lib/professional-auth-link";

/** Build a chainable PostgREST-style admin stub whose terminal `.select()`
 *  resolves to `result`, capturing each call's arguments for assertions. */
function buildAdmin(result: { data: unknown; error: unknown }) {
  const calls: Record<string, unknown[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  for (const m of ["update", "is", "eq", "in"]) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls[m] = args;
      return builder;
    });
  }
  builder.select = vi.fn((...args: unknown[]) => {
    calls.select = args;
    return Promise.resolve(result);
  });
  const from = vi.fn((...args: unknown[]) => {
    calls.from = args;
    return builder;
  });
  return { client: { from }, calls };
}

describe("linkProfessionalAuthUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links an unlinked professional on email match and returns the count", async () => {
    const { client, calls } = buildAdmin({ data: [{ id: 42 }], error: null });
    mockCreateAdminClient.mockReturnValue(client);

    const n = await linkProfessionalAuthUser("auth-uuid-1", "advisor@example.com");

    expect(n).toBe(1);
    expect(calls.from).toEqual(["professionals"]);
    // Sets the link + a login timestamp.
    expect((calls.update[0] as Record<string, unknown>).auth_user_id).toBe("auth-uuid-1");
    expect((calls.update[0] as Record<string, unknown>).last_login_at).toBeTypeOf("string");
    // Only ever fills a NULL link (no takeover), scoped by verified email + live status.
    expect(calls.is).toEqual(["auth_user_id", null]);
    expect(calls.eq).toEqual(["email", "advisor@example.com"]);
    expect(calls.in).toEqual(["status", ["active", "pending"]]);
  });

  it("returns 0 and never queries when userId or email is missing", async () => {
    expect(await linkProfessionalAuthUser(null, "a@b.com")).toBe(0);
    expect(await linkProfessionalAuthUser("u1", null)).toBe(0);
    expect(await linkProfessionalAuthUser("u1", "")).toBe(0);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("returns 0 when no row matched (already linked or not a professional)", async () => {
    const { client } = buildAdmin({ data: [], error: null });
    mockCreateAdminClient.mockReturnValue(client);
    expect(await linkProfessionalAuthUser("u1", "nobody@example.com")).toBe(0);
  });

  it("fails soft (returns 0) on a database error", async () => {
    const { client } = buildAdmin({ data: null, error: { message: "boom" } });
    mockCreateAdminClient.mockReturnValue(client);
    expect(await linkProfessionalAuthUser("u1", "a@b.com")).toBe(0);
  });

  it("never throws even if the admin client blows up", async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error("no service role key");
    });
    await expect(linkProfessionalAuthUser("u1", "a@b.com")).resolves.toBe(0);
  });
});
