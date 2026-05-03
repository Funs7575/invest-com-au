import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/advisor-application-classifier", () => ({
  classifyApplication: vi.fn(),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: vi.fn(() => "https://invest.com.au") }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));

import { createAdminClient } from "@/lib/supabase/admin";
import { classifyApplication } from "@/lib/advisor-application-classifier";
import {
  classifyPendingApplication,
  applyApplicationVerdict,
  verifyApplicationEndToEnd,
  notifyAdminApplicationEscalated,
} from "@/lib/advisor-application-resolver";

// ------------------------------------------------------------------
// Shared mock client factory.
// Builds a chainable Supabase stub that consumes `responses` in order.
// single() and maybeSingle() each consume one response; awaiting the
// chain directly (update/insert without terminal call) also consumes one.
// ------------------------------------------------------------------
function makeMockClient(responses: Array<{ data: unknown; error: unknown }>) {
  let idx = 0;
  const next = () => responses[idx++] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {
    then: (
      resolve: (v: { data: unknown; error: unknown }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(next()).then(resolve, reject),
  };
  for (const m of ["select", "eq", "update", "insert", "limit", "order", "not"]) {
    chain[m] = () => chain;
  }
  chain.single = () => Promise.resolve(next());
  chain.maybeSingle = () => Promise.resolve(next());
  return { from: vi.fn(() => chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

// ── classifyPendingApplication ────────────────────────────────────────────────

describe("classifyPendingApplication", () => {
  it("returns ok:false when DB returns an error", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: null, error: { message: "connection refused" } }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    const result = await classifyPendingApplication(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("application_not_found");
  });

  it("returns ok:false when application is not found (null data)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: null, error: null }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    const result = await classifyPendingApplication(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("application_not_found");
  });

  it("returns ok:false with reason 'already_approved' when status is not pending", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: { id: 1, status: "approved" }, error: null }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    const result = await classifyPendingApplication(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("already_approved");
  });

  it("returns ok:true with classified result for a pending application", async () => {
    const pendingApp = {
      id: 1, name: "Jane Doe", firm_name: "Acme Pty", email: "jane@acme.com",
      phone: null, type: "independent", afsl_number: null,
      registration_number: null, abn: null, bio: "Experienced",
      website: null, location_state: "NSW", years_experience: 10,
      specialties: "superannuation", status: "pending",
    };
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: pendingApp, error: null }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    vi.mocked(classifyApplication).mockReturnValue({
      verdict: "escalate" as const,
      confidence: "low" as const,
      reasons: ["no_afsl_lookup"],
    });

    const result = await classifyPendingApplication(1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.verdict).toBe("escalate");
      expect(classifyApplication).toHaveBeenCalledOnce();
    }
  });
});

// ── applyApplicationVerdict ───────────────────────────────────────────────────

describe("applyApplicationVerdict — escalate", () => {
  it("updates admin_notes and returns applied:true", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: null, error: null }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    const result = await applyApplicationVerdict(1, {
      verdict: "escalate" as const,
      confidence: "low" as const,
      reasons: ["no_afsl_lookup"],
    });
    expect(result.applied).toBe(true);
    expect(result.professionalId).toBeUndefined();
  });
});

describe("applyApplicationVerdict — reject", () => {
  it("stamps rejection status and returns applied:true (no RESEND_API_KEY)", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: null, error: null }]) as unknown as ReturnType<typeof createAdminClient>,
    );
    const result = await applyApplicationVerdict(1, {
      verdict: "reject" as const,
      confidence: "high" as const,
      reasons: ["invalid_afsl"],
      rejectionReason: "AFSL number not found on ASIC register",
    });
    expect(result.applied).toBe(true);
  });
});

