import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockOrder, mockCreateSignedUrls } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockOrder: vi.fn(),
  mockCreateSignedUrls: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: mockOrder })),
    })),
    storage: { from: vi.fn(() => ({ createSignedUrls: mockCreateSignedUrls })) },
  })),
}));

import { GET } from "@/app/api/account/documents/route";

describe("GET /api/account/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockCreateSignedUrls.mockResolvedValue({ data: [] });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 500 when the query errors", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 200 with documents and signed download urls", async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: "d1", file_path: "u1/d1/file.pdf", file_name: "file.pdf" }],
      error: null,
    });
    mockCreateSignedUrls.mockResolvedValue({
      data: [{ path: "u1/d1/file.pdf", signedUrl: "https://x/y" }],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].download_url).toBe("https://x/y");
  });

  it("tolerates a missing signed url (download_url null)", async () => {
    mockOrder.mockResolvedValue({ data: [{ id: "d1", file_path: "p" }], error: null });
    // createSignedUrls returns no entry for this path — download_url should be null
    mockCreateSignedUrls.mockResolvedValue({ data: [] });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.documents[0].download_url).toBeNull();
  });
});
