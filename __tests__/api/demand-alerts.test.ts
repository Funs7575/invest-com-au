import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockMaybeSingle, mockInsert, mockUpdate, mockUpdateEq, fromCalls } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
  fromCalls: [] as string[],
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
        insert: mockInsert,
        update: mockUpdate.mockImplementation(() => ({ eq: mockUpdateEq })),
      };
    }),
  })),
}));

import { POST } from "@/app/api/demand-alerts/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_BODY = {
  email: "Adviser@Firm.com.au",
  states: ["NSW", "VIC"],
  advisor_types: ["smsf_accountant"],
};

function post(body: Record<string, unknown>) {
  return POST(makeRequest("/api/demand-alerts", body));
}

beforeEach(() => {
  vi.clearAllMocks();
  fromCalls.length = 0;
  mockIsRateLimited.mockResolvedValue(false);
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/demand-alerts", () => {
  it("rejects an invalid email with a validation 400", async () => {
    const res = await post({ ...VALID_BODY, email: "not-an-email" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(fromCalls).toHaveLength(0);
  });

  it("rejects unknown states/types via the enum schema", async () => {
    const res = await post({ ...VALID_BODY, states: ["NSW", "Auckland"] });
    expect(res.status).toBe(400);
    const res2 = await post({ ...VALID_BODY, advisor_types: ["astrologer"] });
    expect(res2.status).toBe(400);
    expect(fromCalls).toHaveLength(0);
  });

  it("returns 429 when the per-IP rate limit trips (3 per 10 min)", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(429);
    expect(mockIsRateLimited).toHaveBeenCalledWith("demand-alerts:4.5.6.7", 3, 10);
    expect(fromCalls).toHaveLength(0);
  });

  it("silently accepts honeypot submissions without touching the DB", async () => {
    const res = await post({ ...VALID_BODY, website: "https://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fromCalls).toHaveLength(0);
  });

  it("inserts a new prospect with normalised email, dedup external_id and interest metadata", async () => {
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    expect(fromCalls).toContain("prospects");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.source).toBe("other");
    expect(inserted.external_id).toBe("demand-alert:adviser@firm.com.au");
    expect(inserted.contact_email).toBe("adviser@firm.com.au");
    expect(inserted.status).toBe("new");
    const metadata = inserted.metadata as Record<string, unknown>;
    expect(metadata.kind).toBe("demand_alert");
    expect(metadata.states).toEqual(["NSW", "VIC"]);
    expect(metadata.advisor_types).toEqual(["smsf_accountant"]);
  });

  it("defaults to all-states / all-types when interests are omitted", async () => {
    const res = await post({ email: "a@b.com" });
    expect(res.status).toBe(200);
    const metadata = (mockInsert.mock.calls[0]?.[0] as { metadata: Record<string, unknown> }).metadata;
    expect(metadata.states).toEqual([]);
    expect(metadata.advisor_types).toEqual([]);
  });

  it("updates interests in place for an existing subscriber", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "p-1", status: "contacted", metadata: { kind: "demand_alert", states: ["QLD"], captured_at: "earlier" } },
      error: null,
    });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const update = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = update.metadata as Record<string, unknown>;
    expect(metadata.states).toEqual(["NSW", "VIC"]);
    expect(metadata.captured_at).toBe("earlier"); // prior metadata preserved
    expect(update.status).toBeUndefined(); // status untouched for active rows
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "p-1");
  });

  it("re-activates a previously unsubscribed subscriber on explicit re-signup", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "p-2", status: "unsubscribed", metadata: {} },
      error: null,
    });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    const update = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(update.status).toBe("new");
  });

  it("treats a unique-violation race as success", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 500 when the lookup fails", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);
  });

  it("returns 500 when the insert fails for non-duplicate reasons", async () => {
    mockInsert.mockResolvedValue({ error: { code: "XX000", message: "boom" } });
    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);
  });
});
