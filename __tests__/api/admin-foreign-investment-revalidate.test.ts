import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

import { POST } from "@/app/api/admin/foreign-investment/revalidate/route";

function makeReq(body: unknown, token = "secret-key"): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTERNAL_API_KEY = "secret-key";
});

describe("POST /api/admin/foreign-investment/revalidate", () => {
  it("returns 401 when bearer token is missing", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
      method: "POST",
      body: JSON.stringify({ adminEmail: "admin@test.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@test.com" }, "wrong-token"));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer secret-key" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when email not in admin list", async () => {
    const res = await POST(makeReq({ adminEmail: "notadmin@test.com" }));
    expect(res.status).toBe(403);
  });

  it("busts all 9 fi-data cache tags and returns ok", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@test.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.busted)).toBe(true);
    expect(body.busted).toContain("fi-data");
    expect(mockRevalidateTag).toHaveBeenCalledWith("fi-data", {});
    expect(mockRevalidateTag).toHaveBeenCalledTimes(9);
  });
});
