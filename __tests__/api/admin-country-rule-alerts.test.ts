import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

import {
  GET,
  POST,
  PATCH,
  DELETE,
} from "@/app/api/admin/country-rule-alerts/route";

function adminLoggedIn() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u1", email: "finn@invest.com.au" } },
  });
}

function anonLoggedIn() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function nonAdminLoggedIn() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u2", email: "stranger@example.com" } },
  });
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default chain for list/insert/update/delete that resolves to empty
  mockAdminFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/admin/country-rule-alerts — auth", () => {
  it("returns 401 when not signed in", async () => {
    anonLoggedIn();
    const res = await GET(
      makeRequest("GET", "http://localhost/api/admin/country-rule-alerts"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when signed in but not on admin allow-list", async () => {
    nonAdminLoggedIn();
    const res = await GET(
      makeRequest("GET", "http://localhost/api/admin/country-rule-alerts"),
    );
    expect(res.status).toBe(401);
  });

  it("returns rows for authorised admin", async () => {
    adminLoggedIn();
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 1, alert_key: "uk-x" }],
            error: null,
          }),
        }),
      }),
    });

    const res = await GET(
      makeRequest("GET", "http://localhost/api/admin/country-rule-alerts"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toEqual([{ id: 1, alert_key: "uk-x" }]);
  });

  it("returns 400 for invalid country_code filter", async () => {
    adminLoggedIn();
    const res = await GET(
      makeRequest(
        "GET",
        "http://localhost/api/admin/country-rule-alerts?country_code=zz",
      ),
    );
    expect(res.status).toBe(400);
  });

  it("filters by lowercased country_code", async () => {
    adminLoggedIn();
    const eqSpy = vi
      .fn()
      .mockResolvedValue({ data: [], error: null });
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ eq: eqSpy }),
        }),
      }),
    });

    const res = await GET(
      makeRequest(
        "GET",
        "http://localhost/api/admin/country-rule-alerts?country_code=UK",
      ),
    );
    expect(res.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith("country_code", "uk");
  });
});

describe("POST /api/admin/country-rule-alerts — validation", () => {
  it("returns 401 for non-admin", async () => {
    nonAdminLoggedIn();
    const res = await POST(
      makeRequest("POST", "http://localhost/api/admin/country-rule-alerts", {
        alert_key: "uk-test",
        country_code: "uk",
        severity: "info",
        headline: "h",
        body: "b",
        source: "ATO",
        stales_at: "2027-01-01",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid country_code", async () => {
    adminLoggedIn();
    const res = await POST(
      makeRequest("POST", "http://localhost/api/admin/country-rule-alerts", {
        alert_key: "zz-test",
        country_code: "zz",
        severity: "info",
        headline: "h",
        body: "b",
        source: "ATO",
        stales_at: "2027-01-01",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid alert_key format (uppercase)", async () => {
    adminLoggedIn();
    const res = await POST(
      makeRequest("POST", "http://localhost/api/admin/country-rule-alerts", {
        alert_key: "UK-Test",
        country_code: "uk",
        severity: "info",
        headline: "h",
        body: "b",
        source: "ATO",
        stales_at: "2027-01-01",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid stales_at format", async () => {
    adminLoggedIn();
    const res = await POST(
      makeRequest("POST", "http://localhost/api/admin/country-rule-alerts", {
        alert_key: "uk-test",
        country_code: "uk",
        severity: "info",
        headline: "h",
        body: "b",
        source: "ATO",
        stales_at: "not-a-date",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a row when payload is valid", async () => {
    adminLoggedIn();
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 42, alert_key: "uk-new" }, error: null }),
      }),
    });
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "country_rule_alerts") {
        return { insert: insertSpy };
      }
      return { insert: auditInsert };
    });

    const res = await POST(
      makeRequest("POST", "http://localhost/api/admin/country-rule-alerts", {
        alert_key: "uk-new",
        country_code: "uk",
        severity: "warning",
        headline: "Headline",
        body: "Body copy",
        source: "ATO",
        cta_href: "/foreign-investment/united-kingdom",
        cta_label: "UK guide",
        stales_at: "2027-01-01",
        display_order: 10,
        active: true,
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe(42);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_key: "uk-new",
        country_code: "uk",
        severity: "warning",
      }),
    );
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "country_rule_alert:created",
        admin_email: "finn@invest.com.au",
      }),
    );
  });
});

describe("PATCH /api/admin/country-rule-alerts — partial update", () => {
  it("returns 401 for anon", async () => {
    anonLoggedIn();
    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/admin/country-rule-alerts", {
        id: 1,
        active: false,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    adminLoggedIn();
    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/admin/country-rule-alerts", {
        active: false,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("updates a row when payload is valid", async () => {
    adminLoggedIn();
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 7, active: false }, error: null }),
        }),
      }),
    };
    const updateSpy = vi.fn().mockReturnValue(updateChain);
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "country_rule_alerts") {
        return { update: updateSpy };
      }
      return { insert: auditInsert };
    });

    const res = await PATCH(
      makeRequest("PATCH", "http://localhost/api/admin/country-rule-alerts", {
        id: 7,
        active: false,
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: false, updated_at: expect.any(String) }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", 7);
  });
});

describe("DELETE /api/admin/country-rule-alerts", () => {
  it("returns 401 for anon", async () => {
    anonLoggedIn();
    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/admin/country-rule-alerts?id=1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when id query missing", async () => {
    adminLoggedIn();
    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/admin/country-rule-alerts"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is non-numeric", async () => {
    adminLoggedIn();
    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/admin/country-rule-alerts?id=abc"),
    );
    expect(res.status).toBe(400);
  });

  it("deletes the row when id is valid", async () => {
    adminLoggedIn();
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteSpy = vi.fn().mockReturnValue({ eq: eqSpy });
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "country_rule_alerts") {
        return { delete: deleteSpy };
      }
      return { insert: auditInsert };
    });

    const res = await DELETE(
      makeRequest("DELETE", "http://localhost/api/admin/country-rule-alerts?id=42"),
    );
    expect(res.status).toBe(200);
    expect(eqSpy).toHaveBeenCalledWith("id", 42);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "country_rule_alert:deleted" }),
    );
  });
});
