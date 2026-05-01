import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { POST } from "@/app/api/advisor-auth/verify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockFrom.mockReset();
    mockFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Token required");
  });

  it("returns 401 when token is not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_auth_tokens") {
        b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return b;
    });

    const res = await POST(makeReq({ token: "nope" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid or expired link");
  });

  it("returns 401 when token has already been used", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_auth_tokens") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: "tok-1",
              professional_id: 5,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              used_at: new Date(Date.now() - 1000).toISOString(),
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makeReq({ token: "used" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("This link has already been used");
  });

  it("returns 401 when token is expired", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_auth_tokens") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: "tok-2",
              professional_id: 5,
              expires_at: new Date(Date.now() - 60_000).toISOString(),
              used_at: null,
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makeReq({ token: "expired" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe(
      "This link has expired. Please request a new one.",
    );
  });

  it("verifies a valid token, marks used, creates session, sets cookie", async () => {
    mockFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_auth_tokens") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: "tok-3",
              professional_id: 11,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              used_at: null,
            },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 11,
              name: "Verified Advisor",
              slug: "verified-advisor",
              firm_name: "VA Co",
              email: "verified@advisor.test",
              photo_url: null,
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makeReq({ token: "valid" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.advisor.id).toBe(11);

    // Token marked used
    const tokenCalls = supabaseCalls.advisor_auth_tokens || [];
    expect(tokenCalls.some((c) => c.method === "update")).toBe(true);

    // Session row inserted
    const sessionCalls = supabaseCalls.advisor_sessions || [];
    const insertCall = sessionCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect(insertArgs.professional_id).toBe(11);
    expect(typeof insertArgs.session_token).toBe("string");
    expect((insertArgs.session_token as string).length).toBeGreaterThan(32);

    // advisor_session cookie set
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("advisor_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("DB connection lost");
    });

    const res = await POST(makeReq({ token: "boom" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed");
  });
});
