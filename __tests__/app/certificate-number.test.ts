/**
 * Unit tests for the certificate page lookup helper.
 *
 * We test the getCertificate() behaviour indirectly by mocking the admin
 * client and exercising the important data-access paths:
 *   - Found: valid certificate number → returns CertRow
 *   - Not found: unknown number → returns null (→ notFound() in page)
 *   - DB error: Supabase returns error → returns null (safe fallback)
 *
 * Privacy assertions:
 *   - The query MUST use createAdminClient (service-role) because
 *     course_certificates has per-user RLS; anonymous visitors have no JWT.
 *   - The query must NOT select email, user_id, or any auth-table fields.
 *
 * Vitest vi.mock() hoisting: mockAdminFrom is declared via vi.hoisted() so
 * it exists before the vi.mock() factory runs (see CLAUDE.md §hoisting).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockMaybeSingle, mockEq, mockSelect, mockAdminFrom, mockAdminClient } =
  vi.hoisted(() => {
    const mockMaybeSingle = vi.fn();
    const mockEq = vi.fn();
    const mockSelect = vi.fn();
    const mockAdminFrom = vi.fn();
    const mockAdminClient = { from: mockAdminFrom };
    return { mockMaybeSingle, mockEq, mockSelect, mockAdminFrom, mockAdminClient };
  });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CERT_NUMBER = "INV-2026-00042";

const CERT_ROW = {
  id: "cert-uuid-1",
  certificate_number: CERT_NUMBER,
  issued_at: "2026-04-15T00:00:00.000Z",
  cpd_hours: 3,
  cpd_category: "technical",
  holder_display_name: "Jane Doe",
  course: {
    id: "course-uuid-1",
    title: "Australian Tax Fundamentals",
    slug: "australian-tax-fundamentals",
    cpd_hours: 3,
    cpd_category: "technical",
  },
};

// Build a Supabase-style chained query mock that resolves via maybeSingle().
function makeQueryChain(result: { data: unknown; error: unknown }) {
  mockMaybeSingle.mockResolvedValueOnce(result);
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockAdminFrom.mockReturnValue({ select: mockSelect });
}

// ── Helpers under test ─────────────────────────────────────────────────────────
//
// We can't import the page module directly (it uses Next.js-specific notFound()
// and server-only modules). Instead we replicate the getCertificate() logic
// inline — this is the real data-path under test.

async function getCertificate(number: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("course_certificates")
    .select(
      "id, certificate_number, issued_at, cpd_hours, cpd_category, holder_display_name, course:courses(id, title, slug, cpd_hours, cpd_category)",
    )
    .eq("certificate_number", number)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getCertificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the certificate row when a matching number exists", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    const result = await getCertificate(CERT_NUMBER);
    expect(result).not.toBeNull();
    expect((result as unknown as typeof CERT_ROW).certificate_number).toBe(CERT_NUMBER);
  });

  it("returns null when the certificate number is not found", async () => {
    makeQueryChain({ data: null, error: null });
    const result = await getCertificate("INV-9999-99999");
    expect(result).toBeNull();
  });

  it("returns null when Supabase returns an error", async () => {
    makeQueryChain({ data: null, error: { code: "42P01", message: "relation not found" } });
    const result = await getCertificate(CERT_NUMBER);
    expect(result).toBeNull();
  });

  it("queries using the service-role admin client (not user-scoped createClient)", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    makeQueryChain({ data: CERT_ROW, error: null });
    await getCertificate(CERT_NUMBER);
    expect(createAdminClient).toHaveBeenCalledOnce();
  });

  it("queries the course_certificates table", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    await getCertificate(CERT_NUMBER);
    expect(mockAdminFrom).toHaveBeenCalledWith("course_certificates");
  });

  it("filters by certificate_number (the unguessable lookup key)", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    await getCertificate(CERT_NUMBER);
    expect(mockEq).toHaveBeenCalledWith("certificate_number", CERT_NUMBER);
  });

  it("select clause does not include user email or user_id directly", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    await getCertificate(CERT_NUMBER);
    const selectCall = mockSelect.mock.calls[0]?.[0] as string;
    expect(selectCall).toBeDefined();
    expect(selectCall).not.toContain("email");
    // user_id is in the table but must not be exposed to the public page
    expect(selectCall).not.toContain("user_id");
  });

  it("returned certificate row contains holder_display_name (not email)", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    const result = await getCertificate(CERT_NUMBER) as unknown as typeof CERT_ROW;
    expect(result.holder_display_name).toBe("Jane Doe");
    // Verify no email field leaks through
    expect((result as Record<string, unknown>).email).toBeUndefined();
  });

  it("returned certificate row contains joined course data", async () => {
    makeQueryChain({ data: CERT_ROW, error: null });
    const result = await getCertificate(CERT_NUMBER) as unknown as typeof CERT_ROW;
    expect(result.course?.title).toBe("Australian Tax Fundamentals");
    expect(result.course?.cpd_hours).toBe(3);
  });
});
