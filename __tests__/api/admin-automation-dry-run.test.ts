import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/text-moderation", () => ({
  classifyText: vi.fn(() => ({ verdict: "approved", signals: [] })),
}));
vi.mock("@/lib/invest-listing-scam-classifier", () => ({
  classifyListingForScam: vi.fn(() => ({ verdict: "safe", score: 0.1 })),
}));
vi.mock("@/lib/advisor-application-classifier", () => ({
  classifyApplication: vi.fn(() => ({ verdict: "approved", score: 0.9 })),
}));
vi.mock("@/lib/marketplace-campaign-classifier", () => ({
  classifyCampaign: vi.fn(() => ({ verdict: "approved", score: 0.95 })),
}));

import { POST } from "@/app/api/admin/automation/dry-run/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/automation/dry-run", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/automation/dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("POST denies unauthenticated (401)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ classifier: "text_moderation", input: { text: "hello" } }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin (403)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({ classifier: "text_moderation", input: { text: "hello" } }));
    expect(res.status).toBe(403);
  });

  it("POST returns 400 for missing classifier/input", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for unknown classifier", async () => {
    const res = await POST(makeReq({ classifier: "unknown_classifier", input: { text: "test" } }));
    expect(res.status).toBe(400);
  });

  it("POST classifies text_moderation", async () => {
    const res = await POST(makeReq({ classifier: "text_moderation", input: { text: "nice review" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json).toHaveProperty("result");
  });

  it("POST classifies listing_scam", async () => {
    const res = await POST(makeReq({ classifier: "listing_scam", input: { title: "Test Listing", description: "Safe content" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
