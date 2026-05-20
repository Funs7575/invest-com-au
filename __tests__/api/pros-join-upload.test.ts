/**
 * Tests for POST /api/pros/join/upload
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockStorageFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    storage: { from: mockStorageFrom },
  })),
}));

import { POST } from "@/app/api/pros/join/upload/route";

function makeReq(formData: FormData): NextRequest {
  return new NextRequest("http://localhost/api/pros/join/upload", {
    method: "POST",
    body: formData,
  });
}

function makeUploadChain(uploadError: unknown = null) {
  return { upload: vi.fn(async () => ({ error: uploadError })) };
}

describe("POST /api/pros/join/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockStorageFrom.mockReturnValue(makeUploadChain(null));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const fd = new FormData();
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    fd.append("file", file);
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file provided", async () => {
    const fd = new FormData();
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported MIME type", async () => {
    const fd = new FormData();
    const file = new File(["gif content"], "test.gif", { type: "image/gif" });
    fd.append("file", file);
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(400);
  });

  it("returns 200 with storage_path for valid PDF", async () => {
    const fd = new FormData();
    const file = new File([new Uint8Array(100)], "verification.pdf", { type: "application/pdf" });
    fd.append("file", file);
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.storage_path).toMatch(/^pending\//);
    expect(json.storage_path).toMatch(/\.pdf$/);
  });

  it("returns 200 for valid image upload", async () => {
    const fd = new FormData();
    const file = new File([new Uint8Array(100)], "doc.jpg", { type: "image/jpeg" });
    fd.append("file", file);
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.storage_path).toMatch(/\.jpg$/);
  });

  it("returns 500 when storage upload fails", async () => {
    mockStorageFrom.mockReturnValue(makeUploadChain({ message: "storage error" }));
    const fd = new FormData();
    const file = new File([new Uint8Array(100)], "test.pdf", { type: "application/pdf" });
    fd.append("file", file);
    const res = await POST(makeReq(fd));
    expect(res.status).toBe(500);
  });
});
