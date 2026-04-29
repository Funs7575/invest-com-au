import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

const mockGetAdminEmails = vi.fn<() => string[]>(() => ["admin@invest.com.au"]);
vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/foreign-investment/revalidate/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTERNAL_KEY = "test-internal-key";

function makePost(
  body: unknown = { adminEmail: "admin@invest.com.au" },
  key = INTERNAL_KEY
): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/foreign-investment/revalidate", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
  });
  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.INTERNAL_API_KEY;
  });

  it("returns 401 when no authorization header provided", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminEmail: "admin@invest.com.au" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong bearer token", async () => {
    const res = await POST(makePost({ adminEmail: "admin@invest.com.au" }, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when INTERNAL_API_KEY env is not set", async () => {
    delete process.env.INTERNAL_API_KEY;
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${INTERNAL_KEY}`,
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when adminEmail is not in admin list", async () => {
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    const res = await POST(makePost({ adminEmail: "outsider@example.com" }));
    expect(res.status).toBe(403);
  });

  it("calls revalidateTag for all 9 FI cache tags", async () => {
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    const res = await POST(makePost());
    expect(res.status).toBe(200);

    const expectedTags = [
      "fi-data",
      "fi-data-categories",
      "fi-tax-non-resident",
      "fi-tax-resident",
      "fi-dta-countries",
      "fi-dasp-rates",
      "fi-withholding-rates",
      "fi-property-rules",
      "fi-change-log",
    ];
    expect(mockRevalidateTag).toHaveBeenCalledTimes(9);
    for (const tag of expectedTags) {
      expect(mockRevalidateTag).toHaveBeenCalledWith(tag, expect.anything());
    }
  });

  it("returns {ok: true, busted: [...]} with all 9 tags", async () => {
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    const res = await POST(makePost());
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.busted)).toBe(true);
    expect(json.busted).toHaveLength(9);
    expect(json.busted).toContain("fi-data");
    expect(json.busted).toContain("fi-change-log");
  });
});
