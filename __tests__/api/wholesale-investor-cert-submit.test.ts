import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockIsAllowed, mockServerFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockServerFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
    storage: { from: mockStorageFrom },
  })),
}));

import { POST } from "@/app/api/wholesale-investor-cert/submit/route";

const USER = { id: "user-9", email: "wholesale@example.com" };

function pdf(name = "cert.pdf", bytes = 100): File {
  return new File([new Uint8Array(bytes).fill(65)], name, { type: "application/pdf" });
}

function makeReq(fields: Record<string, string | File> = {}): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const req = new NextRequest("http://localhost/api/wholesale-investor-cert/submit", { method: "POST" });
  vi.spyOn(req, "formData").mockResolvedValue(fd);
  return req;
}

// from("wholesale_investor_certifications") — dup-guard read + insert
function buildFrom(opts: {
  existing?: { id: string; status: string; expires_at: string } | null;
  insertResult?: { data: unknown; error: unknown };
} = {}) {
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn(async () => opts.insertResult ?? { data: { id: "cert-new" }, error: null }),
  };
  return vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({ data: opts.existing ?? null, error: null })),
    insert: vi.fn(() => insertChain),
  }));
}

describe("POST /api/wholesale-investor-cert/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockServerFrom.mockImplementation(buildFrom());
    mockStorageFrom.mockReturnValue({
      upload: vi.fn(async () => ({ error: null })),
      remove: vi.fn(async () => ({ error: null })),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(429);
  });

  it("returns 409 when an active verified certification already exists", async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockServerFrom.mockImplementation(buildFrom({ existing: { id: "cert-old", status: "verified", expires_at: future } }));
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string; certId: string };
    expect(json.error).toMatch(/active certification/i);
    expect(json.certId).toBe("cert-old");
  });

  it("returns 409 when a pending certification is under review", async () => {
    mockServerFrom.mockImplementation(buildFrom({ existing: { id: "cert-p", status: "pending", expires_at: "" } }));
    const res = await POST(makeReq({ certification_type: "professional_investor", evidence_doc: pdf() }));
    expect(res.status).toBe(409);
    expect((await res.json() as { error: string }).error).toMatch(/under review/i);
  });

  it("allows re-submission when an existing verified cert has expired", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    mockServerFrom.mockImplementation(buildFrom({ existing: { id: "cert-exp", status: "verified", expires_at: past } }));
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(201);
  });

  it("returns 400 when certification_type is missing or not an allowed s708 type", async () => {
    const res = await POST(makeReq({ certification_type: "retail_investor", evidence_doc: pdf() }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/certification_type/i);
  });

  it("returns 400 when the evidence_doc file is missing", async () => {
    const res = await POST(makeReq({ certification_type: "s708_sophisticated" }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/evidence_doc/i);
  });

  it("returns 400 for a disallowed mime type", async () => {
    const gif = new File(["g"], "x.gif", { type: "image/gif" });
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: gif }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/pdf, jpg, or png/i);
  });

  it("returns 400 when the file exceeds the 10 MB cap", async () => {
    const big = pdf("big.pdf", 10 * 1024 * 1024 + 1);
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: big }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/too large/i);
  });

  it("returns 500 when the storage upload fails", async () => {
    mockStorageFrom.mockReturnValue({
      upload: vi.fn(async () => ({ error: { message: "storage boom" } })),
      remove: vi.fn(async () => ({ error: null })),
    });
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(500);
    expect((await res.json() as { error: string }).error).toMatch(/upload failed/i);
  });

  it("rolls back the uploaded object and returns 500 when the DB insert fails", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    mockStorageFrom.mockReturnValue({ upload: vi.fn(async () => ({ error: null })), remove });
    mockServerFrom.mockImplementation(buildFrom({ insertResult: { data: null, error: { message: "db boom" } } }));
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(500);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("uploads under the owner UID folder and returns 201 pending on the happy path", async () => {
    mockServerFrom.mockImplementation(buildFrom({ insertResult: { data: { id: "cert-ok" }, error: null } }));
    const upload = vi.fn(async () => ({ error: null }));
    mockStorageFrom.mockReturnValue({ upload, remove: vi.fn(async () => ({ error: null })) });
    const res = await POST(makeReq({ certification_type: "s708_sophisticated", evidence_doc: pdf() }));
    expect(res.status).toBe(201);
    const json = (await res.json()) as { certId: string; status: string };
    expect(json.certId).toBe("cert-ok");
    expect(json.status).toBe("pending");
    const uploadPath = (upload.mock.calls[0] as unknown as [string])[0];
    expect(uploadPath.split("/")[0]).toBe(USER.id);
  });
});
