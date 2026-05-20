import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getKindPreferences,
  setDefaultKind,
  recordSwitch,
} from "@/lib/account-preferences";

const PRINCIPAL_ID = "p-1";

const PREF_ROW = {
  principal_id: PRINCIPAL_ID,
  default_kind: "advisor",
  default_team_id: null,
  last_active_kind: "investor",
  last_active_team_id: null,
  last_active_at: "2026-05-19T00:00:00Z",
};

function chainMaybeSingle(result: { data: unknown; error: { message: string } | null }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function chainUpsert(error: { message: string } | null) {
  const upsert = vi.fn().mockResolvedValue({ error });
  return { from: vi.fn().mockReturnValue({ upsert }), upsert };
}

function chainInsert(error: { message: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return { from: vi.fn().mockReturnValue({ insert }), insert };
}

describe("getKindPreferences", () => {
  beforeEach(() => mockFrom.mockReset());

  it("maps a row to camelCase Preferences", async () => {
    mockFrom.mockReturnValue(chainMaybeSingle({ data: PREF_ROW, error: null }));
    const prefs = await getKindPreferences(PRINCIPAL_ID);
    expect(prefs).toEqual({
      principalId: PRINCIPAL_ID,
      defaultKind: "advisor",
      defaultTeamId: null,
      lastActiveKind: "investor",
      lastActiveTeamId: null,
      lastActiveAt: "2026-05-19T00:00:00Z",
    });
  });

  it("returns null on supabase error", async () => {
    mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: { message: "boom" } }));
    expect(await getKindPreferences(PRINCIPAL_ID)).toBeNull();
  });

  it("returns null when no row exists", async () => {
    mockFrom.mockReturnValue(chainMaybeSingle({ data: null, error: null }));
    expect(await getKindPreferences(PRINCIPAL_ID)).toBeNull();
  });
});

describe("setDefaultKind", () => {
  beforeEach(() => mockFrom.mockReset());

  it("upserts the default kind", async () => {
    const { from, upsert } = chainUpsert(null);
    mockFrom.mockImplementation(from);
    const ok = await setDefaultKind({
      principalId: PRINCIPAL_ID,
      kind: "advisor",
      teamId: null,
    });
    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        principal_id: PRINCIPAL_ID,
        default_kind: "advisor",
        default_team_id: null,
      }),
      { onConflict: "principal_id" },
    );
  });

  it("returns false on error", async () => {
    const { from } = chainUpsert({ message: "boom" });
    mockFrom.mockImplementation(from);
    expect(
      await setDefaultKind({ principalId: PRINCIPAL_ID, kind: "advisor" }),
    ).toBe(false);
  });
});

describe("recordSwitch", () => {
  beforeEach(() => mockFrom.mockReset());

  it("writes both the preferences upsert and the log insert", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "account_kind_preferences") return { upsert };
      if (table === "account_kind_switch_log") return { insert };
      throw new Error(`unexpected table: ${table}`);
    });
    const ok = await recordSwitch({
      principalId: PRINCIPAL_ID,
      fromKind: "advisor",
      fromTeamId: null,
      toKind: "investor",
      toTeamId: null,
      source: "switcher",
    });
    expect(ok).toBe(true);
    expect(upsert).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        principal_id: PRINCIPAL_ID,
        from_kind: "advisor",
        to_kind: "investor",
        source: "switcher",
      }),
    );
  });

  it("returns false when either write fails", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "account_kind_preferences") return { upsert };
      if (table === "account_kind_switch_log") return { insert };
      throw new Error(`unexpected table: ${table}`);
    });
    const ok = await recordSwitch({
      principalId: PRINCIPAL_ID,
      fromKind: null,
      toKind: "advisor",
      source: "chooser",
    });
    expect(ok).toBe(false);
  });
});
