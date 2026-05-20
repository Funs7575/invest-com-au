/**
 * Tests for GET /api/intake/questions/by-owner/[ownerKind]/[ownerId]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockListForProfessional = vi.fn();
const mockListForTeam = vi.fn();
vi.mock("@/lib/pro-intake", () => ({
  listForProfessional: (...args: unknown[]) => mockListForProfessional(...args),
  listForTeam: (...args: unknown[]) => mockListForTeam(...args),
  upsertQuestion: vi.fn(),
  getQuestionById: vi.fn(),
  isOwner: vi.fn(),
  removeQuestion: vi.fn(),
  IntakeError: class IntakeError extends Error {
    status: number;
    constructor(msg: string, status: number) { super(msg); this.status = status; }
  },
}));

import { GET } from "@/app/api/intake/questions/by-owner/[ownerKind]/[ownerId]/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/intake/questions/by-owner/professional/1", {
    method: "GET",
  }) as unknown as NextRequest;
}

describe("GET /api/intake/questions/by-owner/[ownerKind]/[ownerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockListForProfessional.mockResolvedValue([{ id: 1, prompt: "Q1" }]);
    mockListForTeam.mockResolvedValue([{ id: 2, prompt: "Q2" }]);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "professional", ownerId: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid ownerKind", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "admin", ownerId: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric ownerId", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "professional", ownerId: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero ownerId", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "professional", ownerId: "0" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 with questions for professional", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "professional", ownerId: "5" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.questions)).toBe(true);
    expect(mockListForProfessional).toHaveBeenCalledWith(5, { onlyEnabled: true });
  });

  it("returns 200 with questions for team", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ ownerKind: "team", ownerId: "3" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.questions)).toBe(true);
    expect(mockListForTeam).toHaveBeenCalledWith(3, { onlyEnabled: true });
  });
});
