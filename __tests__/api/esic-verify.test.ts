import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFromServer, mockStorageFrom, mockAdminFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockFromServer: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromServer,
    storage: { from: mockStorageFrom },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ ok: true, email: "admin@invest.com.au", response: null })),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { POST, PATCH } from "@/app/api/startups/esic-verify/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-111";
const STARTUP_ID = "startup-222";
const VERIF_ID = "verif-333";

function makeMultipart(fields: Record<string, string | File> = {}): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new NextRequest("http://localhost/api/startups/esic-verify", { method: "POST", body: fd });
}

function makePatchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/startups/esic-verify", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function pdfFile(): File {
  return new File(["PDF"], "esic.pdf", { type: "application/pdf" });
}

function buildServerFromChain(overrides: {
  profile?: unknown;
  existingVerif?: unknown;
  insertResult?: unknown;
} = {}) {
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: VERIF_ID }, error: null }),
  };
  if (overrides.insertResult !== undefined) {
    insertChain.single = vi.fn().mockResolvedValue(overrides.insertResult);
  }

  return vi.fn((table: string) => {
    if (table === "startup_profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: overrides.profile ?? null, error: null }),
      };
    }
    if (table === "esic_verifications") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: overrides.existingVerif ?? null, error: null }),
        insert: vi.fn().mockReturnValue(insertChain),
      };
    }
    return {};
  });
}

function buildAdminFromChain(verif: unknown) {
  const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
  return vi.fn((table: string) => {
    if (table === "esic_verifications") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: verif, error: null }),
        update: vi.fn(() => updateChain),
      };
    }
    if (table === "startup_profiles") {
      return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) };
    }
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    return {};
  });
}

// ─── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/startups/esic-verify", () => {
  const validProfile = { id: STARTUP_ID, esic_verified_at: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockFromServer.mockImplementation(buildServerFromChain({ profile: validProfile }));
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(429);
  });

  it("returns 404 when no startup profile found", async () => {
    mockFromServer.mockImplementation(buildServerFromChain({ profile: null }));
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when already ESIC verified", async () => {
    mockFromServer.mockImplementation(
      buildServerFromChain({ profile: { id: STARTUP_ID, esic_verified_at: new Date().toISOString() } }),
    );
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/already approved/i);
  });

  it("returns 409 when pending verification exists", async () => {
    mockFromServer.mockImplementation(
      buildServerFromChain({
        profile: validProfile,
        existingVerif: { id: VERIF_ID, outcome: "pending" },
      }),
    );
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/pending/i);
  });

  it("returns 400 when no evidence provided", async () => {
    const res = await POST(makeMultipart({}));
    expect(res.status).toBe(400);
  });

  it("returns 201 with file upload", async () => {
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(201);
    const body = await res.json() as { verificationId: string; outcome: string };
    expect(body.verificationId).toBe(VERIF_ID);
    expect(body.outcome).toBe("pending");
  });

  it("returns 201 with ATO register check JSON", async () => {
    const atoData = JSON.stringify({
      entity_name: "FinTech Pty Ltd",
      abn: "12345678901",
      esic_registration_date: "2025-01-01",
    });
    const res = await POST(makeMultipart({ ato_register_check: atoData }));
    expect(res.status).toBe(201);
  });

  it("rolls back storage on DB insert failure", async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeMock,
    });
    mockFromServer.mockImplementation(
      buildServerFromChain({
        profile: validProfile,
        insertResult: { data: null, error: { message: "DB error" } },
      }),
    );
    const res = await POST(makeMultipart({ evidence_doc: pdfFile() }));
    expect(res.status).toBe(500);
    expect(removeMock).toHaveBeenCalled();
  });
});

// ─── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/startups/esic-verify", () => {
  const pendingVerif = { id: VERIF_ID, startup_id: STARTUP_ID, outcome: "pending" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockImplementation(buildAdminFromChain(pendingVerif));
  });

  it("returns 400 when verificationId missing", async () => {
    const res = await PATCH(makePatchReq({ action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action invalid", async () => {
    const res = await PATCH(makePatchReq({ verificationId: VERIF_ID, action: "maybe" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when verification not found", async () => {
    mockAdminFrom.mockImplementation(buildAdminFromChain(null));
    const res = await PATCH(makePatchReq({ verificationId: VERIF_ID, action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when outcome is not pending", async () => {
    mockAdminFrom.mockImplementation(buildAdminFromChain({ ...pendingVerif, outcome: "approved" }));
    const res = await PATCH(makePatchReq({ verificationId: VERIF_ID, action: "approve" }));
    expect(res.status).toBe(409);
  });

  it("approves verification successfully", async () => {
    const res = await PATCH(makePatchReq({ verificationId: VERIF_ID, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; outcome: string };
    expect(body.success).toBe(true);
    expect(body.outcome).toBe("approved");
  });

  it("rejects verification successfully", async () => {
    const res = await PATCH(makePatchReq({ verificationId: VERIF_ID, action: "reject", notes: "Invalid doc" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; outcome: string };
    expect(body.success).toBe(true);
    expect(body.outcome).toBe("rejected");
  });
});
