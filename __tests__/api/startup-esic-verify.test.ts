import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockGetUser, mockIsAllowed, mockServerFrom, mockAdminFrom, mockStorageFrom } =
  vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockGetUser: vi.fn(),
    mockIsAllowed: vi.fn(),
    mockServerFrom: vi.fn(),
    mockAdminFrom: vi.fn(),
    mockStorageFrom: vi.fn(),
  }));

vi.mock("@/lib/require-admin", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockServerFrom,
      storage: { from: mockStorageFrom },
    }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST, PATCH } from "@/app/api/startups/esic-verify/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-001";
const STARTUP_ID = "startup-001";
const VERIFICATION_ID = "verif-uuid-1";

function makeReq(method: "POST" | "PATCH", body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/startups/esic-verify", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeProfile(overrides: Record<string, unknown> = {}) {
  return { id: STARTUP_ID, esic_verified_at: null, ...overrides };
}

function setupServerFrom({
  profile = makeProfile() as Record<string, unknown> | null,
  existingVerification = null as Record<string, unknown> | null,
  insertData = { id: VERIFICATION_ID } as Record<string, unknown> | null,
  insertError = null as { message: string } | null,
} = {}) {
  mockServerFrom.mockImplementation((table: string) => {
    if (table === "startup_profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: profile }),
      };
    }
    if (table === "esic_verifications") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingVerification }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertData, error: insertError }),
      };
    }
    return {};
  });
}

function setupAdminFrom({
  verification = { id: VERIFICATION_ID, startup_id: STARTUP_ID, outcome: "pending" } as Record<string, unknown> | null,
  updateError = null as { message: string } | null,
  profileUpdateError = null as { message: string } | null,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "esic_verifications") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: verification }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: updateError }),
        }),
      };
    }
    if (table === "startup_profiles") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: profileUpdateError }),
        }),
      };
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  });
}

// ─── Tests: POST ─────────────────────────────────────────────────────────────

describe("POST /api/startups/esic-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockIsAllowed.mockResolvedValue(true);
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({}),
    });
    setupServerFrom();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockResolvedValue(new FormData());
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockResolvedValue(new FormData());
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 404 when startup profile not found", async () => {
    setupServerFrom({ profile: null });
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockResolvedValue(new FormData());
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 409 when already ESIC verified", async () => {
    setupServerFrom({ profile: makeProfile({ esic_verified_at: "2026-01-01" }) });
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockResolvedValue(new FormData());
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/already approved/i);
  });

  it("returns 409 when pending verification exists", async () => {
    setupServerFrom({ existingVerification: { id: "existing-verif", outcome: "pending" } });
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockResolvedValue(new FormData());
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json() as { verificationId: string };
    expect(json.verificationId).toBe("existing-verif");
  });

  it("returns 400 on formData parse failure", async () => {
    const req = makeReq("POST", {});
    vi.spyOn(req, "formData").mockRejectedValue(new Error("parse error"));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when neither evidence_doc nor ato_register_check provided", async () => {
    const req = makeReq("POST", {});
    const fd = new FormData();
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/evidence_doc|ato_register_check/i);
  });

  it("returns 400 on invalid ato_register_check JSON", async () => {
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("ato_register_check", "not-valid-json");
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 on text-only ATO register check submission", async () => {
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("ato_register_check", JSON.stringify({ abn: "12345678901", name: "AcmeTech Pty Ltd" }));
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json() as { verificationId: string; outcome: string };
    expect(json.outcome).toBe("pending");
    expect(json.verificationId).toBe(VERIFICATION_ID);
  });

  it("returns 400 on disallowed evidence file MIME", async () => {
    const badFile = new File(["data"], "doc.txt", { type: "text/plain" });
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("evidence_doc", badFile);
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when evidence file exceeds size limit", async () => {
    const bigFile = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(bigFile, "size", { get: () => 11 * 1024 * 1024 });
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("evidence_doc", bigFile);
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on storage upload error", async () => {
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "bucket error" } }),
      remove: vi.fn().mockResolvedValue({}),
    });
    const pdfFile = new File([new Uint8Array(100)], "evidence.pdf", { type: "application/pdf" });
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("evidence_doc", pdfFile);
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 500 on DB insert error (removes uploaded file)", async () => {
    const removeSpy = vi.fn().mockResolvedValue({});
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeSpy,
    });
    setupServerFrom({ insertError: { message: "insert failed" } });
    const pdfFile = new File([new Uint8Array(100)], "evidence.pdf", { type: "application/pdf" });
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("evidence_doc", pdfFile);
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(removeSpy).toHaveBeenCalled();
  });

  it("returns 201 on PDF evidence submission", async () => {
    const pdfFile = new File([new Uint8Array(100)], "evidence.pdf", { type: "application/pdf" });
    const req = makeReq("POST", {});
    const fd = new FormData();
    fd.append("evidence_doc", pdfFile);
    vi.spyOn(req, "formData").mockResolvedValue(fd);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json() as { verificationId: string; outcome: string };
    expect(json.outcome).toBe("pending");
  });
});

// ─── Tests: PATCH ─────────────────────────────────────────────────────────────

describe("PATCH /api/startups/esic-verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", response: null });
    setupAdminFrom();
  });

  it("returns 401 when not admin", async () => {
    const authFailRes = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireAdmin.mockResolvedValue({ ok: false, response: authFailRes });
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/startups/esic-verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when verificationId missing", async () => {
    const res = await PATCH(makeReq("PATCH", { action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "cancel" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when verification not found", async () => {
    setupAdminFrom({ verification: null });
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when verification is not pending", async () => {
    setupAdminFrom({
      verification: { id: VERIFICATION_ID, startup_id: STARTUP_ID, outcome: "approved" },
    });
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "approve" }));
    expect(res.status).toBe(409);
  });

  it("returns 500 on update error", async () => {
    setupAdminFrom({ updateError: { message: "update failed" } });
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "approve" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 on approve with outcome=approved", async () => {
    const res = await PATCH(makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "approve" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; outcome: string };
    expect(json.success).toBe(true);
    expect(json.outcome).toBe("approved");
  });

  it("returns 200 on reject with outcome=rejected", async () => {
    const res = await PATCH(
      makeReq("PATCH", { verificationId: VERIFICATION_ID, action: "reject", notes: "ABN not found" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { outcome: string };
    expect(json.outcome).toBe("rejected");
  });
});
