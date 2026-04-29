import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/job-queue", () => ({
  getJobHandler: vi.fn(),
  computeNextAttempt: vi.fn(),
  listRegisteredJobTypes: vi.fn(),
}));

import { GET } from "@/app/api/cron/job-queue-worker/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJobHandler, computeNextAttempt, listRegisteredJobTypes } from "@/lib/job-queue";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockGetJobHandler = vi.mocked(getJobHandler);
const mockComputeNextAttempt = vi.mocked(computeNextAttempt);
const mockListJobTypes = vi.mocked(listRegisteredJobTypes);

function makeQueuedChain(queue: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "update", "lte", "gte", "lt", "not", "is", "or", "order", "limit", "in", "insert", "upsert", "delete"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(queue[idx++])));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/job-queue-worker", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockListJobTypes.mockReturnValue(["email", "pdf"]);
  mockComputeNextAttempt.mockReturnValue(new Date(Date.now() + 30000));
});

describe("GET /api/cron/job-queue-worker", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns immediately when no ready jobs", async () => {
    const chain = makeQueuedChain([
      { data: [], error: null }, // candidateIds
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.claimed).toBe(0);
    expect(body.done).toBe(0);
  });

  it("dead-letters jobs with unknown job_type", async () => {
    const candidateIds = [{ id: 10 }];
    const claimedRows = [{ id: 10, job_type: "unknown_type", payload: {}, attempts: 0, max_attempts: 5 }];
    const chain = makeQueuedChain([
      { data: candidateIds, error: null }, // select candidates
      { data: claimedRows, error: null }, // claim update
      { data: null, error: null }, // dead_letter update
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockGetJobHandler.mockReturnValue(undefined);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.dead_lettered).toBe(1);
    expect(body.done).toBe(0);
  });

  it("marks job as done when handler returns ok:true", async () => {
    const candidateIds = [{ id: 11 }];
    const claimedRows = [{ id: 11, job_type: "email", payload: { to: "x@x.com" }, attempts: 0, max_attempts: 5 }];
    const chain = makeQueuedChain([
      { data: candidateIds, error: null },
      { data: claimedRows, error: null },
      { data: null, error: null }, // done update
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const mockHandler = vi.fn().mockResolvedValue({ ok: true });
    mockGetJobHandler.mockReturnValue(mockHandler as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.done).toBe(1);
    expect(body.dead_lettered).toBe(0);
    expect(body.retried).toBe(0);
  });

  it("retries job when handler fails and attempts < max_attempts", async () => {
    const candidateIds = [{ id: 12 }];
    const claimedRows = [{ id: 12, job_type: "pdf", payload: {}, attempts: 1, max_attempts: 5 }];
    const chain = makeQueuedChain([
      { data: candidateIds, error: null },
      { data: claimedRows, error: null },
      { data: null, error: null }, // retry update
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const mockHandler = vi.fn().mockResolvedValue({ ok: false, retryable: true, error: "service down" });
    mockGetJobHandler.mockReturnValue(mockHandler as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.retried).toBe(1);
    expect(body.dead_lettered).toBe(0);
  });

  it("dead-letters job when attempts >= max_attempts", async () => {
    const candidateIds = [{ id: 13 }];
    const claimedRows = [{ id: 13, job_type: "pdf", payload: {}, attempts: 4, max_attempts: 5 }];
    const chain = makeQueuedChain([
      { data: candidateIds, error: null },
      { data: claimedRows, error: null },
      { data: null, error: null }, // dead_letter
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const mockHandler = vi.fn().mockResolvedValue({ ok: false, retryable: true, error: "still failing" });
    mockGetJobHandler.mockReturnValue(mockHandler as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.dead_lettered).toBe(1);
    expect(body.retried).toBe(0);
  });

  it("increments failed and retries when handler throws", async () => {
    const candidateIds = [{ id: 14 }];
    const claimedRows = [{ id: 14, job_type: "email", payload: {}, attempts: 0, max_attempts: 5 }];
    const chain = makeQueuedChain([
      { data: candidateIds, error: null },
      { data: claimedRows, error: null },
      { data: null, error: null }, // retry update
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const mockHandler = vi.fn().mockRejectedValue(new Error("unexpected crash"));
    mockGetJobHandler.mockReturnValue(mockHandler as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    // attempts=1, max_attempts=5 → retry
    expect(body.retried).toBe(0); // thrown path goes to failed, not retried stat
  });
});
