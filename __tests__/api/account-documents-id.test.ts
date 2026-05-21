import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockStorageFrom, mockStorageRemove } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockStorageRemove: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { DELETE } from "@/app/api/account/documents/[id]/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };
const DOC_ID = "doc-uuid-1";

function makeReq(): NextRequest {
  return new NextRequest(`http://localhost/api/account/documents/${DOC_ID}`, { method: "DELETE" });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

// fetch chain: from().select().eq().maybeSingle()
function makeFetchChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// db delete chain: from().delete().eq() — terminal .eq()
function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("DELETE /api/account/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageFrom.mockReturnValue({ remove: mockStorageRemove });
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(401);
  });

  it("returns 500 when the metadata fetch errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeFetchChain({ data: null, error: { message: "boom" } }));
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(500);
  });

  it("returns 404 when the document does not exist (or not owned)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeFetchChain({ data: null, error: null }));
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(404);
  });

  it("deletes storage file and DB row, returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeFetchChain({ data: { id: DOC_ID, file_path: "u/d/f.pdf" }, error: null }))
      .mockReturnValueOnce(makeDeleteChain({ error: null }));
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockStorageRemove).toHaveBeenCalledWith(["u/d/f.pdf"]);
  });

  it("proceeds with DB delete even when storage removal fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockStorageRemove.mockResolvedValueOnce({ error: { message: "storage gone" } });
    const dbChain = makeDeleteChain({ error: null });
    mockFrom
      .mockReturnValueOnce(makeFetchChain({ data: { id: DOC_ID, file_path: "u/d/f.pdf" }, error: null }))
      .mockReturnValueOnce(dbChain);
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(200);
    expect(dbChain.delete).toHaveBeenCalled();
  });

  it("returns 500 when the DB delete errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeFetchChain({ data: { id: DOC_ID, file_path: "u/d/f.pdf" }, error: null }))
      .mockReturnValueOnce(makeDeleteChain({ error: { message: "boom" } }));
    const res = await DELETE(makeReq(), ctx(DOC_ID));
    expect(res.status).toBe(500);
  });
});
