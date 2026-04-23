import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let insertError: { message: string } | null = null;
let insertedRow: { id: number } | null = { id: 101 };
let listResult: unknown[] | null = [];
let updateError: { message: string } | null = null;

const insertCalls: Record<string, unknown>[] = [];
const updateCalls: { payload: Record<string, unknown>; id: number }[] = [];
const queryCalls: { filters: { col: string; val: unknown }[]; order?: { col: string; asc: boolean } }[] =
  [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "advisor_kyc_documents") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          insertCalls.push(row);
          return insertError
            ? { data: null, error: insertError }
            : { data: insertedRow, error: null };
        },
      }),
    }),
    update: (payload: Record<string, unknown>) => ({
      eq: async (_col: string, id: number) => {
        updateCalls.push({ payload, id });
        return { data: null, error: updateError };
      },
    }),
    select: () => {
      const filters: { col: string; val: unknown }[] = [];
      const chain = {
        eq(col: string, val: unknown) {
          filters.push({ col, val });
          return chain;
        },
        order(col: string, opts: { ascending: boolean }) {
          queryCalls.push({ filters: [...filters], order: { col, asc: opts.ascending } });
          return chain;
        },
        limit: () =>
          Promise.resolve({ data: listResult, error: null }),
        then: (cb: (v: { data: unknown[] | null; error: null }) => unknown) => {
          queryCalls.push({ filters: [...filters] });
          return Promise.resolve(cb({ data: listResult, error: null }));
        },
      };
      return chain;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  isValidKycType,
  recordKycUpload,
  listKycDocuments,
  listPendingKyc,
  verifyKyc,
  rejectKyc,
} from "@/lib/advisor-kyc";

describe("isValidKycType", () => {
  it("accepts the known document types", () => {
    expect(isValidKycType("afsl_certificate")).toBe(true);
    expect(isValidKycType("proof_of_id")).toBe(true);
    expect(isValidKycType("abn_certificate")).toBe(true);
    expect(isValidKycType("insurance")).toBe(true);
    expect(isValidKycType("other")).toBe(true);
  });

  it("rejects unknown strings + non-strings", () => {
    expect(isValidKycType("passport")).toBe(false);
    expect(isValidKycType(null)).toBe(false);
    expect(isValidKycType(42)).toBe(false);
    expect(isValidKycType({})).toBe(false);
  });
});

describe("recordKycUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertedRow = { id: 101 };
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const base = {
    professionalId: 7,
    documentType: "afsl_certificate" as const,
    storagePath: "advisor-kyc/7/abc.pdf",
    originalFilename: "abc.pdf",
    fileSizeBytes: 1024,
    mimeType: "application/pdf",
  };

  it("rejects an invalid document type", async () => {
    const res = await recordKycUpload({
      ...base,
      documentType: "passport" as unknown as "afsl_certificate",
    });
    expect(res).toEqual({ ok: false, error: "invalid_type" });
    expect(insertCalls).toHaveLength(0);
  });

  it("rejects zero or negative size", async () => {
    expect(
      (await recordKycUpload({ ...base, fileSizeBytes: 0 })).error,
    ).toBe("invalid_size");
    expect(
      (await recordKycUpload({ ...base, fileSizeBytes: -1 })).error,
    ).toBe("invalid_size");
  });

  it("rejects oversize (>10MB)", async () => {
    const res = await recordKycUpload({
      ...base,
      fileSizeBytes: 11 * 1024 * 1024,
    });
    expect(res).toEqual({ ok: false, error: "invalid_size" });
  });

  it("rejects disallowed mime types", async () => {
    const res = await recordKycUpload({
      ...base,
      mimeType: "application/octet-stream",
    });
    expect(res).toEqual({ ok: false, error: "invalid_mime" });
  });

  it("inserts with status='submitted' and returns the new id", async () => {
    const res = await recordKycUpload(base);
    expect(res).toEqual({ ok: true, id: 101 });
    expect(insertCalls[0]).toMatchObject({
      professional_id: 7,
      document_type: "afsl_certificate",
      storage_path: "advisor-kyc/7/abc.pdf",
      original_filename: "abc.pdf",
      file_size_bytes: 1024,
      mime_type: "application/pdf",
      status: "submitted",
      expires_at: null,
    });
  });

  it("returns ok:false with error message when the DB insert errors", async () => {
    insertError = { message: "constraint" };
    const res = await recordKycUpload(base);
    expect(res).toEqual({ ok: false, error: "constraint" });
  });

  it("passes through expiresAt when provided", async () => {
    await recordKycUpload({ ...base, expiresAt: "2027-01-01T00:00:00Z" });
    expect(insertCalls[0]?.expires_at).toBe("2027-01-01T00:00:00Z");
  });
});

describe("listKycDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listResult = [];
    queryCalls.length = 0;
  });

  it("returns [] on empty table", async () => {
    listResult = [];
    expect(await listKycDocuments(7)).toEqual([]);
  });

  it("returns the rows in received order", async () => {
    listResult = [{ id: 1 }, { id: 2 }];
    const res = await listKycDocuments(7);
    expect(res).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns [] when null data comes back", async () => {
    listResult = null;
    expect(await listKycDocuments(7)).toEqual([]);
  });
});

describe("listPendingKyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listResult = [];
  });

  it("returns rows from the submitted queue", async () => {
    listResult = [{ id: 9, status: "submitted" }];
    const res = await listPendingKyc();
    expect(res).toHaveLength(1);
    expect(res[0]?.status).toBe("submitted");
  });

  it("returns [] when empty", async () => {
    listResult = [];
    expect(await listPendingKyc()).toEqual([]);
  });
});

describe("verifyKyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateError = null;
    updateCalls.length = 0;
  });

  it("stamps status=verified + verifiedBy + timestamp", async () => {
    const ok = await verifyKyc({
      id: 42,
      verifiedBy: "admin@invest.com.au",
      notes: "Looks good",
    });
    expect(ok).toBe(true);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]?.id).toBe(42);
    expect(updateCalls[0]?.payload).toMatchObject({
      status: "verified",
      verified_by: "admin@invest.com.au",
      verification_notes: "Looks good",
    });
    expect(updateCalls[0]?.payload.verified_at).toEqual(expect.any(String));
  });

  it("returns false on DB error", async () => {
    updateError = { message: "conflict" };
    expect(await verifyKyc({ id: 1, verifiedBy: "x" })).toBe(false);
  });

  it("accepts null notes", async () => {
    await verifyKyc({ id: 5, verifiedBy: "x" });
    expect(updateCalls[0]?.payload.verification_notes).toBeNull();
  });
});

describe("rejectKyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateError = null;
    updateCalls.length = 0;
  });

  it("stamps status=rejected + reason (truncated to 500 chars)", async () => {
    const reason = "x".repeat(1000);
    const ok = await rejectKyc({ id: 9, verifiedBy: "admin@x.com", reason });
    expect(ok).toBe(true);
    expect(updateCalls[0]?.payload.status).toBe("rejected");
    expect(
      (updateCalls[0]?.payload.rejection_reason as string).length,
    ).toBe(500);
  });

  it("returns false on DB error", async () => {
    updateError = { message: "conflict" };
    expect(
      await rejectKyc({ id: 1, verifiedBy: "x", reason: "no" }),
    ).toBe(false);
  });
});
