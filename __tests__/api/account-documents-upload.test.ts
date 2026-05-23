import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
}));

const mockGetUser = vi.fn();

// Storage bucket mock — upload + remove (failure-path cleanup).
let uploadError: { message: string } | null = null;
const storageBucket = {
  upload: vi.fn(async () => ({ error: uploadError })),
  remove: vi.fn(async () => ({ data: [], error: null })),
};

// user_documents insert chain: from().insert().select().single()
let insertResult: { data: unknown; error: unknown } = { data: { id: "doc-uuid" }, error: null };
const insertChain = {
  insert: vi.fn(() => insertChain),
  select: vi.fn(() => insertChain),
  single: vi.fn(async () => insertResult),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => insertChain),
    storage: { from: vi.fn(() => storageBucket) },
  })),
}));

import { POST } from "@/app/api/account/documents/upload/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "11111111-1111-1111-1111-111111111111", email: "alice@example.com" };
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function makeFile(type = "application/pdf", name = "statement.pdf", bytes = 100): File {
  const content = new Uint8Array(bytes).fill(65); // bytes of "A"
  return new File([content], name, { type });
}

async function makeReq(opts: {
  file?: File | null;
  documentType?: string | null;
  description?: string | null;
}): Promise<NextRequest> {
  const formData = new FormData();
  if (opts.file) formData.append("file", opts.file);
  if (opts.documentType != null) formData.append("document_type", opts.documentType);
  if (opts.description != null) formData.append("description", opts.description);
  const req = new NextRequest("http://localhost/api/account/documents/upload", {
    method: "POST",
  });
  vi.spyOn(req, "formData").mockResolvedValue(formData);
  return req;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    uploadError = null;
    insertResult = { data: { id: "doc-uuid" }, error: null };
    storageBucket.upload.mockImplementation(async () => ({ error: uploadError }));
    insertChain.single.mockImplementation(async () => insertResult);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(await makeReq({ file: makeFile(), documentType: "tax_return" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when the per-user rate limit is exceeded", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(await makeReq({ file: makeFile(), documentType: "tax_return" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(await makeReq({ file: null, documentType: "tax_return" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no file/i);
  });

  it("returns 400 when document_type is not in the allowlist", async () => {
    const res = await POST(await makeReq({ file: makeFile(), documentType: "passport" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/document_type/i);
  });

  it("returns 400 for a disallowed mime type", async () => {
    const res = await POST(
      await makeReq({ file: makeFile("image/gif", "x.gif"), documentType: "other" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/file type/i);
  });

  it("returns 400 when the file exceeds the 20 MB cap", async () => {
    const big = makeFile("application/pdf", "big.pdf", MAX_BYTES + 1);
    const res = await POST(await makeReq({ file: big, documentType: "tax_return" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await POST(
      await makeReq({
        file: makeFile(),
        documentType: "other",
        description: "x".repeat(501),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/description/i);
  });

  it("stores the object under the owner's UID folder and returns 201", async () => {
    const res = await POST(await makeReq({ file: makeFile(), documentType: "tax_return" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "doc-uuid" });

    const uploadCall = storageBucket.upload.mock.calls[0] as unknown as [string, unknown, unknown];
    const storagePath = uploadCall[0];
    // First path segment must be the owner UID (matches the storage.objects RLS policy).
    expect(storagePath.split("/")[0]).toBe(USER.id);
    expect(storagePath).toMatch(/\.pdf$/);

    // user_id on the inserted row must be the authenticated user.
    const insertArgs = insertChain.insert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(insertArgs[0]).toMatchObject({ user_id: USER.id, document_type: "tax_return" });
  });

  it("sanitises path separators out of the filename (no traversal segment)", async () => {
    const res = await POST(
      await makeReq({
        file: makeFile("application/pdf", "../../etc/passwd", 100),
        documentType: "other",
      }),
    );
    expect(res.status).toBe(201);
    const uploadCall = storageBucket.upload.mock.calls[0] as unknown as [string, unknown, unknown];
    const storagePath = uploadCall[0];
    // Object key has exactly 3 segments: {uid}/{docId}/{filename} — every "/" in
    // the original name was rewritten to "_", so the filename contributes no
    // extra separator and "../" cannot escape the owner folder.
    expect(storagePath.split("/")).toHaveLength(3);
    expect(storagePath.split("/")[0]).toBe(USER.id);
    const fileSegment = storagePath.split("/")[2];
    expect(fileSegment).not.toContain("/");
  });

  it("falls back to a safe name when the filename is only dots", async () => {
    const res = await POST(
      await makeReq({ file: makeFile("image/png", "..", 100), documentType: "other" }),
    );
    expect(res.status).toBe(201);
    const uploadCall = storageBucket.upload.mock.calls[0] as unknown as [string, unknown, unknown];
    const fileSegment = (uploadCall[0] as string).split("/")[2];
    // A pure-dots filename must not survive as the object key's last segment.
    expect(fileSegment).toBe("document.png");
  });

  it("removes the orphaned object and returns 500 when the DB insert fails", async () => {
    insertResult = { data: null, error: { message: "boom" } };
    insertChain.single.mockImplementationOnce(async () => insertResult);
    const res = await POST(await makeReq({ file: makeFile(), documentType: "tax_return" }));
    expect(res.status).toBe(500);
    // Cleanup must fire so storage doesn't accumulate orphans.
    expect(storageBucket.remove).toHaveBeenCalledTimes(1);
  });
});
