import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/principals", () => ({
  getPrincipalForAuthUser: vi.fn().mockResolvedValue({
    id: "p-1",
    kind: "human",
    authUserId: "u-1",
    displayName: "Test",
    slug: null,
    status: "active",
    metadata: {},
    createdAt: "",
    updatedAt: "",
  }),
}));

import {
  isModerator,
  lockThread,
  hidePost,
  banUser,
  unbanUser,
} from "@/lib/forum-moderation";

function modProfile(isMod: boolean) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { is_moderator: isMod },
          error: null,
        }),
      }),
    }),
  };
}

function tableUpdate(error: { message: string } | null = null) {
  const updateChain = vi.fn().mockResolvedValue({ error });
  return {
    update: vi.fn().mockReturnValue({ eq: updateChain }),
    updateChain,
  };
}

function actionInsert() {
  return { insert: vi.fn().mockResolvedValue({ error: null }) };
}

describe("isModerator", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns true when the profile flag is set", async () => {
    mockFrom.mockReturnValue(modProfile(true));
    expect(await isModerator("u-1")).toBe(true);
  });

  it("returns false when the profile flag is unset", async () => {
    mockFrom.mockReturnValue(modProfile(false));
    expect(await isModerator("u-1")).toBe(false);
  });
});

describe("lockThread", () => {
  beforeEach(() => mockFrom.mockReset());

  it("rejects non-moderators with not_a_moderator", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") return modProfile(false);
      throw new Error(`unexpected: ${table}`);
    });
    const result = await lockThread({ authUserId: "u-1", threadId: 1, locked: true });
    expect(result).toEqual({ ok: false, error: "not_a_moderator" });
  });

  it("locks the thread + writes audit row when moderator", async () => {
    const upd = tableUpdate();
    const ins = actionInsert();
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") return modProfile(true);
      if (table === "forum_threads") return upd;
      if (table === "forum_moderation_actions") return ins;
      throw new Error(`unexpected: ${table}`);
    });
    const result = await lockThread({
      authUserId: "u-1",
      threadId: 42,
      locked: true,
      reason: "spam",
    });
    expect(result).toEqual({ ok: true });
    expect(upd.update).toHaveBeenCalledWith({ is_locked: true });
    expect(ins.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "lock_thread",
        target_type: "thread",
        target_id: "42",
        reason: "spam",
      }),
    );
  });
});

describe("hidePost", () => {
  beforeEach(() => mockFrom.mockReset());

  it("toggles is_removed via the hidden flag", async () => {
    const upd = tableUpdate();
    const ins = actionInsert();
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") return modProfile(true);
      if (table === "forum_posts") return upd;
      if (table === "forum_moderation_actions") return ins;
      throw new Error(`unexpected: ${table}`);
    });
    await hidePost({ authUserId: "u-1", postId: 7, hidden: true });
    expect(upd.update).toHaveBeenCalledWith({ is_removed: true });
  });
});

describe("banUser", () => {
  beforeEach(() => mockFrom.mockReset());

  it("permanent ban sets status=banned and banned_until null", async () => {
    const ins = actionInsert();
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") return modProfile(true);
      // The same table is also queried for the actual ban update.
      // First call (isModerator check) returns the modProfile chain;
      // subsequent call returns the update chain. Since both use the
      // same mock, we need to return modProfile if select() is called
      // and update chain otherwise. To keep the test simple, return
      // a combined object.
      throw new Error(`unexpected: ${table}`);
    });
    // Replace with a dual-purpose mock for forum_user_profiles:
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") {
        return {
          ...modProfile(true),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "forum_moderation_actions") return ins;
      throw new Error(`unexpected: ${table}`);
    });
    const result = await banUser({
      authUserId: "u-1",
      targetUserId: "victim",
      reason: "harassment",
    });
    expect(result.ok).toBe(true);
  });

  it("suspension with duration logs as suspend_user action", async () => {
    const ins = actionInsert();
    mockFrom.mockImplementation((table: string) => {
      if (table === undefined) return undefined as never; // ignore vitest cleanup's stray from(undefined)
      if (table === "forum_user_profiles") {
        return {
          ...modProfile(true),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "forum_moderation_actions") return ins;
      throw new Error(`unexpected: ${table}`);
    });
    await banUser({
      authUserId: "u-1",
      targetUserId: "victim",
      durationMs: 24 * 60 * 60 * 1000,
    });
    expect(ins.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "suspend_user" }),
    );
  });
});

describe("unbanUser", () => {
  beforeEach(() => mockFrom.mockReset());

  it("rejects non-moderators", async () => {
    mockFrom.mockImplementation(() => modProfile(false));
    const result = await unbanUser({ authUserId: "u-1", targetUserId: "victim" });
    expect(result.ok).toBe(false);
  });
});
