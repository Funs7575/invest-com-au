import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockEnqueueJob = vi.fn();
vi.mock("@/lib/job-queue", () => ({ enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args) }));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { POST } from "@/app/api/admin/content/batch-generate/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/content/batch-generate", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/content/batch-generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockEnqueueJob.mockResolvedValue(42);
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: [{ id: 1, title: "Article 1" }, { id: 2, title: "Article 2" }], error: null }),
    );
  });

  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ calendar_ids: [1] }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when no calendar_ids", async () => {
    const res = await POST(makeReq({ calendar_ids: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/No calendar_ids/);
  });

  it("POST returns 400 when calendar_ids missing from body", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when batch size exceeds 50", async () => {
    const ids = Array.from({ length: 51 }, (_, i) => i + 1);
    const res = await POST(makeReq({ calendar_ids: ids }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Batch size exceeds/);
  });

  it("POST returns 404 when no calendar items found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: [], error: null }),
    );
    const res = await POST(makeReq({ calendar_ids: [999] }));
    expect(res.status).toBe(404);
  });

  it("POST queues jobs for matching calendar items", async () => {
    const res = await POST(makeReq({ calendar_ids: [1, 2] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.queued).toBe(2);
    expect(json.total_requested).toBe(2);
  });
});
