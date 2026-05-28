import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRequireStartupSession, mockIsAllowed, mockServerFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockRequireStartupSession: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockServerFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
}));

vi.mock("@/lib/require-startup-session", () => ({
  requireStartupSession: mockRequireStartupSession,
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: mockServerFrom,
      storage: { from: mockStorageFrom },
    }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/startups/data-room/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTUP_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const FILE_ID = "b1ffc344-9c0b-4ef8-bb6d-6bb9bd380b22";

function makeGetReq(): NextRequest {
  return new NextRequest("http://localhost/api/startups/data-room", { method: "GET" });
}

function makePostReq(fd?: FormData): NextRequest {
  return new NextRequest("http://localhost/api/startups/data-room", {
    method: "POST",
    body: fd,
  });
}

function makeFormData(overrides: {
  file?: File | null;
  category?: string;
  requires_wholesale_cert?: string;
} = {}): FormData {
  const fd = new FormData();
  const file =
    overrides.file !== undefined
      ? overrides.file
      : new File([new Uint8Array(100)], "pitch.pdf", { type: "application/pdf" });
  if (file !== null) fd.append("file", file);
  fd.append("category", overrides.category ?? "pitch_deck");
  if (overrides.requires_wholesale_cert !== undefined) {
    fd.append("requires_wholesale_cert", overrides.requires_wholesale_cert);
  }
  return fd;
}

function makeFilesQueryChain(
  files: Record<string, unknown>[] | null,
  error: { message: string } | null = null,
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: files, error }),
  };
}

function makeCountChain(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ data: [], error: null, count }),
  };
}

function makeInsertChain(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
}

// ─── Tests: GET ───────────────────────────────────────────────────────────────

describe("GET /api/startups/data-room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireStartupSession.mockResolvedValue(STARTUP_ID);
    mockStorageFrom.mockReturnValue({
      createSignedUrls: vi.fn().mockResolvedValue({ data: [] }),
    });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "startup_data_room_files") return makeFilesQueryChain([]);
      return makeCountChain(0);
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireStartupSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 on DB error", async () => {
    mockServerFrom.mockImplementation(() =>
      makeFilesQueryChain(null, { message: "DB error" }),
    );
    const res = await GET(makeGetReq());
    expect(res.status).toBe(500);
  });

  it("returns 200 with empty files list", async () => {
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { files: unknown[] };
    expect(json.files).toHaveLength(0);
  });

  it("returns 200 with files including signed URLs and grant counts", async () => {
    const fakeFile = {
      id: FILE_ID,
      filename: "pitch.pdf",
      category: "pitch_deck",
      requires_wholesale_cert: true,
      round_id: "round-1",
      uploaded_at: new Date().toISOString(),
      storage_path: `${STARTUP_ID}/${FILE_ID}/pitch.pdf`,
    };
    mockStorageFrom.mockReturnValue({
      createSignedUrls: vi.fn().mockResolvedValue({
        data: [{ path: `${STARTUP_ID}/${FILE_ID}/pitch.pdf`, signedUrl: "https://signed.url/file" }],
      }),
    });
    const grantRows = [{ file_id: FILE_ID }, { file_id: FILE_ID }];
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "startup_data_room_files") return makeFilesQueryChain([fakeFile]);
      // startup_data_room_access: return 2 grant rows for FILE_ID
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: grantRows, error: null }),
      };
    });

    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { files: Array<{ download_url: string; active_grants: number }> };
    expect(json.files).toHaveLength(1);
    expect(json.files[0]?.download_url).toBe("https://signed.url/file");
    expect(json.files[0]?.active_grants).toBe(2);
  });
});

// ─── Tests: POST ─────────────────────────────────────────────────────────────

describe("POST /api/startups/data-room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireStartupSession.mockResolvedValue(STARTUP_ID);
    mockIsAllowed.mockResolvedValue(true);
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({}),
    });
    mockServerFrom.mockReturnValue(makeInsertChain({ id: FILE_ID }));
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireStartupSession.mockResolvedValue(null);
    const res = await POST(makePostReq());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData());
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 400 when formData parsing fails", async () => {
    const req = makePostReq();
    vi.spyOn(req, "formData").mockRejectedValue(new Error("multipart parse error"));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no file provided", async () => {
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ file: null }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid category", async () => {
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ category: "invalid_cat" }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/category/i);
  });

  it("returns 400 on disallowed MIME type", async () => {
    const badFile = new File(["data"], "doc.txt", { type: "text/plain" });
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ file: badFile }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/PDF|JPG|PNG/i);
  });

  it("returns 400 when file exceeds size limit", async () => {
    const bigFile = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { get: () => 51 * 1024 * 1024 });
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ file: bigFile }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/too large/i);
  });

  it("returns 500 on storage upload error", async () => {
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "bucket error" } }),
      remove: vi.fn().mockResolvedValue({}),
    });
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData());
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 500 on DB insert error (and removes uploaded file)", async () => {
    const removeSpy = vi.fn().mockResolvedValue({});
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeSpy,
    });
    mockServerFrom.mockReturnValue(makeInsertChain(null, { message: "insert failed" }));
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData());
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(removeSpy).toHaveBeenCalled();
  });

  it("returns 201 with file id on success (PDF)", async () => {
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData());
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json() as { id: string };
    expect(json.id).toBe(FILE_ID);
  });

  it("returns 201 on JPEG upload (covers extForMime jpg branch)", async () => {
    const jpegFile = new File([new Uint8Array(100)], "photo.jpg", { type: "image/jpeg" });
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ file: jpegFile }));
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 201 on PNG upload (covers extForMime png branch)", async () => {
    const pngFile = new File([new Uint8Array(100)], "logo.png", { type: "image/png" });
    const req = makePostReq();
    vi.spyOn(req, "formData").mockResolvedValue(makeFormData({ file: pngFile }));
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
