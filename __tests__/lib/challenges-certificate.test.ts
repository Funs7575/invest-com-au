import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client so maybeIssueCertificate's DB write is observable.
const { mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();
  return { mockUpdate, mockFrom };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  generateCertificateId,
  maybeIssueCertificate,
} from "@/lib/challenges/certificate";

describe("generateCertificateId", () => {
  it("produces the CC-YYYY-<10hex> format", () => {
    const id = generateCertificateId(new Date("2026-06-12T00:00:00Z"));
    expect(id).toMatch(/^CC-2026-[0-9a-f]{10}$/);
  });

  it("is effectively unique across many calls", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateCertificateId()));
    expect(ids.size).toBe(500);
  });
});

describe("maybeIssueCertificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the existing certificate without writing when already issued", async () => {
    const result = await maybeIssueCertificate(
      { id: "e1", certificate_id: "CC-2026-abc1234567", completed_at: null },
      "investment-ready-21",
      [],
    );
    expect(result).toEqual({
      certificateId: "CC-2026-abc1234567",
      alreadyIssued: true,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns null when the program is not 100% complete", async () => {
    const result = await maybeIssueCertificate(
      { id: "e1", certificate_id: null, completed_at: null },
      "investment-ready-21",
      ["ir21-d01-set-goal"], // only one of many
    );
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns null for an unknown curriculum", async () => {
    const result = await maybeIssueCertificate(
      { id: "e1", certificate_id: null, completed_at: null },
      "does-not-exist",
      [],
    );
    expect(result).toBeNull();
  });

  it("mints a certificate when every task is complete", async () => {
    // Resolve the full key set for the small EOFY curriculum dynamically so the
    // test doesn't hard-code 14 keys.
    const { getCurriculum } = await import("@/lib/challenges/progress");
    const curriculum = getCurriculum("eofy-sprint-14")!;
    const allKeys = curriculum.tasks.map((t) => t.key);

    // from("challenge_enrolments").update(...).eq(...).is(...).select(...).maybeSingle()
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { certificate_id: "CC-2026-deadbeef01" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const isFn = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ is: isFn });
    mockUpdate.mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await maybeIssueCertificate(
      { id: "e1", certificate_id: null, completed_at: null },
      "eofy-sprint-14",
      allKeys,
    );

    expect(mockFrom).toHaveBeenCalledWith("challenge_enrolments");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // The update payload carries a freshly-generated certificate id + completion stamp.
    const payload = mockUpdate.mock.calls[0]![0] as Record<string, unknown>;
    expect(String(payload.certificate_id)).toMatch(/^CC-2026-[0-9a-f]{10}$/);
    expect(payload.completed_at).toBeTruthy();
    expect(result?.alreadyIssued).toBe(false);
    expect(result?.certificateId).toMatch(/^CC-2026-[0-9a-f]{10}$/);
  });

  it("fails soft (returns null) when the update errors", async () => {
    const { getCurriculum } = await import("@/lib/challenges/progress");
    const allKeys = getCurriculum("eofy-sprint-14")!.tasks.map((t) => t.key);

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const isFn = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockReturnValue({ is: isFn });
    mockUpdate.mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await maybeIssueCertificate(
      { id: "e1", certificate_id: null, completed_at: null },
      "eofy-sprint-14",
      allKeys,
    );
    expect(result).toBeNull();
  });
});
