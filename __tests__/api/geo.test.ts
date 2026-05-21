/**
 * Tests for GET /api/geo
 * Public edge route — reads x-vercel-ip-country header and returns { country }.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: mockGet })),
}));

import { GET } from "@/app/api/geo/route";

describe("GET /api/geo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { country: 'AU' } when header is present", async () => {
    mockGet.mockReturnValue("AU");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.country).toBe("AU");
  });

  it("returns { country: null } when header is absent", async () => {
    mockGet.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.country).toBeNull();
  });

  it("sets Cache-Control header", async () => {
    mockGet.mockReturnValue("US");
    const res = await GET();
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("s-maxage=3600");
  });
});
