/**
 * Tests for /api/admin/marketplace-ranking.
 *
 * The route exposes GET (list) and POST (upsert) gated by `requireAdmin()`,
 * with per-IP rate limiting on POST. Both `requireAdmin` and the admin
 * Supabase client are mocked so we can assert on:
 *
 *   - 401 propagation when the admin guard refuses
 *   - 400 on malformed body / Zod validation errors
 *   - happy-path UPSERT against marketplace_ranking_weights with the right
 *     onConflict spec, plus an audit log row
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(() => Promise.resolve(true)),
  ipKey: vi.fn(() => "127.0.0.1"),
  bucketPreset: vi.fn(() => ({ max: 10, refillPerSec: 1 })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import the route AFTER mocks register so the route resolves the mocks.
import { GET, POST } from "@/app/api/admin/marketplace-ranking/route";

const ADMIN_OK = {
  ok: true as const,
  email: "admin@invest.com.au",
  userId: "user-1",
};

function unauthorizedGuard() {
  return {
    ok: false as const,
    response: new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    }),
  };
}

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/marketplace-ranking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  surface: "advisors" as const,
  weights: [
    {
      signal: "verified" as const,
      weight_bps: 10000,
      enabled: true,
      notes: "weight test",
    },
    {
      signal: "rating" as const,
      weight_bps: 3000,
      enabled: true,
      notes: null,
    },
  ],
};

// ── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/admin/marketplace-ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  });

  it("returns 401 when admin guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedGuard());
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns rows ordered by surface, signal on success", async () => {
    const rows = [
      {
        id: 1,
        surface: "advisors",
        signal: "rating",
        weight_bps: 3000,
        enabled: true,
        notes: null,
        updated_at: "2026-05-15T00:00:00Z",
      },
      {
        id: 2,
        surface: "advisors",
        signal: "verified",
        weight_bps: 10000,
        enabled: true,
        notes: null,
        updated_at: "2026-05-15T00:00:00Z",
      },
    ];
    const builder = createChainableBuilder("marketplace_ranking_weights");
    builder.then = vi.fn(
      (cb: (v: { data: unknown; error: null }) => void) => {
        cb({ data: rows, error: null });
        return Promise.resolve();
      },
    );
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(builder.order).toHaveBeenCalledWith("surface", { ascending: true });
    expect(builder.order).toHaveBeenCalledWith("signal", { ascending: true });
  });
});

// ── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/marketplace-ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  });

  it("returns 401 when admin guard refuses (non-admin denied)", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedGuard());
    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 with validation_error code on malformed body (bad surface)", async () => {
    const res = await POST(
      jsonRequest({ surface: "bogus", weights: VALID_BODY.weights }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(json.error).toMatch(/surface/i);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 with validation_error code on malformed weight row", async () => {
    const res = await POST(
      jsonRequest({
        surface: "advisors",
        weights: [
          { signal: "verified", weight_bps: "not-a-number", enabled: true },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
  });

  it("returns 400 on Invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/marketplace-ranking",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("upserts rows by (surface, signal) and writes an audit log entry on the happy path", async () => {
    const upsertBuilder = createChainableBuilder(
      "marketplace_ranking_weights",
    );
    // The upsert chain returns { error: null } when awaited.
    upsertBuilder.upsert = vi.fn(() =>
      Promise.resolve({ data: null, error: null }),
    ) as unknown as typeof upsertBuilder.upsert;
    const auditBuilder = createChainableBuilder("admin_audit_log");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "marketplace_ranking_weights") return upsertBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.count).toBe(2);

    // Upsert called with the right onConflict spec and full row shape
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "advisors",
          signal: "verified",
          weight_bps: 10000,
          enabled: true,
        }),
      ]),
      { onConflict: "surface,signal" },
    );

    expect(auditBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "marketplace_ranking:updated",
        entity_type: "marketplace_ranking_weights",
        entity_id: "advisors",
        admin_email: ADMIN_OK.email,
      }),
    );
  });

  it("returns 500 when upsert fails", async () => {
    const upsertBuilder = createChainableBuilder(
      "marketplace_ranking_weights",
    );
    upsertBuilder.upsert = vi.fn(() =>
      Promise.resolve({
        data: null,
        error: { message: "rls denied" },
      }),
    ) as unknown as typeof upsertBuilder.upsert;
    mockAdminFrom.mockReturnValue(upsertBuilder);

    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("rls denied");
  });

  it("rate-limits with 429 when isAllowed returns false", async () => {
    const rl = await import("@/lib/rate-limit-db");
    vi.mocked(rl.isAllowed).mockResolvedValueOnce(false);

    const res = await POST(jsonRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });
});
