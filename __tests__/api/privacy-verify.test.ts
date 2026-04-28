import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockAdminFrom = vi.fn();
const mockExportUserData = vi.fn();
const mockEraseUserData = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/privacy-data", () => ({
  exportUserData: (...args: unknown[]) => mockExportUserData(...args),
  eraseUserData: (...args: unknown[]) => mockEraseUserData(...args),
}));

import { GET } from "@/app/api/privacy/verify/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/privacy/verify?token=${encodeURIComponent(token)}`
    : "http://localhost/api/privacy/verify";
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

interface RequestRow {
  id: string;
  request_type: string;
  email: string;
  verified_at: string | null;
  completed_at: string | null;
  created_at: string;
  rows_affected: Record<string, unknown> | null;
}

function makeRow(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: "req-1",
    request_type: "export",
    email: "user@example.com",
    verified_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    rows_affected: null,
    ...overrides,
  };
}

function setupFetch(row: RequestRow | null, fetchError: { message: string } | null = null) {
  const chain = createChainableBuilder("privacy_data_requests");
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: fetchError }));
  mockAdminFrom.mockReturnValue(chain);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/privacy/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockExportUserData.mockResolvedValue({ profiles: [], email_captures: [] });
    mockEraseUserData.mockResolvedValue({ profiles: 1 });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet("some-token"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when token is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/token/i);
  });

  it("returns 404 when token not found in DB", async () => {
    setupFetch(null);
    const res = await GET(makeGet("nonexistent-token"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when DB fetch returns error", async () => {
    setupFetch(null, { message: "db error" });
    const res = await GET(makeGet("bad-token"));
    expect(res.status).toBe(404);
  });

  it("returns 410 when request is already completed", async () => {
    setupFetch(makeRow({ completed_at: "2026-04-20T10:00:00Z" }));
    const res = await GET(makeGet("already-done"));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/completed/i);
  });

  it("returns 410 when link is older than 24 hours", async () => {
    const old = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    setupFetch(makeRow({ created_at: old }));
    const res = await GET(makeGet("expired-token"));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("export path: calls exportUserData and returns JSON download", async () => {
    const bundle = { profiles: [{ id: "u1" }], email_captures: [] };
    mockExportUserData.mockResolvedValue(bundle);
    setupFetch(makeRow({ request_type: "export", email: "user@example.com" }));

    const res = await GET(makeGet("valid-token"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment/);
    expect(mockExportUserData).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
    );
  });

  it("export path: response body contains email and data bundle", async () => {
    const bundle = { profiles: [{ id: "u1" }] };
    mockExportUserData.mockResolvedValue(bundle);
    setupFetch(makeRow({ request_type: "export", email: "user@example.com" }));

    const res = await GET(makeGet("valid-token"));
    const text = await res.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed.email).toBe("user@example.com");
    expect(parsed.data).toEqual(bundle);
  });

  it("delete path: calls eraseUserData and returns ok with affected counts", async () => {
    const affected = { profiles: 1, email_captures: 1 };
    mockEraseUserData.mockResolvedValue(affected);
    setupFetch(makeRow({ request_type: "delete", email: "user@example.com" }));

    const res = await GET(makeGet("valid-token"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toMatch(/erased/i);
    expect(mockEraseUserData).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
    );
  });

  it("correct path: returns 400 when no pending_correction in rows_affected", async () => {
    setupFetch(
      makeRow({ request_type: "correct", rows_affected: {} }),
    );
    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(400);
  });

  it("correct path: returns 400 for disallowed correction field", async () => {
    setupFetch(
      makeRow({
        request_type: "correct",
        rows_affected: {
          pending_correction: { field: "bank_account", new_value: "12345" },
        },
      }),
    );
    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not allowed|field/i);
  });

  it("returns 500 when processing throws unexpectedly", async () => {
    mockExportUserData.mockRejectedValue(new Error("unexpected failure"));
    setupFetch(makeRow({ request_type: "export" }));

    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed/i);
  });
});
