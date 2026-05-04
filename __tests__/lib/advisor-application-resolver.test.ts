import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/advisor-application-classifier", () => ({ classifyApplication: vi.fn() }));

import {
  lookupAfsl,
  lookupAbn,
  classifyPendingApplication,
  applyApplicationVerdict,
  verifyApplicationEndToEnd,
  notifyAdminApplicationEscalated,
} from "@/lib/advisor-application-resolver";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyApplication } from "@/lib/advisor-application-classifier";
import type { ApplicationVerificationResult } from "@/lib/advisor-application-classifier";

describe("lookupAfsl", () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.AFSL_LOOKUP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.AFSL_LOOKUP_URL;
    else process.env.AFSL_LOOKUP_URL = originalEndpoint;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns performed:false when AFSL number is null", async () => {
    const res = await lookupAfsl(null);
    expect(res.performed).toBe(false);
    expect(res.afslNumber).toBeNull();
  });

  it("returns performed:false when AFSL_LOOKUP_URL is unset", async () => {
    delete process.env.AFSL_LOOKUP_URL;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
    expect(res.afslNumber).toBe("123456");
    expect(res.status).toBeNull();
  });

  it("returns performed:true with body data on happy-path response", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: "current",
            registeredName: "Acme Pty Ltd",
            licenceType: "Financial advice",
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(true);
    expect(res.status).toBe("current");
    expect(res.registeredName).toBe("Acme Pty Ltd");
    expect(res.licenceType).toBe("Financial advice");
  });

  it("defaults status to 'not_found' when body doesn't include status", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    ) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(true);
    expect(res.status).toBe("not_found");
  });

  it("returns performed:false on HTTP error", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 500 }),
    ) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
  });

  it("returns performed:false when fetch throws", async () => {
    process.env.AFSL_LOOKUP_URL = "https://vendor.example/afsl";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    const res = await lookupAfsl("123456");
    expect(res.performed).toBe(false);
  });
});

describe("lookupAbn", () => {
  const originalFetch = globalThis.fetch;
  const originalGuid = process.env.ABN_LOOKUP_GUID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGuid === undefined) delete process.env.ABN_LOOKUP_GUID;
    else process.env.ABN_LOOKUP_GUID = originalGuid;
  });

  it("returns performed:false when abn is null", async () => {
    const res = await lookupAbn(null);
    expect(res.performed).toBe(false);
    expect(res.abn).toBeNull();
  });

  it("returns performed:false when ABN_LOOKUP_GUID is unset", async () => {
    delete process.env.ABN_LOOKUP_GUID;
    const res = await lookupAbn("51 824 753 556");
    expect(res.performed).toBe(false);
    expect(res.abn).toBe("51 824 753 556");
  });

  it("returns entityStatus='not_found' for malformed ABN (not 11 digits)", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    const res = await lookupAbn("123");
    expect(res.performed).toBe(true);
    expect(res.entityStatus).toBe("not_found");
  });

  it("strips spaces before validating", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ EntityName: "Test Co", AbnStatus: "Active" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await lookupAbn("51 824 753 556");
    expect(res.performed).toBe(true);
  });

  it("returns performed:false on HTTP error", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () => new Response("down", { status: 500 }),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(false);
  });

  it("returns performed:false when fetch throws", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    }) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(false);
  });
});

// ─── Supabase mock builder ────────────────────────────────────────────
// Returns a minimal mock Supabase client shaped for the queries made
// inside classifyPendingApplication and applyApplicationVerdict.
function makeDb(
  advisorAppResult: { data: unknown; error: unknown },
  professionals: {
    selectResult?: { data: unknown; error: null };
    insertResult?: { data: { id: number } | null; error: { message: string } | null };
  } = {},
): ReturnType<typeof createAdminClient> {
  const profSelect = professionals.selectResult ?? { data: null, error: null };
  const profInsert = professionals.insertResult ?? { data: { id: 99 }, error: null };

  return {
    from: vi.fn((table: string) => {
      if (table === "advisor_applications") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => advisorAppResult),
              single: vi.fn(async () => advisorAppResult),
            })),
          })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({})) })),
        };
      }
      if (table === "professionals") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => profSelect),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => profInsert),
            })),
          })),
        };
      }
      return {};
    }),
  } as unknown as ReturnType<typeof createAdminClient>;
}

const pendingApp = {
  id: 1,
  name: "Alice Smith",
  firm_name: "Smith Advisory",
  email: "alice@example.com",
  phone: "0400000000",
  type: "financial_adviser",
  afsl_number: null,
  registration_number: null,
  abn: null,
  bio: "Ten years experience.",
  website: null,
  photo_url: null,
  location_state: "NSW",
  location_suburb: "Sydney",
  specialties: "super,tax",
  fee_description: null,
  firm_id: null,
  years_experience: 10,
  languages: "English,Mandarin",
  client_types: null,
  status: "pending",
};

