import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the Pro Squad brief-claim state-machine helpers
 * (MM04). Covers the four core transitions:
 *
 *   - claim:    inserts when nobody claims, idempotent on re-claim,
 *               409-like outcome when another member already claimed.
 *   - handoff:  flips own row to handed_off + stamps release_at.
 *   - complete: flips own row to completed (idempotent).
 *   - release:  flips own row to released (idempotent).
 *
 * The admin client is mocked with a per-table table mock factory so each
 * helper can swap behaviour for the specific query path it walks.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// Import AFTER mocks so the module sees the mocked admin client.
import {
  claimBriefForMember,
  completeBriefAssignment,
  handoffBriefAssignment,
  releaseBriefAssignment,
} from "@/lib/team-brief-assignments";

// ── Tiny chainable mock-builder factory ────────────────────────────────────────

interface ChainOptions {
  maybeSingle?: { data: unknown; error?: unknown };
  single?: { data: unknown; error?: unknown };
}

function chain(opts: ChainOptions = {}) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "order",
    "limit",
  ]) {
    builder[m] = vi.fn(passthrough);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingle ?? { data: null, error: null }),
  );
  builder.single = vi.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null }),
  );
  return builder;
}

// ── claim ─────────────────────────────────────────────────────────────────────

describe("claimBriefForMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a fresh claim when no active assignment exists", async () => {
    // 1st .from("team_brief_assignments") → look up active claim → none
    // 2nd .from("team_brief_assignments") → look up prior own row → none
    // 3rd .from("team_brief_assignments") → insert row
    const activeLookup = chain({ maybeSingle: { data: null } });
    const priorOwn = chain({ maybeSingle: { data: null } });
    const insertRow = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    const insert = chain({ single: { data: insertRow } });
    mockFrom
      .mockReturnValueOnce(activeLookup)
      .mockReturnValueOnce(priorOwn)
      .mockReturnValueOnce(insert);

    const result = await claimBriefForMember({
      briefId: 10,
      teamId: 7,
      professionalId: 42,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(result.row.professional_id).toBe(42);
      expect(result.row.status).toBe("claimed");
    }
  });

  it("is idempotent — re-claiming your own active row returns created=false", async () => {
    const existing = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: existing } }));

    const result = await claimBriefForMember({
      briefId: 10,
      teamId: 7,
      professionalId: 42,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.row.id).toBe(1);
    }
    // Only the initial active-lookup call — no insert / no update.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns already_claimed_by_other when another member has the active claim", async () => {
    const someoneElse = {
      id: 2,
      brief_id: 10,
      team_id: 7,
      professional_id: 99, // a different member
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: someoneElse } }));

    const result = await claimBriefForMember({
      briefId: 10,
      teamId: 7,
      professionalId: 42,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("already_claimed_by_other");
      expect(result.row.professional_id).toBe(99);
    }
  });

  it("re-activates a prior released row instead of inserting a duplicate", async () => {
    // No currently active claim, but the caller had a row previously
    // (status=released) — the UNIQUE constraint on (brief_id, professional_id)
    // means we have to UPDATE rather than INSERT a second row.
    const prior = {
      id: 3,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "released",
      notes: null,
      claimed_at: "2026-05-13T00:00:00Z",
      released_at: "2026-05-13T10:00:00Z",
    };
    const updatedRow = { ...prior, status: "claimed", released_at: null };
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: null } })) // active lookup
      .mockReturnValueOnce(chain({ maybeSingle: { data: prior } })) // prior own
      .mockReturnValueOnce(chain({ single: { data: updatedRow } })); // update

    const result = await claimBriefForMember({
      briefId: 10,
      teamId: 7,
      professionalId: 42,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
      expect(result.row.status).toBe("claimed");
      expect(result.row.id).toBe(3);
    }
  });
});

// ── handoff ───────────────────────────────────────────────────────────────────

describe("handoffBriefAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flips the caller's row to handed_off and stamps released_at", async () => {
    const own = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    const updated = {
      ...own,
      status: "handed_off",
      released_at: "2026-05-14T01:00:00Z",
      notes: "Passing to Sarah",
    };
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: own } })) // lookup
      .mockReturnValueOnce(chain({ single: { data: updated } })); // update

    const result = await handoffBriefAssignment({
      briefId: 10,
      teamId: 7,
      fromProfessionalId: 42,
      toProfessionalId: null,
      note: "Passing to Sarah",
    });

    expect(result).not.toBeNull();
    expect(result?.fromRow.status).toBe("handed_off");
    expect(result?.fromRow.notes).toBe("Passing to Sarah");
    expect(result?.toRow).toBeNull();
  });

  it("returns null when the caller has no claim on the brief", async () => {
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: null } }));

    const result = await handoffBriefAssignment({
      briefId: 10,
      teamId: 7,
      fromProfessionalId: 42,
      toProfessionalId: null,
      note: null,
    });
    expect(result).toBeNull();
  });
});

// ── complete + release ────────────────────────────────────────────────────────

describe("completeBriefAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flips the caller's row to completed", async () => {
    const own = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    const updated = { ...own, status: "completed" };
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: own } }))
      .mockReturnValueOnce(chain({ single: { data: updated } }));

    const result = await completeBriefAssignment({
      briefId: 10,
      professionalId: 42,
    });
    expect(result?.status).toBe("completed");
  });

  it("is idempotent — completing an already-completed row is a no-op", async () => {
    const own = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "completed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: own } }));

    const result = await completeBriefAssignment({
      briefId: 10,
      professionalId: 42,
    });
    expect(result?.status).toBe("completed");
    expect(mockFrom).toHaveBeenCalledTimes(1); // no second update call
  });
});

describe("releaseBriefAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flips the caller's row to released and stamps released_at", async () => {
    const own = {
      id: 1,
      brief_id: 10,
      team_id: 7,
      professional_id: 42,
      status: "claimed",
      notes: null,
      claimed_at: "2026-05-14T00:00:00Z",
      released_at: null,
    };
    const updated = {
      ...own,
      status: "released",
      released_at: "2026-05-14T02:00:00Z",
    };
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: own } }))
      .mockReturnValueOnce(chain({ single: { data: updated } }));

    const result = await releaseBriefAssignment({
      briefId: 10,
      professionalId: 42,
    });
    expect(result?.status).toBe("released");
    expect(result?.released_at).toBeTruthy();
  });

  it("returns null when the caller has no claim row", async () => {
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: null } }));
    const result = await releaseBriefAssignment({
      briefId: 10,
      professionalId: 42,
    });
    expect(result).toBeNull();
  });
});
