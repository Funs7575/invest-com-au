import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsFlagEnabled = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => false);

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockExtractBriefPayload = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  payload: { job_title: "Test Brief", job_description: "Detailed description here." },
  confidence: 0.8,
  missing_fields: [],
}));

vi.mock("@/lib/briefs/ai-copilot", () => ({
  extractBriefPayload: (...args: unknown[]) => mockExtractBriefPayload(...args),
}));

import { POST } from "@/app/api/briefs/ai-copilot/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/ai-copilot", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/briefs/ai-copilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFlagEnabled.mockResolvedValue(false);
    mockIsAllowed.mockResolvedValue(true);
    mockExtractBriefPayload.mockResolvedValue({
      payload: { job_title: "Test" },
      confidence: 0.8,
      missing_fields: [],
    });
  });

  it("returns 400 when body is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too short", async () => {
    const res = await POST(makeReq({ description: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when feature flag is disabled", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(makeReq({ description: "I need help finding a financial advisor for retirement planning." }));
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ description: "I need help finding a financial advisor for retirement planning." }));
    expect(res.status).toBe(429);
  });

  it("returns extracted payload when flag is enabled and not rate-limited", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    mockIsAllowed.mockResolvedValue(true);
    const res = await POST(makeReq({
      description: "I need help finding a financial advisor for retirement planning.",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json).toHaveProperty("payload");
    expect(json).toHaveProperty("confidence");
    expect(json).toHaveProperty("missing_fields");
  });

  it("accepts optional hints field", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    mockIsAllowed.mockResolvedValue(true);
    const res = await POST(makeReq({
      description: "I need help finding a financial advisor for retirement planning.",
      hints: { intent: "retirement", budget: "100k-500k", location: "Sydney" },
    }));
    expect(res.status).toBe(200);
  });
});