describe("applyApplicationVerdict — approve", () => {
  const baseApp = {
    id: 1, name: "John Smith", firm_name: "Smith Financial",
    email: "j@smith.com", phone: "0400000000", type: "independent",
    afsl_number: "123456", abn: "51824753556", bio: "Expert",
    website: null, photo_url: null, location_state: "VIC",
    location_suburb: "Melbourne", specialties: "super",
    fee_description: "Fee for service", firm_id: null,
    years_experience: 15, languages: "English", client_types: "retail",
  };

  it("creates professional row and returns professionalId", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([
        { data: baseApp, error: null },       // reload app → .single()
        { data: null, error: null },           // slug collision check → .maybeSingle()
        { data: { id: 99 }, error: null },     // insert professional → .single()
        { data: null, error: null },           // stamp application → .then()
      ]) as unknown as ReturnType<typeof createAdminClient>,
    );

    const result = await applyApplicationVerdict(1, {
      verdict: "approve" as const,
      confidence: "high" as const,
      reasons: ["afsl_current"],
    });

    expect(result.applied).toBe(true);
    expect(result.professionalId).toBe(99);
  });

  it("escalates and returns applied:false when professional insert fails", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([
        { data: baseApp, error: null },                       // reload app
        { data: null, error: null },                          // slug collision check
        { data: null, error: { message: "duplicate key" } }, // insert fails
        { data: null, error: null },                          // fallback escalation update
      ]) as unknown as ReturnType<typeof createAdminClient>,
    );

    const result = await applyApplicationVerdict(1, {
      verdict: "approve" as const,
      confidence: "high" as const,
      reasons: ["afsl_current"],
    });

    expect(result.applied).toBe(false);
  });

  it("returns applied:false when app reload returns null", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([
        { data: null, error: null },  // reload app → null
      ]) as unknown as ReturnType<typeof createAdminClient>,
    );

    const result = await applyApplicationVerdict(1, {
      verdict: "approve" as const,
      confidence: "high" as const,
      reasons: ["afsl_current"],
    });

    expect(result.applied).toBe(false);
  });
});

// ── verifyApplicationEndToEnd ─────────────────────────────────────────────────

describe("verifyApplicationEndToEnd", () => {
  it("returns applied:false with escalate verdict when application is not found", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([{ data: null, error: { message: "not found" } }]) as unknown as ReturnType<typeof createAdminClient>,
    );

    const result = await verifyApplicationEndToEnd(1);

    expect(result.applied).toBe(false);
    expect(result.verdict).toBe("escalate");
    expect(result.reasons).toEqual(["application_not_found"]);
  });

  it("classifies + applies and returns verdict when application is pending", async () => {
    const pendingApp = {
      id: 2, name: "Alice", firm_name: "A", email: "a@a.com",
      phone: null, type: "independent", afsl_number: null,
      registration_number: null, abn: null, bio: "",
      website: null, location_state: "SA", years_experience: 3,
      specialties: null, status: "pending",
    };
    vi.mocked(createAdminClient).mockReturnValue(
      makeMockClient([
        { data: pendingApp, error: null }, // classifyPendingApplication → maybeSingle
        { data: null, error: null },       // applyApplicationVerdict escalate → then
      ]) as unknown as ReturnType<typeof createAdminClient>,
    );
    vi.mocked(classifyApplication).mockReturnValue({
      verdict: "escalate" as const,
      confidence: "low" as const,
      reasons: ["no_afsl_lookup"],
    });

    const result = await verifyApplicationEndToEnd(2);

    expect(result.verdict).toBe("escalate");
    expect(result.reasons).toEqual(["no_afsl_lookup"]);
    expect(result.applied).toBe(true);
  });
});

// ── notifyAdminApplicationEscalated ──────────────────────────────────────────

describe("notifyAdminApplicationEscalated", () => {
  it("returns without fetching when RESEND_API_KEY is not set", async () => {
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    await notifyAdminApplicationEscalated(1, "Jane Doe", {
      verdict: "escalate" as const,
      confidence: "low" as const,
      reasons: ["no_afsl_lookup"],
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls Resend API with correct to/subject when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal("fetch", mockFetch);

    await notifyAdminApplicationEscalated(5, "John Smith", {
      verdict: "escalate" as const,
      confidence: "medium" as const,
      reasons: ["abn_not_found", "no_afsl_lookup"],
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.to).toBe("admin@invest.com.au");
    expect(body.subject).toContain("John Smith");
    expect(body.subject).toContain("escalated");
    expect(body.html).toContain("abn_not_found");
  });
});
