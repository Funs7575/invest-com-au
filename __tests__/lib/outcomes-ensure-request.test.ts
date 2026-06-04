import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

let existingOutcome: { review_token: string } | null = null;
let briefRow: {
  id: number;
  contact_email: string | null;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
} | null = null;
let insertError: { message: string } | null = null;
const insertSpy = vi.fn(() => Promise.resolve({ error: insertError }));

function outcomesBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) b[m] = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: existingOutcome, error: null }));
  b.insert = insertSpy;
  return b;
}
function briefBuilder() {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) b[m] = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: briefRow, error: null }));
  return b;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => (table === "advisor_auctions" ? briefBuilder() : outcomesBuilder()),
  })),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

import { ensureOutcomeRequestForBrief } from "@/lib/outcomes";

describe("ensureOutcomeRequestForBrief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingOutcome = null;
    briefRow = null;
    insertError = null;
  });

  it("reuses an existing review token (idempotent — no insert)", async () => {
    existingOutcome = { review_token: "existing-token-123" };
    const res = await ensureOutcomeRequestForBrief(5);
    expect(res).toEqual({ token: "existing-token-123" });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns null when the brief is not yet accepted", async () => {
    briefRow = {
      id: 5,
      contact_email: "c@x.com",
      accepted_at: null,
      accepted_by_professional_id: null,
      accepted_by_team_id: null,
    };
    const res = await ensureOutcomeRequestForBrief(5);
    expect(res).toBeNull();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns null when the brief doesn't exist", async () => {
    const res = await ensureOutcomeRequestForBrief(5);
    expect(res).toBeNull();
  });

  it("creates a row + returns a fresh 48-hex token for an accepted brief", async () => {
    briefRow = {
      id: 5,
      contact_email: "c@x.com",
      accepted_at: "2026-01-01T00:00:00Z",
      accepted_by_professional_id: 7,
      accepted_by_team_id: null,
    };
    const res = await ensureOutcomeRequestForBrief(5);
    expect(res).not.toBeNull();
    expect(res!.token).toMatch(/^[0-9a-f]{48}$/);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null when the insert fails", async () => {
    briefRow = {
      id: 5,
      contact_email: "c@x.com",
      accepted_at: "2026-01-01T00:00:00Z",
      accepted_by_professional_id: 7,
      accepted_by_team_id: null,
    };
    insertError = { message: "boom" };
    const res = await ensureOutcomeRequestForBrief(5);
    expect(res).toBeNull();
  });
});
