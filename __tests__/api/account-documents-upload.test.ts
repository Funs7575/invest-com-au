import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockStorageFrom, mockStorageUpload, mockStorageRemove, mockIsAllowed } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockStorageFrom: vi.fn(),
    mockStorageUpload: vi.fn(),
    mockStorageRemove: vi.fn(),
    mockIsAllowed: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/account/documents/upload/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

// POST insert chain: from().insert().select().single()
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeFile(content: string, type: string, name = "statement.pdf"): File {
  return new File([content], name, { type });
}

function makeReq(form: FormData): NextRequest {
  return new NextRequest("http://localhost/api/account/documents/upload", {
    method: "POST",
    body: form,
  });
}

function buildForm(opts: {
  file?: File | string;
  document_type?: string;
  description?: string;
}): FormData {
  const form = new FormData();
  if (opts.file !== undefined) {
    if (typeof opts.file === "string") form.set("file", opts.file);
    else form.set("file", opts.file);
  }
  if (opts.document_type !== undefined) form.set("document_type", opts.document_type);
  if (opts.description !== undefined) form.set("description", opts.description);
  return form;
}

describe("POST /api/account/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockStorageFrom.mockReturnValue({ upload: mockStorageUpload, remove: mockStorageRemove });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(buildForm({ file: makeFile("pdf", "application/pdf"), document_type: "tax_return" })));
    expect(res.status).toBe(401);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(buildForm({ file: makeFile("pdf", "application/pdf"), document_type: "tax_return" })));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makeReq(buildForm({ document_type: "tax_return" })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("returns 400 for an invalid document_type", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(
      makeReq(buildForm({ file: makeFile("pdf", "application/pdf"), document_type: "passport" })),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the description is too long", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(
      makeReq(
        buildForm({
          file: makeFile("pdf", "application/pdf"),
          document_type: "tax_return",
          description: "x".repeat(501),
        }),
      ),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Description too long (max 500 chars)" });
  });

  it("returns 400 for an unsupported mime type", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(
      makeReq(buildForm({ file: makeFile("doc", "application/msword", "x.doc"), document_type: "tax_return" })),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Unsupported file type") });
  });

  it("returns 400 when the file exceeds the size limit", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    // Report an oversized size without allocating 20+ MB. We stub formData()
    // directly because a real multipart round-trip reconstructs the File from
    // its (small) byte content, discarding a `size` override.
    const big = makeFile("x", "application/pdf", "big.pdf");
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024, configurable: true });
    const form = new FormData();
    form.set("file", big);
    form.set("document_type", "tax_return");
    const req = makeReq(form);
    vi.spyOn(req, "formData").mockResolvedValue(form);
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "File too large. Maximum size is 20 MB." });
  });

  it("returns 500 when the storage upload fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockStorageUpload.mockResolvedValueOnce({ error: { message: "storage down" } });
    const res = await POST(
      makeReq(buildForm({ file: makeFile("pdf", "application/pdf"), document_type: "tax_return" })),
    );
    expect(res.status).toBe(500);
  });

  it("cleans up storage and returns 500 when the DB insert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: null, error: { message: "db down" } }));
    const res = await POST(
      makeReq(buildForm({ file: makeFile("pdf", "application/pdf"), document_type: "tax_return" })),
    );
    expect(res.status).toBe(500);
    expect(mockStorageRemove).toHaveBeenCalled();
  });

  it("uploads the file, inserts metadata, and returns 201 with the id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeInsertChain({ data: { id: "new-doc-id" }, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(
      makeReq(
        buildForm({
          file: makeFile("pdf-content", "image/png", "scan.png"),
          document_type: "super_statement",
          description: "Q1 super",
        }),
      ),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "new-doc-id" });
    expect(mockStorageUpload).toHaveBeenCalledOnce();
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      user_id: USER.id,
      document_type: "super_statement",
      mime_type: "image/png",
      description: "Q1 super",
    });
  });

  it("returns 400 when the multipart body cannot be parsed", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/account/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=----x" },
      body: "not actually multipart",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid multipart body" });
  });
});
