import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockEnqueueJob = vi.fn();
vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/cohort/refresh/route";
import { NextResponse } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

function makeInsertChain() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));
  return { from, insert };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/cohort/refresh", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("calls enqueueJob with correct type and payload", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnqueueJob.mockResolvedValue(42);
    const { from, insert } = makeInsertChain();
    mockFrom.mockImplementation(from);

    await POST();

    expect(mockEnqueueJob).toHaveBeenCalledWith("refresh_cohort_metrics", {
      requested_by: "admin@test.com",
    });
  });

  it("inserts audit log with job_id as string", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnqueueJob.mockResolvedValue(7);
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await POST();

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cohort:refresh_queued",
        entity_type: "job_queue",
        entity_id: "7",
        admin_email: "admin@test.com",
      })
    );
  });

  it("inserts audit log with entity_id undefined when job_id is null", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnqueueJob.mockResolvedValue(null);
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await POST();

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: undefined })
    );
  });

  it("returns {ok: true, job_id} on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnqueueJob.mockResolvedValue(99);
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.job_id).toBe(99);
  });

  it("propagates 500 when enqueueJob throws", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnqueueJob.mockRejectedValue(new Error("queue down"));

    await expect(POST()).rejects.toThrow("queue down");
  });
});
