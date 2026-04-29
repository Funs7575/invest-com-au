import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

vi.mock("@/data/site-data.json", () => ({
  default: {
    brokers: [
      {
        name: "Test Broker",
        slug: "test-broker",
        color: "#000",
        icon: "/icon.png",
        ctaText: "Open Account",
        tagline: "A test broker",
        asxFee: "$5",
        asxFeeValue: 5,
        usFee: "$0",
        usFeeValue: 0,
        fxRate: 0.6,
        chessSponsored: true,
        inactivityFee: null,
        paymentMethods: [],
        smsfSupport: false,
        minDeposit: 0,
        platforms: [],
        pros: ["Cheap"],
        cons: ["Basic"],
        affiliateUrl: "https://example.com",
        rating: 4.5,
        layer: 1,
      },
    ],
    articles: [
      {
        title: "Test Article",
        slug: "test-article",
        excerpt: "A test article",
        category: "news",
        tags: [],
        date: "2026-01-01",
        readTime: 3,
        evergreen: false,
        relatedBrokers: [],
        relatedCalc: null,
        sections: [],
      },
    ],
    scenarios: [
      {
        slug: "test-scenario",
        title: "Test Scenario",
        heroTitle: "Test Hero",
        icon: "/icon.png",
        problem: "A problem",
        solution: "A solution",
        brokers: [],
        considerations: [],
      },
    ],
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "@/app/api/seed/route";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let mockUpsert: ReturnType<typeof vi.fn>;

function setupClient(userEmail: string | null) {
  mockUpsert = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userEmail ? { email: userEmail } : null },
      }),
    },
    from: vi.fn().mockReturnValue({ upsert: mockUpsert }),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/seed", () => {
  it("returns 403 in production environment", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = await POST();
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = orig;
    }
  });

  it("returns 401 when no authenticated user", async () => {
    setupClient(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 401 when user email is not in admin list and not admin domain", async () => {
    setupClient("random@example.com");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("allows users with @invest.com.au domain", async () => {
    setupClient("finn@invest.com.au");
    const res = await POST();
    expect(res.status).toBe(200);
  });

  it("returns 500 when broker upsert fails", async () => {
    setupClient("admin@invest.com.au");
    mockUpsert.mockResolvedValueOnce({ error: { message: "DB connection error" } });
    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("returns 200 with inserted counts on success", async () => {
    setupClient("admin@invest.com.au");
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; inserted: { brokers: number; articles: number; scenarios: number } };
    expect(body.success).toBe(true);
    expect(body.inserted.brokers).toBe(1);
    expect(body.inserted.articles).toBe(1);
    expect(body.inserted.scenarios).toBe(1);
    // All three upserts were called
    expect(mockUpsert).toHaveBeenCalledTimes(3);
  });

});
