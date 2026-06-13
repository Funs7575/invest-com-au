import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdvisorSession, mockFlag, mockAdminFrom, mockIsAllowed } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...a: unknown[]) => Promise<number | null>>(async () => 77),
  mockFlag: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockAdminFrom: vi.fn<(...a: unknown[]) => unknown>(),
  mockIsAllowed: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...a: unknown[]) => mockRequireAdvisorSession(...a),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockFlag(...a),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: () => "test-ip",
}));

import { POST } from "@/app/api/advisor-portal/sequences/route";

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) => Promise.resolve(r({ data, error })),
  };
  for (const m of ["select", "insert", "update", "delete", "eq", "in", "is", "order", "limit", "single", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("https://invest.com.au/api/advisor-portal/sequences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validStep = { day_offset: 0, subject: "Hi {{lead_first_name}}", body: "Hello there" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdvisorSession.mockResolvedValue(77);
  mockFlag.mockResolvedValue(true);
  mockIsAllowed.mockResolvedValue(true);
});

describe("POST /api/advisor-portal/sequences — gating", () => {
  it("404s when the flag is off", async () => {
    mockFlag.mockResolvedValue(false);
    expect((await POST(postReq({ name: "S", steps: [validStep] }))).status).toBe(404);
  });

  it("401s without a session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    expect((await POST(postReq({ name: "S", steps: [validStep] }))).status).toBe(401);
  });
});

describe("POST /api/advisor-portal/sequences — step validation", () => {
  it("rejects an empty step list", async () => {
    expect((await POST(postReq({ name: "S", steps: [] }))).status).toBe(400);
  });

  it("rejects more than 3 steps", async () => {
    const four = [validStep, validStep, validStep, validStep];
    expect((await POST(postReq({ name: "S", steps: four }))).status).toBe(400);
  });

  it("rejects a day_offset above 30", async () => {
    expect((await POST(postReq({ name: "S", steps: [{ ...validStep, day_offset: 31 }] }))).status).toBe(400);
  });

  it("rejects an over-long subject (>150) and body (>2000)", async () => {
    expect((await POST(postReq({ name: "S", steps: [{ ...validStep, subject: "x".repeat(151) }] }))).status).toBe(400);
    expect((await POST(postReq({ name: "S", steps: [{ ...validStep, body: "x".repeat(2001) }] }))).status).toBe(400);
  });

  it("rejects a blank sequence name", async () => {
    expect((await POST(postReq({ name: "   ", steps: [validStep] }))).status).toBe(400);
  });

  it("accepts a valid sequence and persists steps", async () => {
    // 1) sequence insert → row; 2) steps delete (replace-all) ; 3) steps insert
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ id: 10, name: "S", status: "active", created_at: "x" }))
      .mockReturnValueOnce(makeBuilder(null)) // delete existing steps
      .mockReturnValueOnce(makeBuilder(null)); // insert new steps
    const res = await POST(postReq({ name: "S", steps: [validStep] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sequence.id).toBe(10);
    expect(json.sequence.steps).toHaveLength(1);
  });

  it("accepts an UNKNOWN merge token in the body (left literal at send time, not rejected at write)", async () => {
    // The allowlist is enforced at RENDER time (resolveMergeFields leaves unknown
    // tokens literal); the write path only validates length/shape, so a body
    // containing {{secret}} is stored verbatim and never resolves to anything.
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ id: 11, name: "S", status: "active", created_at: "x" }))
      .mockReturnValueOnce(makeBuilder(null))
      .mockReturnValueOnce(makeBuilder(null));
    const res = await POST(postReq({ name: "S", steps: [{ ...validStep, body: "Hi {{secret_token}}" }] }));
    expect(res.status).toBe(200);
  });
});
