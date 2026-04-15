import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  setAuthUser,
  seedTable,
  getTable,
} from "./harness";

// Route depends on requireAdmin which reads from getAdminEmails().
// Stub the admin allowlist so 'admin@example.com' is treated as an
// admin for the test lane.
vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@example.com"],
  getAdminEmail: () => "admin@example.com",
}));

installSupabaseFake();

const commentsMod = await import("@/app/api/admin/article-comments/route");
const kycMod = await import("@/app/api/admin/advisor-kyc/route");

function makeRequest(url: string, init?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method || "GET",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

describe("integration: admin moderation queues", () => {
  beforeEach(() => reset());

  it("article-comments GET requires admin", async () => {
    setAuthUser("u1", "random@example.com");
    const res = await commentsMod.GET();
    expect([401, 403]).toContain(res.status);
  });

  it("lists pending article comments for admins", async () => {
    setAuthUser("admin-1", "admin@example.com");
    seedTable("article_comments", [
      {
        article_slug: "best-etfs",
        author_id: null,
        author_name: "Carol",
        author_email: "c@example.com",
        parent_id: null,
        body: "Flagged by classifier because of a defamation phrase.",
        status: "pending",
        helpful_count: 0,
        created_at: new Date().toISOString(),
      },
      {
        article_slug: "best-etfs",
        author_id: "u1",
        author_name: "Dan",
        author_email: "d@example.com",
        parent_id: null,
        body: "Already published.",
        status: "published",
        helpful_count: 0,
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await commentsMod.GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ status: string }> };
    expect(json.items).toHaveLength(1);
    expect(json.items[0].status).toBe("pending");
  });

  it("publishes a pending comment via PATCH action=publish", async () => {
    setAuthUser("admin-1", "admin@example.com");
    seedTable("article_comments", [
      {
        article_slug: "best-etfs",
        author_id: null,
        author_name: "Carol",
        author_email: "c@example.com",
        parent_id: null,
        body: "Flagged comment body.",
        status: "pending",
        helpful_count: 0,
        created_at: new Date().toISOString(),
      },
    ]);
    const commentId = getTable("article_comments")[0].id;

    const res = await commentsMod.PATCH(
      makeRequest("/api/admin/article-comments", {
        method: "PATCH",
        body: { id: commentId, action: "publish" },
      }),
    );
    expect(res.status).toBe(200);
    expect(getTable("article_comments")[0].status).toBe("published");
  });

  it("rejects a KYC upload via PATCH action=reject", async () => {
    setAuthUser("admin-1", "admin@example.com");
    seedTable("advisor_kyc_documents", [
      {
        professional_id: 42,
        document_type: "afsl_certificate",
        storage_path: "42/afsl.pdf",
        original_filename: "afsl.pdf",
        file_size_bytes: 12345,
        mime_type: "application/pdf",
        status: "submitted",
        verified_by: null,
        verified_at: null,
        verification_notes: null,
        rejection_reason: null,
        expires_at: null,
        uploaded_at: new Date().toISOString(),
      },
    ]);
    const docId = getTable("advisor_kyc_documents")[0].id;

    const res = await kycMod.PATCH(
      makeRequest("/api/admin/advisor-kyc", {
        method: "PATCH",
        body: {
          id: docId,
          action: "reject",
          reason: "Expiry date is missing from the certificate scan",
        },
      }),
    );
    expect(res.status).toBe(200);
    const row = getTable("advisor_kyc_documents")[0];
    expect(row.status).toBe("rejected");
    expect(row.rejection_reason).toContain("Expiry date is missing");
  });

  it("KYC reject without a reason returns 400", async () => {
    setAuthUser("admin-1", "admin@example.com");
    seedTable("advisor_kyc_documents", [
      {
        professional_id: 42,
        document_type: "afsl_certificate",
        storage_path: "42/afsl.pdf",
        original_filename: "afsl.pdf",
        file_size_bytes: 12345,
        mime_type: "application/pdf",
        status: "submitted",
        uploaded_at: new Date().toISOString(),
      },
    ]);
    const docId = getTable("advisor_kyc_documents")[0].id;
    const res = await kycMod.PATCH(
      makeRequest("/api/admin/advisor-kyc", {
        method: "PATCH",
        body: { id: docId, action: "reject" },
      }),
    );
    expect(res.status).toBe(400);
  });
});
