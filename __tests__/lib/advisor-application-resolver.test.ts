import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

// ── Module-scope mock handles (used in vi.mock factories below) ──────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

import {
  lookupAfsl,
  lookupAbn,
  classifyPendingApplication,
  applyApplicationVerdict,
  verifyApplicationEndToEnd,
  notifyAdminApplicationEscalated,
} from "@/lib/advisor-application-resolver";

// ── Query chain helpers ──────────────────────────────────────────────────────

function maybySingle(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function singleResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function insertSingleResult(data: unknown, error: unknown = null) {
  const obj = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
  return obj;
}

function updateChain(error: unknown = null) {
  const prom = Promise.resolve({ error });
  const chain = Object.assign(prom, {
    eq: vi.fn(),
    in: vi.fn(() => prom),
  });
  chain.eq.mockReturnValue(chain);
  return { update: vi.fn().mockReturnValue(chain) };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const APP_ROW = {
  id: 1,
  name: "Alex Chen",
  firm_name: null,
  email: "alex@example.com",
  phone: "0411000000",
  type: "debt_counsellor", // ABN_REQUIRED but abn null → escalate
  afsl_number: null,
  registration_number: null,
  abn: null,
  bio: null,
  website: null,
  location_state: "NSW",
  years_experience: 5,
  specialties: null,
  status: "pending",
};

// Full app as loaded in the approve branch (more fields)
const APP_FULL = {
  ...APP_ROW,
  photo_url: null,
  location_suburb: null,
  fee_description: null,
  firm_id: null,
  languages: null,
  client_types: null,
};

// ── lookupAfsl ────────────────────────────────────────────────────────────────

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

// ── lookupAbn ─────────────────────────────────────────────────────────────────

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
          JSON.stringify({ EntityName: "Test Co", AbnStatus: "Active", Abn: "51824753556" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const res = await lookupAbn("51 824 753 556");
    expect(res.performed).toBe(true);
  });

  it("maps AbnStatus 'Active' to entityStatus 'active'", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ EntityName: "Test Co", AbnStatus: "Active", Abn: "51824753556" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.entityStatus).toBe("active");
    expect(res.entityName).toBe("Test Co");
  });

  it("maps non-Active AbnStatus to entityStatus 'cancelled'", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ EntityName: "Old Co", AbnStatus: "Cancelled", Abn: "51824753556" }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.entityStatus).toBe("cancelled");
  });

  it("returns entityStatus 'not_found' when Abn field is missing from response", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ EntityName: null, AbnStatus: null }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(true);
    expect(res.entityStatus).toBe("not_found");
  });

  it("returns 'not_found' when response body contains no JSON braces", async () => {
    process.env.ABN_LOOKUP_GUID = "g";
    globalThis.fetch = vi.fn(
      async () => new Response("not json at all", { status: 200 }),
    ) as unknown as typeof fetch;
    const res = await lookupAbn("51824753556");
    expect(res.performed).toBe(true);
    expect(res.entityStatus).toBe("not_found");
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

// ── classifyPendingApplication ────────────────────────────────────────────────

describe("classifyPendingApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:false when DB returns error", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle(null, { message: "connection failed" }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("application_not_found");
  });

  it("returns ok:false when application not found in DB", async () => {
    mockFrom.mockImplementationOnce(() => maybySingle(null));
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("application_not_found");
  });

  it("returns ok:false with already_<status> when application is not pending", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle({ ...APP_ROW, status: "approved" }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already_approved");
  });

  it("returns ok:false with already_rejected reason for rejected applications", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle({ ...APP_ROW, status: "rejected" }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already_rejected");
  });

  it("returns ok:true with classifier result for a pending application", async () => {
    mockFrom.mockImplementationOnce(() => maybySingle(APP_ROW));
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // type="debt_counsellor", abn=null, no ABN_LOOKUP_GUID → escalate:"no_abn_provided"
    expect(res.result.verdict).toBe("escalate");
    expect(res.app.id).toBe(1);
    expect(res.app.email).toBe("alex@example.com");
  });

  it("escalates unknown advisor types", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle({ ...APP_ROW, type: "crystal_ball_reader" }),
    );
    const res = await classifyPendingApplication(1);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.verdict).toBe("escalate");
    expect(res.result.reasons[0]).toContain("unknown_advisor_type");
  });
});

// ── applyApplicationVerdict ───────────────────────────────────────────────────

