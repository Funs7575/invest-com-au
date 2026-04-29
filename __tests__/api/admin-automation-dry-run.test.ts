import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

const mockClassifyText = vi.fn();
const mockClassifyListingForScam = vi.fn();
const mockClassifyApplication = vi.fn();
const mockClassifyCampaign = vi.fn();

vi.mock("@/lib/text-moderation", () => ({
  classifyText: (...a: unknown[]) => mockClassifyText(...a),
}));
vi.mock("@/lib/invest-listing-scam-classifier", () => ({
  classifyListingForScam: (...a: unknown[]) => mockClassifyListingForScam(...a),
}));
vi.mock("@/lib/advisor-application-classifier", () => ({
  classifyApplication: (...a: unknown[]) => mockClassifyApplication(...a),
}));
vi.mock("@/lib/marketplace-campaign-classifier", () => ({
  classifyCampaign: (...a: unknown[]) => mockClassifyCampaign(...a),
}));

import { POST } from "@/app/api/admin/automation/dry-run/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER = { email: "admin@test.com" };
const NON_ADMIN = { email: "user@other.com" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/dry-run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated (no user)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: null } } });
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN } });
    const res = await POST(makePost({ classifier: "text_moderation", input: {} }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when classifier is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ input: { text: "hello" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when input is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ classifier: "text_moderation" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when input is not an object (string value)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ classifier: "text_moderation", input: "bad_input" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown classifier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ classifier: "nonexistent_classifier", input: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown classifier/i);
  });

  it("dispatches to text_moderation and returns result", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockClassifyText.mockReturnValue({ verdict: "escalate", signals: ["link_density"] });
    const res = await POST(makePost({ classifier: "text_moderation", input: { text: "review text" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.verdict).toBe("escalate");
    expect(mockClassifyText).toHaveBeenCalledWith({ text: "review text" });
  });

  it("dispatches to listing_scam classifier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockClassifyListingForScam.mockReturnValue({ verdict: "auto_approve" });
    const res = await POST(makePost({ classifier: "listing_scam", input: { asking_price: 100000 } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.verdict).toBe("auto_approve");
    expect(mockClassifyListingForScam).toHaveBeenCalledWith({ asking_price: 100000 });
  });

  it("dispatches to advisor_application classifier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockClassifyApplication.mockReturnValue({ verdict: "approve" });
    const res = await POST(makePost({ classifier: "advisor_application", input: { afsl: "123456" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.verdict).toBe("approve");
    expect(mockClassifyApplication).toHaveBeenCalledWith({ afsl: "123456" });
  });

  it("dispatches to marketplace_campaign classifier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockClassifyCampaign.mockReturnValue({ verdict: "auto_approve", confidence: "high" });
    const res = await POST(makePost({ classifier: "marketplace_campaign", input: { broker_slug: "commsec" } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.verdict).toBe("auto_approve");
    expect(mockClassifyCampaign).toHaveBeenCalledWith({ broker_slug: "commsec" });
  });

  it("returns 500 when classifier throws an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockClassifyText.mockImplementation(() => {
      throw new Error("classifier_internal_error");
    });
    const res = await POST(makePost({ classifier: "text_moderation", input: { text: "bad" } }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("classifier_internal_error");
  });
});
