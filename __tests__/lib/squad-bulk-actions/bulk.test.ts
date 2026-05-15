import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockClaim, mockRelease, mockCreateReferral, mockFrom } = vi.hoisted(() => ({
  mockClaim: vi.fn(),
  mockRelease: vi.fn(),
  mockCreateReferral: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/team-brief-assignments", () => ({
  claimBriefForMember: mockClaim,
  releaseBriefAssignment: mockRelease,
}));
vi.mock("@/lib/team-brief-referrals", () => ({
  createReferral: mockCreateReferral,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { MAX_BULK, runBulkAction } from "@/lib/squad-bulk-actions";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: team_brief_decisions insert succeeds.
  mockFrom.mockImplementation(() => ({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
});

describe("runBulkAction", () => {
  it("returns empty summary for no briefIds", async () => {
    const result = await runBulkAction({
      action: "claim",
      teamId: 1,
      professionalId: 2,
      briefIds: [],
    });
    expect(result.results).toEqual([]);
    expect(result.summary).toEqual({ total: 0, ok: 0, failed: 0 });
  });

  it("rejects bulk above the 50-cap", async () => {
    const briefIds = Array.from({ length: MAX_BULK + 1 }, (_, i) => i + 1);
    await expect(
      runBulkAction({
        action: "claim",
        teamId: 1,
        professionalId: 2,
        briefIds,
      }),
    ).rejects.toThrow(/bulk cap/);
  });

  it("counts successes + failures per brief (action=claim)", async () => {
    mockClaim
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce({ ok: true });
    const result = await runBulkAction({
      action: "claim",
      teamId: 1,
      professionalId: 2,
      briefIds: [10, 11, 12],
    });
    expect(result.summary).toEqual({ total: 3, ok: 2, failed: 1 });
    expect(result.results.filter((r) => !r.ok)[0]?.brief_id).toBe(11);
  });

  it("dispatches decline to team_brief_decisions insert", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation(() => ({ insert: insertSpy }));
    const result = await runBulkAction({
      action: "decline",
      teamId: 1,
      professionalId: 2,
      briefIds: [10, 11],
      reason: "out of scope",
    });
    expect(result.summary.ok).toBe(2);
    expect(insertSpy).toHaveBeenCalledTimes(2);
    expect(insertSpy.mock.calls[0]?.[0]).toMatchObject({
      team_id: 1,
      brief_id: 10,
      decision: "not_for_us",
      reason: "out of scope",
    });
  });

  it("treats decline 23505 unique violation as idempotent (still ok)", async () => {
    const insertSpy = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "dup" },
    });
    mockFrom.mockImplementation(() => ({ insert: insertSpy }));
    const result = await runBulkAction({
      action: "decline",
      teamId: 1,
      professionalId: 2,
      briefIds: [10],
    });
    expect(result.summary.ok).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  it("refer dispatches to createReferral", async () => {
    mockCreateReferral.mockResolvedValue({ id: 1 });
    const result = await runBulkAction({
      action: "refer",
      teamId: 1,
      professionalId: 2,
      briefIds: [10, 11],
      toTeamId: 99,
    });
    expect(mockCreateReferral).toHaveBeenCalledTimes(2);
    expect(mockCreateReferral.mock.calls[0]?.[0]).toMatchObject({
      briefId: 10,
      fromTeamId: 1,
      toTeamId: 99,
      fromProfessionalId: 2,
    });
    expect(result.summary.ok).toBe(2);
  });

  it("refer without toTeamId fails per-brief but doesn't throw", async () => {
    const result = await runBulkAction({
      action: "refer",
      teamId: 1,
      professionalId: 2,
      briefIds: [10],
    });
    expect(result.summary.ok).toBe(0);
    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.error).toMatch(/toTeamId/);
  });
});
