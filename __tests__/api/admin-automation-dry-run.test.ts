import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@test.com"]),
}));

const mockClassifyText = vi.fn();
const mockClassifyListingForScam = vi.fn();
const mockClassifyApplication = vi.fn();
const mockClassifyCampaign = vi.fn();

vi.mock("@/lib/text-moderation", () => ({
  classifyText: (...args: unknown[]) => mockClassifyText(...args),
}));
vi.mock("@/lib/invest-listing-scam-classifier", () => ({
  classifyListingForScam: (...args: unknown[]) => mockClassifyListingForScam(...args),
}));
vi.mock("@/lib/advisor-application-classifier", () => ({
  classifyApplication: (...args: unknown[]) => mockClassifyApplication(...args),
}));
vi.mock("@/lib/marketplace-campaign-classifier", () => ({
  classifyCampaign: (...args: unknown[]) => mockClassifyCampaign(...args),
}));

import { POST } from "@/app/api/admin/automation/dry-run/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/dry-run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user email is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: null } }, error: null });
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when classifier is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ input: { text: "test" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when input is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ classifier: "text_moderation" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when input is not an object", async () => {
    setupAuth();
    const res = await POST(makePost({ classifier: "text_moderation", input: "not-an-object" }));
    expect(res.status).toBe(400);
  });

  it("dispatches text_moderation classifier", async () => {
    setupAuth();
    const mockResult = { verdict: "clean", score: 0.1 };
    mockClassifyText.mockReturnValue(mockResult);
    const res = await POST(makePost({ classifier: "text_moderation", input: { text: "hello" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result).toEqual(mockResult);
    expect(mockClassifyText).toHaveBeenCalledWith({ text: "hello" });
  });

  it("dispatches listing_scam classifier", async () => {
    setupAuth();
    const mockResult = { verdict: "scam", signals: ["too_good_to_be_true"] };
    mockClassifyListingForScam.mockReturnValue(mockResult);
    const res = await POST(makePost({ classifier: "listing_scam", input: { title: "Free money" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toEqual(mockResult);
  });

  it("dispatches advisor_application classifier", async () => {
    setupAuth();
    const mockResult = { verdict: "approve", confidence: 0.9 };
    mockClassifyApplication.mockReturnValue(mockResult);
    const res = await POST(makePost({ classifier: "advisor_application", input: { name: "Alice" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toEqual(mockResult);
  });

  it("dispatches marketplace_campaign classifier", async () => {
    setupAuth();
    const mockResult = { verdict: "compliant", issues: [] };
    mockClassifyCampaign.mockReturnValue(mockResult);
    const res = await POST(makePost({ classifier: "marketplace_campaign", input: { title: "Ad" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toEqual(mockResult);
  });

  it("returns 400 for unknown classifier", async () => {
    setupAuth();
    const res = await POST(makePost({ classifier: "unknown_classifier", input: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown classifier/i);
  });

  it("returns 500 when classifier throws", async () => {
    setupAuth();
    mockClassifyText.mockImplementation(() => {
      throw new Error("classifier_crashed");
    });
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("classifier_crashed");
  });
});