const approveResult: ApplicationVerificationResult = {
  verdict: "approve",
  confidence: "high",
  reasons: ["AFSL verified"],
};

// ─── classifyPendingApplication ──────────────────────────────────────

describe("classifyPendingApplication", () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.RESEND_API_KEY; });

  it("returns ok:false when Supabase returns an error", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: null, error: new Error("db error") }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("application_not_found");
  });

  it("returns ok:false when application row is null", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: null, error: null }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("application_not_found");
  });

  it("returns ok:false with already_<status> reason when not pending", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: { ...pendingApp, status: "approved" }, error: null }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already_approved");
  });

  it("classifies a pending application and returns ok:true", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: pendingApp, error: null }),
    );
    vi.mocked(classifyApplication).mockReturnValue(approveResult);

    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.verdict).toBe("approve");
      expect(res.app).toMatchObject({ id: 1, name: "Alice Smith" });
    }
  });
});

// ─── applyApplicationVerdict ─────────────────────────────────────────

describe("applyApplicationVerdict", () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.RESEND_API_KEY; });

  it("escalate: stamps admin_notes and returns applied:true", async () => {
    const mockEq = vi.fn(async () => ({}));
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: mockEq })),
      })),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result: ApplicationVerificationResult = {
      verdict: "escalate",
      confidence: "low",
      reasons: ["AFSL not found"],
    };
    const res = await applyApplicationVerdict(1, result);
    expect(res.applied).toBe(true);
    expect(mockEq).toHaveBeenCalledWith("id", 1);
  });

  it("reject: updates status to rejected and returns applied:true", async () => {
    const mockUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({})) }));
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        update: mockUpdate,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      })),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result: ApplicationVerificationResult = {
      verdict: "reject",
      confidence: "high",
      reasons: ["ABN cancelled"],
      rejectionReason: "ABN is cancelled",
    };
    const res = await applyApplicationVerdict(1, result);
    expect(res.applied).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" }),
    );
  });

  it("approve: returns applied:false when app select returns null", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: null, error: null }),
    );
    const res = await applyApplicationVerdict(1, approveResult);
    expect(res.applied).toBe(false);
  });

  it("approve: returns applied:false when professional insert fails", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb(
        { data: pendingApp, error: null },
        { insertResult: { data: null, error: { message: "duplicate key" } } },
      ),
    );
    const res = await applyApplicationVerdict(1, approveResult);
    expect(res.applied).toBe(false);
  });

  it("approve: creates professional row and returns professionalId", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: pendingApp, error: null }),
    );
    const res = await applyApplicationVerdict(1, approveResult);
    expect(res.applied).toBe(true);
    expect(res.professionalId).toBe(99);
  });
});

// ─── verifyApplicationEndToEnd ────────────────────────────────────────

describe("verifyApplicationEndToEnd", () => {
  beforeEach(() => { vi.clearAllMocks(); delete process.env.RESEND_API_KEY; });

  it("returns escalate verdict when classify step fails (app not found)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: null, error: null }),
    );
    const res = await verifyApplicationEndToEnd(1);
    expect(res.applied).toBe(false);
    expect(res.verdict).toBe("escalate");
    expect(res.reasons).toContain("application_not_found");
  });

  it("returns the classifier verdict on a successful end-to-end run", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeDb({ data: pendingApp, error: null }),
    );
    vi.mocked(classifyApplication).mockReturnValue(approveResult);

    const res = await verifyApplicationEndToEnd(1);
    expect(res.verdict).toBe("approve");
    expect(res.applied).toBe(true);
  });
});

// ─── notifyAdminApplicationEscalated ─────────────────────────────────

describe("notifyAdminApplicationEscalated", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
  });

  it("returns early without calling fetch when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const result: ApplicationVerificationResult = {
      verdict: "escalate",
      confidence: "low",
      reasons: ["ABN not found"],
    };
    await notifyAdminApplicationEscalated(1, "Alice Smith", result);
    expect(spy).not.toHaveBeenCalled();
  });

  it("calls Resend API with correct subject and admin email when key is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const spy = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const result: ApplicationVerificationResult = {
      verdict: "escalate",
      confidence: "medium",
      reasons: ["AFSL not verified", "ABN mismatch"],
    };
    await notifyAdminApplicationEscalated(42, "Bob Jones", result);

    expect(spy).toHaveBeenCalledOnce();
    const [url, opts] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(opts.body as string) as { subject: string; to: string };
    expect(body.subject).toContain("Bob Jones");
    expect(body.to).toBeTruthy();
  });
});
