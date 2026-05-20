import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockMaybeSingle, mockDeleteEq, mockRemove } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockDeleteEq: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) })),
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
    })),
    storage: { from: vi.fn(() => ({ remove: mockRemove })) },
  })),
}));

import { DELETE } from "@/app/api/account/documents/[id]/route";

const ctx = { params: Promise.resolve({ id: "doc-1" }) };
function req(): NextRequest {
  return new Request("http://localhost/api/account/documents/doc-1", { method: "DELETE" }) as unknown as NextRequest;
}

describe("DELETE /api/account/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "doc-1", file_path: "u1/doc-1/f.pdf" }, error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockRemove.mockResolvedValue({ error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 500 when the fetch query errors", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(500);
  });

  it("returns 404 when the document is not found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 500 when the DB delete fails", async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: "db" } });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(500);
  });

  it("returns 200 and removes storage + db row on success", async () => {
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRemove).toHaveBeenCalledWith(["u1/doc-1/f.pdf"]);
  });

  it("proceeds to DB delete even if storage remove errors", async () => {
    mockRemove.mockResolvedValue({ error: { message: "storage" } });
    const res = await DELETE(req(), ctx);
    expect(res.status).toBe(200);
  });
});
