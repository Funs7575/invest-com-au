import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const { mockGuard, state } = vi.hoisted(() => ({
  mockGuard: vi.fn(),
  state: { inserted: null as null | Record<string, unknown> },
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: (...args: unknown[]) => mockGuard(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: "p-1", company_name: "Acme" }], error: null }),
      insert: vi.fn((row: Record<string, unknown>) => {
        state.inserted = row;
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "p-new", company_name: row.company_name, contact_email: row.contact_email, status: "active", created_at: "2026-06-10" },
            error: null,
          }),
        };
      }),
    })),
  })),
}));

import { GET, POST } from "@/app/api/admin/partners/route";
import { hashApiKey } from "@/lib/partner-auth";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/partners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/partners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.inserted = null;
    mockGuard.mockResolvedValue({ ok: true, email: "finn@invest.com.au", userId: "u1" });
  });

  it("GET denies non-admins", async () => {
    mockGuard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("GET lists partners without key hashes", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partners).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("api_key_hash");
  });

  it("POST validates the body (Zod)", async () => {
    const res = await POST(makePost({ company_name: "A" })); // too short + missing email
    expect(res.status).toBe(400);
  });

  it("POST denies non-admins", async () => {
    mockGuard.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const res = await POST(makePost({ company_name: "Acme Leads", contact_email: "ops@acme.com" }));
    expect(res.status).toBe(401);
  });

  it("POST mints a key, stores only its hash, and returns the plaintext once", async () => {
    const res = await POST(makePost({ company_name: "Acme Leads", contact_email: "Ops@Acme.com" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.api_key).toMatch(/^pk_live_/);
    expect(body.partner.id).toBe("p-new");
    // Stored row: hash of the returned key, never the plaintext.
    expect(state.inserted?.api_key_hash).toBe(hashApiKey(body.api_key));
    expect(JSON.stringify(state.inserted)).not.toContain(body.api_key);
    expect(state.inserted?.contact_email).toBe("ops@acme.com");
  });
});