describe("applyApplicationVerdict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escalate verdict — updates admin_notes and returns applied:true", async () => {
    mockFrom.mockImplementationOnce(() => updateChain());

    const res = await applyApplicationVerdict(1, {
      verdict: "escalate",
      confidence: "low",
      reasons: ["afsl_lookup_unavailable"],
    });
    expect(res.applied).toBe(true);
    expect(res.professionalId).toBeUndefined();
  });

  it("reject verdict — stamps rejection fields and returns applied:true", async () => {
    mockFrom.mockImplementationOnce(() => updateChain());

    const res = await applyApplicationVerdict(1, {
      verdict: "reject",
      confidence: "high",
      reasons: ["AFSL 123456 not found"],
      rejectionReason: "AFSL 123456 not found",
    });
    expect(res.applied).toBe(true);
  });

  it("approve verdict — returns applied:false when app fetch fails", async () => {
    mockFrom.mockImplementationOnce(() => singleResult(null)); // app not found
    const res = await applyApplicationVerdict(1, {
      verdict: "approve",
      confidence: "high",
      reasons: ["afsl_current:123456"],
    });
    expect(res.applied).toBe(false);
  });

  it("approve verdict — creates professional and stamps application", async () => {
    mockFrom
      .mockImplementationOnce(() => singleResult(APP_FULL))       // load full app
      .mockImplementationOnce(() => maybySingle(null))             // no slug collision
      .mockImplementationOnce(() => insertSingleResult({ id: 77 })) // professional insert
      .mockImplementationOnce(() => updateChain());                // stamp application

    const res = await applyApplicationVerdict(1, {
      verdict: "approve",
      confidence: "high",
      reasons: ["afsl_current:234567"],
    });
    expect(res.applied).toBe(true);
    expect(res.professionalId).toBe(77);
  });

  it("approve verdict — appends timestamp suffix when slug already exists", async () => {
    mockFrom
      .mockImplementationOnce(() => singleResult(APP_FULL))
      .mockImplementationOnce(() => maybySingle({ id: 55 })) // existing slug
      .mockImplementationOnce(() => insertSingleResult({ id: 78 }))
      .mockImplementationOnce(() => updateChain());

    const res = await applyApplicationVerdict(1, {
      verdict: "approve",
      confidence: "high",
      reasons: ["afsl_current:234567"],
    });
    expect(res.applied).toBe(true);
    expect(res.professionalId).toBe(78);
  });

  it("approve verdict — escalates when professional insert fails", async () => {
    mockFrom
      .mockImplementationOnce(() => singleResult(APP_FULL))
      .mockImplementationOnce(() => maybySingle(null))
      .mockImplementationOnce(() =>
        insertSingleResult(null, { message: "unique_violation" }),
      )
      .mockImplementationOnce(() => updateChain()); // escalation update

    const res = await applyApplicationVerdict(1, {
      verdict: "approve",
      confidence: "high",
      reasons: ["afsl_current:234567"],
    });
    expect(res.applied).toBe(false);
  });
});

// ── verifyApplicationEndToEnd ─────────────────────────────────────────────────

describe("verifyApplicationEndToEnd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns applied:false with verdict:escalate when classify fails (DB error)", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle(null, { message: "network error" }),
    );
    const res = await verifyApplicationEndToEnd(1);
    expect(res.applied).toBe(false);
    expect(res.verdict).toBe("escalate");
    expect(res.reasons).toContain("application_not_found");
  });

  it("classifies then applies — escalate path end-to-end", async () => {
    mockFrom
      .mockImplementationOnce(() => maybySingle(APP_ROW)) // classifyPendingApplication
      .mockImplementationOnce(() => updateChain());        // applyApplicationVerdict (escalate)

    const res = await verifyApplicationEndToEnd(1);
    expect(res.applied).toBe(true);
    expect(res.verdict).toBe("escalate");
    expect(res.reasons.length).toBeGreaterThan(0);
  });
});

// ── notifyAdminApplicationEscalated ──────────────────────────────────────────

describe("notifyAdminApplicationEscalated", () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("returns immediately without calling fetch when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    await notifyAdminApplicationEscalated(1, "Alex Chen", {
      verdict: "escalate",
      confidence: "low",
      reasons: ["afsl_lookup_unavailable"],
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to Resend with subject containing applicant name", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    await notifyAdminApplicationEscalated(1, "Alex Chen", {
      verdict: "escalate",
      confidence: "medium",
      reasons: ["firm_name_not_matched_but_afsl_valid", "has_bio"],
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = (mockFetch.mock.calls as unknown as [string, RequestInit][])[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect((opts as RequestInit).method).toBe("POST");
    const body = JSON.parse((opts as RequestInit).body as string) as Record<string, unknown>;
    expect(body.to).toBe("admin@invest.com.au");
    expect(body.subject).toContain("Alex Chen");
    expect(body.subject).toContain("escalated");
  });
});
