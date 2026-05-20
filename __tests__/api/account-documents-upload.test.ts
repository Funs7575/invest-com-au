import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockIsAllowed, mockUpload, mockRemove, mockInsertSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockUpload: vi.fn(),
  mockRemove: vi.fn(),
  mockInsertSingle: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsertSingle })) })),
    })),
    storage: { from: vi.fn(() => ({ upload: mockUpload, remove: mockRemove })) },
  })),
}));

import { POST } from "@/app/api/account/documents/upload/route";

function fileReq(opts: { file?: File; documentType?: string; description?: string } = {}): NextRequest {
  const fd = new FormData();
  if (opts.file !== undefined) fd.set("file", opts.file);
  if (opts.documentType !== undefined) fd.set("document_type", opts.documentType);
  if (opts.description !== undefined) fd.set("description", opts.description);
  return new Request("http://localhost/api/account/documents/upload", {
    method: "POST",
    body: fd,
  }) as unknown as NextRequest;
}

const pdf = () => new File([new Uint8Array([1, 2, 3])], "statement.pdf", { type: "application/pdf" });

describe("POST /api/account/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockIsAllowed.mockResolvedValue(true);
    mockUpload.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
    mockInsertSingle.mockResolvedValue({ data: { id: "new-doc" }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(fileReq({ documentType: "tax_return" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid document_type", async () => {
    const res = await POST(fileReq({ file: pdf(), documentType: "nonsense" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unsupported mime type", async () => {
    const bad = new File([new Uint8Array([1])], "x.exe", { type: "application/x-msdownload" });
    const res = await POST(fileReq({ file: bad, documentType: "tax_return" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return", description: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with the new document id on success", async () => {
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "new-doc" });
  });

  it("returns 500 and cleans up storage when the DB insert fails", async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: "db" } });
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return" }));
    expect(res.status).toBe(500);
    expect(mockRemove).toHaveBeenCalled();
  });

  it("returns 500 when storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "storage" } });
    const res = await POST(fileReq({ file: pdf(), documentType: "tax_return" }));
    expect(res.status).toBe(500);
  });
});
