import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockUpload, mockStorageFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockUpload: vi.fn(),
  mockStorageFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    storage: { from: mockStorageFrom },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/join/upload/route";

function makeReqWithForm(form: FormData): NextRequest {
  return new NextRequest("http://localhost/api/pros/join/upload", {
    method: "POST",
    body: form,
  });
}

function makeFile(opts: { type: string; size: number; name?: string }): File {
  const blob = new Blob([new Uint8Array(opts.size)], { type: opts.type });
  return new File([blob], opts.name ?? "doc", { type: opts.type });
}

describe("POST /api/pros/join/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockStorageFrom.mockReturnValue({ upload: mockUpload });
    mockUpload.mockResolvedValue({ error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const form = new FormData();
    form.set("file", makeFile({ type: "application/pdf", size: 100 }));
    const res = await POST(makeReqWithForm(form));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(makeReqWithForm(new FormData()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("returns 400 for an unsupported MIME type", async () => {
    const form = new FormData();
    form.set("file", makeFile({ type: "text/plain", size: 100 }));
    const res = await POST(makeReqWithForm(form));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unsupported file type/);
  });

  it("returns 400 when the file exceeds the size cap", async () => {
    const form = new FormData();
    form.set("file", makeFile({ type: "image/png", size: 11 * 1024 * 1024 }));
    const res = await POST(makeReqWithForm(form));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it("uploads the file and returns the storage path", async () => {
    const form = new FormData();
    form.set("file", makeFile({ type: "application/pdf", size: 1024 }));
    const res = await POST(makeReqWithForm(form));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.storage_path).toMatch(/^pending\/.*\.pdf$/);
    expect(mockStorageFrom).toHaveBeenCalledWith("pro-verification-docs");
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("returns 500 when the storage upload errors", async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: "denied" } });
    const form = new FormData();
    form.set("file", makeFile({ type: "image/webp", size: 1024 }));
    const res = await POST(makeReqWithForm(form));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Upload failed" });
  });
});
