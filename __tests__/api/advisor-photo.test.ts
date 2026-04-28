import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockStorageList = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockIsAllowed = vi.fn();
const mockModeratePhoto = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
    storage: {
      from: vi.fn(() => ({
        list: mockStorageList,
        remove: mockStorageRemove,
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      })),
    },
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
}));

vi.mock("@/lib/photo-moderation", () => ({
  moderatePhoto: (...args: unknown[]) => mockModeratePhoto(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/advisor-photo/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SESSION = { professional_id: "pro-1", expires_at: "2099-01-01T00:00:00Z" };
const ADVISOR = { id: "pro-1", slug: "jane-smith" };
const PUBLIC_URL = "https://cdn.example.com/advisor-photos/jane-smith/123.jpg";

function makeSingleChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

function makeUpdateChain(error: unknown = null) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn().mockResolvedValue({ error });
  return c;
}

// Professionals is called twice: once for SELECT (getAdvisorFromSession) and
// once for UPDATE (after moderation). Use a call-counter to serve both.
let _profCallIdx = 0;
function makeProfChain() {
  const selectChain: Record<string, unknown> = {};
  selectChain.select = vi.fn(() => selectChain);
  selectChain.eq = vi.fn(() => selectChain);
  selectChain.single = vi.fn().mockResolvedValue({ data: ADVISOR, error: null });

  const updateChain = makeUpdateChain();

  const dispatcher: Record<string, unknown> = {};
  dispatcher.select = vi.fn(() => {
    Object.assign(dispatcher, selectChain);
    return selectChain;
  });
  dispatcher.update = vi.fn(() => {
    Object.assign(dispatcher, updateChain);
    return updateChain;
  });
  dispatcher.eq = vi.fn(() => dispatcher);
  dispatcher.single = vi.fn().mockResolvedValue({ data: ADVISOR, error: null });
  return dispatcher;
}

function makeFormData(
  opts: { file?: File | null; slug?: string } = {}
): FormData {
  const fd = new FormData();
  if (opts.file !== null) {
    const file = opts.file ?? new File(["data"], "photo.jpg", { type: "image/jpeg", size: 100 } as FilePropertyBag);
    fd.append("file", file);
  }
  if (opts.slug !== undefined) fd.append("slug", opts.slug);
  return fd;
}

function makePost(fd: FormData, cookie = "advisor_session=tok123"): NextRequest {
  const req = new NextRequest("http://localhost/api/advisor-photo", {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd,
  });
  return req;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _profCallIdx = 0;
    // Default: valid session. "professionals" dispatches to select or update chain
    // depending on whether .select() or .update() is called on it.
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") return makeSingleChain(SESSION);
      if (table === "professionals") return makeProfChain();
      return makeUpdateChain();
    });
    mockIsAllowed.mockResolvedValue(true);
    mockStorageList.mockResolvedValue({ data: [], error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: PUBLIC_URL } });
    mockModeratePhoto.mockResolvedValue({ verdict: "clean", provider: "stub" });
    mockAdminFrom.mockReturnValue(makeUpdateChain());
  });

  it("returns 401 when no advisor_session cookie", async () => {
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" }), ""));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is not found", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") return makeSingleChain(null);
      return makeSingleChain(ADVISOR);
    });
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions")
        return makeSingleChain({ ...SESSION, expires_at: "2020-01-01T00:00:00Z" });
      return makeSingleChain(ADVISOR);
    });
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file provided", async () => {
    const fd = new FormData();
    fd.append("slug", "jane-smith");
    const res = await POST(makePost(fd));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no file/i);
  });

  it("returns 403 when slug does not match advisor", async () => {
    const res = await POST(makePost(makeFormData({ slug: "other-advisor" })));
    expect(res.status).toBe(403);
  });

  it("returns 400 for disallowed file type", async () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    const res = await POST(makePost(makeFormData({ file, slug: "jane-smith" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid file type/i);
  });

  it("returns 400 when file exceeds 5MB", async () => {
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const res = await POST(makePost(makeFormData({ file: bigFile, slug: "jane-smith" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it("returns 500 when storage upload fails", async () => {
    mockStorageUpload.mockResolvedValue({ error: { message: "upload failed" } });
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(500);
  });

  it("returns 400 when photo moderation rejects the image", async () => {
    mockModeratePhoto.mockResolvedValue({ verdict: "rejected", provider: "openai", confidence: 0.98 });
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/rejected/i);
    expect(mockStorageRemove).toHaveBeenCalled();
  });

  it("returns 500 when professionals profile update fails", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") return makeSingleChain(SESSION);
      if (table === "professionals") {
        const dispatcher: Record<string, unknown> = {};
        dispatcher.select = vi.fn(() => {
          const sel: Record<string, unknown> = {};
          sel.eq = vi.fn(() => sel);
          sel.single = vi.fn().mockResolvedValue({ data: ADVISOR, error: null });
          return sel;
        });
        dispatcher.update = vi.fn(() => {
          const upd: Record<string, unknown> = {};
          upd.eq = vi.fn().mockResolvedValue({ error: { message: "db error" } });
          return upd;
        });
        return dispatcher;
      }
      return makeUpdateChain();
    });
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(500);
  });

  it("returns 200 with publicUrl and moderation verdict on success", async () => {
    // Uses beforeEach defaults: valid session, clean moderation, upload ok
    const res = await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.publicUrl).toBe(PUBLIC_URL);
    expect(json.moderation).toBe("clean");
  });

  it("deletes existing photos before uploading", async () => {
    mockStorageList.mockResolvedValue({ data: [{ name: "old.jpg" }], error: null });
    await POST(makePost(makeFormData({ slug: "jane-smith" })));
    expect(mockStorageRemove).toHaveBeenCalledWith(
      expect.arrayContaining(["jane-smith/old.jpg"]),
    );
  });
});
