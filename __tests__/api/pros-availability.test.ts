/**
 * Tests for POST /api/pros/availability and GET /api/pros/availability
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockCreateSlot, mockListAllSlotsForPro } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockCreateSlot: vi.fn(async () => ({
    id: 1,
    professional_id: 42,
    start_at: "2026-06-01T09:00:00Z",
    end_at: "2026-06-01T10:00:00Z",
    status: "open",
  })),
  mockListAllSlotsForPro: vi.fn(async () => []),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/consultations", () => ({
  createSlot: mockCreateSlot,
  ConsultationError: class ConsultationError extends Error {
    constructor(public message: string, public code: string, public status: number) {
      super(message);
    }
  },
  listAllSlotsForPro: mockListAllSlotsForPro,
}));

import { POST, GET } from "@/app/api/pros/availability/route";

const VALID_BODY = {
  start_at: "2026-06-01T09:00:00Z",
  end_at: "2026-06-01T10:00:00Z",
};

function makePostReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/availability", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  });
}

function makeGetReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/availability", { method: "GET" });
}

describe("POST /api/pros/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCreateSlot.mockResolvedValue({
      id: 1,
      professional_id: 42,
      start_at: "2026-06-01T09:00:00Z",
      end_at: "2026-06-01T10:00:00Z",
      status: "open",
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePostReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePostReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing start_at", async () => {
    const res = await POST(makePostReq({ end_at: "2026-06-01T10:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing end_at", async () => {
    const res = await POST(makePostReq({ start_at: "2026-06-01T09:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with slot on success", async () => {
    const res = await POST(makePostReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slot).toBeDefined();
    expect(json.slot.id).toBe(1);
  });
});

describe("GET /api/pros/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockListAllSlotsForPro.mockResolvedValue([]);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 200 with slots array", async () => {
    mockListAllSlotsForPro.mockResolvedValue([{ id: 1, status: "open" }]);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.slots)).toBe(true);
    expect(json.slots).toHaveLength(1);
  });
});
