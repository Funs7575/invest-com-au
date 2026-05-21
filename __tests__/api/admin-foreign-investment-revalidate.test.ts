import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@invest.com.au"],
}));

import { POST } from "@/app/api/admin/foreign-investment/revalidate/route";

const INTERNAL_KEY = "test-internal-key";

function makeReq(body?: unknown, authToken?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authToken !== undefined) {
    headers["authorization"] = `Bearer ${authToken}`;
  }
  return new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers,
  });
}

describe("/api/admin/foreign-investment/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTERNAL_API_KEY", INTERNAL_KEY);
  });

  it("POST returns 401 when no authorization header", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when wrong token", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/foreign-investment/revalidate",
      {
        method: "POST",
        body: "not-json",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${INTERNAL_KEY}`,
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when adminEmail missing from body", async () => {
    const res = await POST(makeReq({}, INTERNAL_KEY));
    expect(res.status).toBe(400);
  });

  it("POST returns 403 when email is not an admin", async () => {
    const res = await POST(makeReq({ adminEmail: "nonadmin@example.com" }, INTERNAL_KEY));
    expect(res.status).toBe(403);
  });

  it("POST revalidates cache and returns ok when valid", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }, INTERNAL_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.busted)).toBe(true);
  });
});
