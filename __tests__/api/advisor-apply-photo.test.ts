import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isRateLimitedMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => isRateLimitedMock(),
}));

let uploadError: { message: string } | null = null;
const getPublicUrlResult = { publicUrl: "https://cdn.example.com/advisor-photos/abc-123.jpg" };

const storageBucket = {
  upload: vi.fn(async () => ({ error: uploadError })),
  getPublicUrl: vi.fn(() => ({ data: getPublicUrlResult })),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => storageBucket),
    },
  })),
}));

import { POST } from "@/app/api/advisor-apply/photo/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function makeSmallFile(type = "image/jpeg", name = "photo.jpg"): File {
  const content = new Uint8Array(100).fill(65); // 100 bytes of "A"
  return new File([content], name, { type });
}

async function makeReq(file: File | null, ip = "1.2.3.4"): Promise<NextRequest> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  const req = new NextRequest("http://localhost/api/advisor-apply/photo", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
  vi.spyOn(req, "formData").mockResolvedValue(formData);
  return req;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-apply/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRateLimitedMock.mockResolvedValue(false);
    uploadError = null;
    storageBucket.upload.mockImplementation(async () => ({ error: uploadError }));
    storageBucket.getPublicUrl.mockReturnValue({ data: getPublicUrlResult });
  });

  it("returns 429 when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    const req = await makeReq(makeSmallFile());
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided in formData", async () => {
    const req = await makeReq(null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no file/i);
  });

  it("returns 400 when file type is not jpeg/png/webp", async () => {
    const badFile = makeSmallFile("image/gif", "photo.gif");
    const req = await makeReq(badFile);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/file type/i);
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    // Create a file just over the limit
    const oversized = new Uint8Array(MAX_SIZE + 1).fill(65);
    const bigFile = new File([oversized], "big.jpg", { type: "image/jpeg" });
    const req = await makeReq(bigFile);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too large/i);
  });

  it("returns 500 when Supabase storage upload fails", async () => {
    storageBucket.upload.mockResolvedValueOnce({ error: { message: "bucket not found" } });
    const req = await makeReq(makeSmallFile());
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/upload failed/i);
  });

  it("returns 200 with publicUrl on jpeg upload success", async () => {
    const req = await makeReq(makeSmallFile("image/jpeg", "advisor.jpg"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.publicUrl).toBe(getPublicUrlResult.publicUrl);
  });

  it("returns 200 with publicUrl on png upload success", async () => {
    const req = await makeReq(makeSmallFile("image/png", "advisor.png"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.publicUrl).toBeDefined();
    // Storage path should use .png extension
    const uploadCall = storageBucket.upload.mock.calls[0] as unknown as [string, unknown, unknown];
    expect(uploadCall[0]).toMatch(/\.png$/);
  });

  it("returns 200 with publicUrl on webp upload success", async () => {
    const req = await makeReq(makeSmallFile("image/webp", "advisor.webp"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    const uploadCall = storageBucket.upload.mock.calls[0] as unknown as [string, unknown, unknown];
    expect(uploadCall[0]).toMatch(/\.webp$/);
  });
});
