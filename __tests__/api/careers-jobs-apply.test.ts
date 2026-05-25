import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChainableBuilder, makeRequest } from "@/__tests__/helpers";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockServerFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockServerFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { POST } from "@/app/api/careers/jobs/apply/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_JOB_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const VALID_BODY = {
  job_id: VALID_JOB_ID,
  applicant_name: "Jane Smith",
  applicant_email: "jane@example.com",
  message: "I am very interested in this position and have five years of relevant experience.",
};

const ACTIVE_JOB = { id: VALID_JOB_ID, status: "active" };

// ── Mock setup helper ─────────────────────────────────────────────────────────

function setupMocks({
  job = ACTIVE_JOB as { id: string; status: string } | null,
  jobError = null as { message: string } | null,
  insertError = null as { message: string } | null,
} = {}) {
  mockServerFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    if (table === "job_posts") {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: jobError ? null : job, error: jobError });
    } else if (table === "job_applications") {
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb({ data: null, error: insertError });
        return Promise.resolve();
      });
    }
    return b;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/careers/jobs/apply", () => {
  function makePost(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/careers/jobs/apply", body);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await POST(makePost(VALID_BODY))).status).toBe(429);
  });

  it("returns 400 for invalid UUID job_id", async () => {
    expect((await POST(makePost({ ...VALID_BODY, job_id: "not-a-uuid" }))).status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    expect((await POST(makePost({ job_id: VALID_JOB_ID }))).status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    expect((await POST(makePost({ ...VALID_BODY, applicant_email: "not-an-email" }))).status).toBe(400);
  });

  it("returns 400 when message is too short", async () => {
    expect((await POST(makePost({ ...VALID_BODY, message: "Short" }))).status).toBe(400);
  });

  it("returns 500 on DB error looking up job", async () => {
    setupMocks({ jobError: { message: "connection refused" } });
    expect((await POST(makePost(VALID_BODY))).status).toBe(500);
  });

  it("returns 404 when job is not found or not active", async () => {
    setupMocks({ job: null });
    expect((await POST(makePost(VALID_BODY))).status).toBe(404);
  });

  it("returns 500 on insert error", async () => {
    setupMocks({ insertError: { message: "constraint violation" } });
    expect((await POST(makePost(VALID_BODY))).status).toBe(500);
  });

  it("returns 200 with ok:true on successful submission", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
