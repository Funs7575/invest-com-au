import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockEnqueueJob = vi.fn();
vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...a: unknown[]) => mockEnqueueJob(...a),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/content/batch-generate/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const CALENDAR_ITEMS = [
  { id: 1, title: "Article One" },
  { id: 2, title: "Article Two" },
  { id: 3, title: "Article Three" },
];

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/batch-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupCalendarMock(data: unknown[] = CALENDAR_ITEMS) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data }),
  };
  const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    callCount++;
    return callCount === 1 ? chain : auditChain;
  });
  return { chain, auditChain };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/admin/content/batch-generate", () => {
  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ calendar_ids: [1, 2] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when calendar_ids is empty", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ calendar_ids: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when calendar_ids is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when batch exceeds 50 items", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const ids = Array.from({ length: 51 }, (_, i) => i + 1);
    const res = await POST(makePost({ calendar_ids: ids }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no matching calendar items found", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupCalendarMock([]);
    const res = await POST(makePost({ calendar_ids: [999] }));
    expect(res.status).toBe(404);
  });

  it("enqueues jobs for found calendar items", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupCalendarMock(CALENDAR_ITEMS);
    mockEnqueueJob.mockResolvedValue(101);
    const res = await POST(makePost({ calendar_ids: [1, 2, 3] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.queued).toBe(3);
    expect(json.total_requested).toBe(3);
    expect(mockEnqueueJob).toHaveBeenCalledTimes(3);
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      "generate_article_draft",
      expect.objectContaining({ calendar_id: 1, requested_by: "admin@test.com" }),
    );
  });

  it("counts only successfully enqueued jobs (null jobId skipped)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupCalendarMock(CALENDAR_ITEMS.slice(0, 2));
    mockEnqueueJob
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(null); // second enqueue fails
    const res = await POST(makePost({ calendar_ids: [1, 2] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.queued).toBe(1);
    expect(json.total_requested).toBe(2);
  });

  it("writes audit log after enqueueing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const { auditChain } = setupCalendarMock(CALENDAR_ITEMS.slice(0, 1));
    mockEnqueueJob.mockResolvedValue(55);
    await POST(makePost({ calendar_ids: [1] }));
    expect(auditChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "content:batch_generate_queued" }),
    );
  });
});
