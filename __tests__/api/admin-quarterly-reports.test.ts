/**
 * Tests for /api/admin/quarterly-reports.
 *
 * The route handles GET (list incl. drafts), POST (create), PATCH (update),
 * DELETE (delete by id). Each handler is gated by `requireAdmin()` and uses
 * the service-role admin client. These tests mock both `requireAdmin` and the
 * admin Supabase client so we can assert on:
 *
 *   - 401/403 propagation when the admin guard refuses
 *   - 400 on invalid JSON / Zod validation error
 *   - happy paths: the SQL the route would run is shaped correctly
 *   - audit log row written for create/update/delete
 *   - DELETE rejects missing/non-numeric id
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

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import the route AFTER mocks register so the route resolves the mocks.
import {
  GET,
  POST,
  PATCH,
  DELETE,
} from "@/app/api/admin/quarterly-reports/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function jsonRequest(
  method: string,
  body: unknown | undefined,
  url = "http://localhost/api/admin/quarterly-reports",
) {
  return new NextRequest(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const VALID_CREATE = {
  title: "Q2 2026 Industry Report",
  slug: "q2-2026-industry-report",
  quarter: "Q2",
  year: 2026,
  executive_summary: "Summary text",
  sections: [{ heading: "Trends", body: "Body text" }],
  key_findings: ["Finding 1", "Finding 2"],
  fee_changes_summary: [
    { broker: "X", field: "fee", old_value: "$10", new_value: "$5" },
  ],
  new_entrants: ["New Broker"],
  status: "draft" as const,
};

// ── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/admin/quarterly-reports", () => {
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

  it("returns rows ordered year DESC then quarter DESC on success", async () => {
    const rows = [
      { id: 2, title: "Q2 2026", quarter: "Q2", year: 2026, status: "draft" },
      { id: 1, title: "Q1 2026", quarter: "Q1", year: 2026, status: "published" },
    ];
    const builder = createChainableBuilder("quarterly_reports");
    // The chain ends with the second .order() — vitest's createChainableBuilder
    // returns the same builder until awaited; we override `.then` to resolve
    // the result envelope when the route awaits the builder.
    builder.then = vi.fn(
      (cb: (v: { data: unknown; error: null }) => void) => {
        cb({ data: rows, error: null });
        return Promise.resolve();
      }
    );
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe(2);
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.order).toHaveBeenCalledWith("year", { ascending: false });
    expect(builder.order).toHaveBeenCalledWith("quarter", { ascending: false });
  });

  it("returns 500 with the DB error message on supabase failure", async () => {
    const builder = createChainableBuilder("quarterly_reports");
    builder.then = vi.fn(
      (cb: (v: { data: null; error: { message: string } }) => void) => {
        cb({ data: null, error: { message: "boom" } });
        return Promise.resolve();
      }
    );
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("boom");
  });
});

// ── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/quarterly-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  });

  it("returns 401 when admin guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedGuard());
    const res = await POST(jsonRequest("POST", VALID_CREATE));
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 with validation_error code on schema mismatch", async () => {
    const res = await POST(
      jsonRequest("POST", { ...VALID_CREATE, title: "" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(json.error).toMatch(/title/i);
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it("returns 400 when status is not draft|published", async () => {
    const res = await POST(
      jsonRequest("POST", { ...VALID_CREATE, status: "bogus" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(json.error).toMatch(/status/i);
  });

  it("inserts the row, stamps published_at when status='published', and writes audit log", async () => {
    // Two `.from(...)` calls happen: the insert builder and the audit insert.
    const insertedBuilder = createChainableBuilder("quarterly_reports");
    insertedBuilder.single = vi.fn(() =>
      Promise.resolve({ data: { id: 42 }, error: null })
    );
    const auditBuilder = createChainableBuilder("admin_audit_log");
    auditBuilder.then = vi.fn(
      (cb: (v: { data: null; error: null; count: number }) => void) => {
        cb({ data: null, error: null, count: 0 });
        return Promise.resolve();
      }
    );
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quarterly_reports") return insertedBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    const res = await POST(
      jsonRequest("POST", { ...VALID_CREATE, status: "published" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe(42);

    // Insert payload includes published_at when status='published'
    expect(insertedBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: VALID_CREATE.title,
        slug: VALID_CREATE.slug,
        status: "published",
        published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
    // Audit log written
    expect(auditBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quarterly_report:created",
        entity_type: "quarterly_report",
        entity_id: "42",
        admin_email: ADMIN_OK.email,
      })
    );
  });

  it("does not stamp published_at when status='draft'", async () => {
    const insertedBuilder = createChainableBuilder("quarterly_reports");
    insertedBuilder.single = vi.fn(() =>
      Promise.resolve({ data: { id: 7 }, error: null })
    );
    const auditBuilder = createChainableBuilder("admin_audit_log");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quarterly_reports") return insertedBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    await POST(jsonRequest("POST", { ...VALID_CREATE, status: "draft" }));
    expect(insertedBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", published_at: null })
    );
  });

  it("returns 500 on insert error", async () => {
    const insertedBuilder = createChainableBuilder("quarterly_reports");
    insertedBuilder.single = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "duplicate slug" } })
    );
    mockAdminFrom.mockReturnValue(insertedBuilder);

    const res = await POST(jsonRequest("POST", VALID_CREATE));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("duplicate slug");
  });
});

// ── PATCH ────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/quarterly-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  });

  it("returns 401 when admin guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedGuard());
    const res = await PATCH(jsonRequest("PATCH", { id: 1, title: "X" }));
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(jsonRequest("PATCH", { title: "X" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(json.error).toMatch(/id/i);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await PATCH(jsonRequest("PATCH", { id: -1, title: "X" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
  });

  it("updates only the fields provided and writes audit log", async () => {
    const updateBuilder = createChainableBuilder("quarterly_reports");
    // delete builder is awaited at the end of the chain — set then/.eq to resolve
    updateBuilder.eq = vi.fn(() =>
      Promise.resolve({ data: null, error: null })
    ) as unknown as typeof updateBuilder.eq;
    const auditBuilder = createChainableBuilder("admin_audit_log");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quarterly_reports") return updateBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    const res = await PATCH(
      jsonRequest("PATCH", { id: 5, status: "published" })
    );
    expect(res.status).toBe(200);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
    // No accidental title field included since caller didn't send one
    const updateArg = updateBuilder.update.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(updateArg).not.toHaveProperty("title");
    expect(updateArg).not.toHaveProperty("slug");

    expect(auditBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quarterly_report:updated",
        entity_id: "5",
        admin_email: ADMIN_OK.email,
      })
    );
  });

  it("nulls published_at when status flips back to draft", async () => {
    const updateBuilder = createChainableBuilder("quarterly_reports");
    updateBuilder.eq = vi.fn(() =>
      Promise.resolve({ data: null, error: null })
    ) as unknown as typeof updateBuilder.eq;
    const auditBuilder = createChainableBuilder("admin_audit_log");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quarterly_reports") return updateBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    await PATCH(jsonRequest("PATCH", { id: 9, status: "draft" }));
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", published_at: null })
    );
  });

  it("returns 500 on supabase update error", async () => {
    const updateBuilder = createChainableBuilder("quarterly_reports");
    updateBuilder.eq = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "rls denied" } })
    ) as unknown as typeof updateBuilder.eq;
    mockAdminFrom.mockReturnValue(updateBuilder);

    const res = await PATCH(jsonRequest("PATCH", { id: 5, title: "X" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("rls denied");
  });
});

// ── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/quarterly-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  });

  it("returns 401 when admin guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedGuard());
    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports?id=1",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when id query param is missing", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/id/i);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports?id=abc",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes the row by id and writes audit log on success", async () => {
    const deleteBuilder = createChainableBuilder("quarterly_reports");
    deleteBuilder.eq = vi.fn(() =>
      Promise.resolve({ data: null, error: null })
    ) as unknown as typeof deleteBuilder.eq;
    const auditBuilder = createChainableBuilder("admin_audit_log");
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quarterly_reports") return deleteBuilder;
      if (table === "admin_audit_log") return auditBuilder;
      throw new Error(`unexpected table ${table}`);
    });

    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports?id=42",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("id", 42);

    expect(auditBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quarterly_report:deleted",
        entity_type: "quarterly_report",
        entity_id: "42",
        admin_email: ADMIN_OK.email,
      })
    );
  });

  it("returns 500 on delete error", async () => {
    const deleteBuilder = createChainableBuilder("quarterly_reports");
    deleteBuilder.eq = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "fk violation" } })
    ) as unknown as typeof deleteBuilder.eq;
    mockAdminFrom.mockReturnValue(deleteBuilder);

    const req = new NextRequest(
      "http://localhost/api/admin/quarterly-reports?id=5",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fk violation");
  });
});
