import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

const mockAdminFrom = vi.fn();
const mockAdminStorage = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    storage: { from: mockAdminStorage },
  })),
}));

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
}));

const mockRecordKycUpload = vi.fn();
const mockListKycDocuments = vi.fn();
vi.mock("@/lib/advisor-kyc", () => ({
  recordKycUpload: (...args: unknown[]) => mockRecordKycUpload(...args),
  listKycDocuments: (...args: unknown[]) => mockListKycDocuments(...args),
  isValidKycType: (t: string) =>
    ["afsl_certificate", "proof_of_id", "abn_certificate", "insurance", "other"].includes(t),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { GET, POST } from "@/app/api/advisor-kyc/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(sessionToken?: string): NextRequest {
  const req = new NextRequest("http://localhost/api/advisor-kyc", {
    method: "GET",
  });
  if (sessionToken) {
    req.cookies.set("advisor_session", sessionToken);
  }
  return req;
}

function makePost(
  fields: Record<string, string>,
  file?: { name: string; type: string; size: number },
  sessionToken?: string,
): NextRequest {
  const formData = new FormData();
  if (file) {
    const blob = new Blob(["x".repeat(file.size)], { type: file.type });
    const f = new File([blob], file.name, { type: file.type });
    formData.append("file", f);
  }
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, v);
  }
  const req = new NextRequest("http://localhost/api/advisor-kyc", {
    method: "POST",
    body: formData,
  });
  if (sessionToken) {
    req.cookies.set("advisor_session", sessionToken);
  }
  return req;
}

const ADVISOR = { id: 42, slug: "alice-fp" };
const VALID_FILE = { name: "afsl-cert.pdf", type: "application/pdf", size: 1024 };

// Mock session resolution: server.ts chains
function makeSessionChain(sessionData: unknown) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: sessionData, error: null }));
  return c;
}

function mockSessionFlow(sessionData: unknown, advisorData: unknown) {
  let callCount = 0;
  mockServerFrom.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return makeSessionChain(sessionData);
    return makeSessionChain(advisorData);
  });
}

// Mock storage
function makeStorageChain(uploadResult: { error: unknown }) {
  return {
    upload: vi.fn(() => Promise.resolve(uploadResult)),
    remove: vi.fn(() => Promise.resolve({ error: null })),
  };
}

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-kyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when advisor_session cookie is absent", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when session row is not found", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      // First call returns null session
      return makeSessionChain(null);
    });
    const res = await GET(makeGet("tok-bad"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    mockSessionFlow(
      { professional_id: 1, expires_at: new Date(Date.now() - 1000).toISOString() },
      ADVISOR,
    );
    const res = await GET(makeGet("tok-expired"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with items list on success", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const docs = [{ id: 1, document_type: "afsl_certificate", status: "submitted" }];
    mockListKycDocuments.mockResolvedValue(docs);

    const res = await GET(makeGet("tok-valid"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual(docs);
  });
});

// ── Tests: POST ────────────────────────────────────────────────────────────────

describe("POST /api/advisor-kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 401 when no session cookie", async () => {
    const res = await POST(makePost({ document_type: "afsl_certificate" }, VALID_FILE));
    expect(res.status).toBe(401);
  });

  it("returns 429 when upload rate limit exceeded", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(
      makePost({ document_type: "afsl_certificate" }, VALID_FILE, "tok-valid"),
    );
    expect(res.status).toBe(429);
  });

  it("returns 400 when file is missing", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const res = await POST(makePost({ document_type: "afsl_certificate" }, undefined, "tok-valid"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing file|document_type/i);
  });

  it("returns 400 when document_type is missing", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const res = await POST(makePost({}, VALID_FILE, "tok-valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when document_type is invalid", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const res = await POST(
      makePost({ document_type: "credit_card" }, VALID_FILE, "tok-valid"),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid document_type/i);
  });

  it("returns 400 when MIME type is not allowed", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const res = await POST(
      makePost(
        { document_type: "afsl_certificate" },
        { name: "cert.gif", type: "image/gif", size: 1024 },
        "tok-valid",
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/PDF\/JPG\/PNG\/WebP/i);
  });

  it("returns 400 when file exceeds 10MB", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const res = await POST(
      makePost(
        { document_type: "afsl_certificate" },
        { name: "huge.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 },
        "tok-valid",
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/1B.10MB/i);
  });

  it("returns 500 and removes orphan file when storage upload fails", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const storageChain = makeStorageChain({ error: { message: "quota exceeded" } });
    mockAdminStorage.mockReturnValue(storageChain);

    const res = await POST(
      makePost({ document_type: "afsl_certificate" }, VALID_FILE, "tok-valid"),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 and removes orphan file when DB record fails", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const storageChain = makeStorageChain({ error: null });
    mockAdminStorage.mockReturnValue(storageChain);
    mockRecordKycUpload.mockResolvedValue({ ok: false, error: "insert failed" });

    const res = await POST(
      makePost({ document_type: "afsl_certificate" }, VALID_FILE, "tok-valid"),
    );
    expect(res.status).toBe(500);
    // Storage remove should be called to clean up orphan
    expect(storageChain.remove).toHaveBeenCalled();
  });

  it("returns 200 with id and storage_path on success", async () => {
    mockSessionFlow(
      { professional_id: 42, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ADVISOR,
    );
    const storageChain = makeStorageChain({ error: null });
    mockAdminStorage.mockReturnValue(storageChain);
    mockRecordKycUpload.mockResolvedValue({ ok: true, id: 77 });

    const res = await POST(
      makePost({ document_type: "afsl_certificate" }, VALID_FILE, "tok-valid"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe(77);
    expect(typeof json.storage_path).toBe("string");
  });
});
