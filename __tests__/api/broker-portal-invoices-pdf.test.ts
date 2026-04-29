import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/utils", () => ({
  formatDate: vi.fn((iso: string) => new Date(iso).toLocaleDateString("en-AU")),
}));

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/broker-portal/invoices/${id}/pdf`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const baseInvoice = {
  id: 42,
  invoice_number: "INV-2026-042",
  status: "paid",
  amount_cents: 11000,
  subtotal_cents: 10000,
  tax_cents: 1000,
  description: "Marketplace ad spend",
  broker_slug: "commsec",
  broker_company_name: "CommSec Pty Ltd",
  broker_email: "billing@commsec.com.au",
  broker_abn: "48 123 123 124",
  line_items: null,
  currency: "AUD",
  created_at: new Date().toISOString(),
  paid_at: new Date().toISOString(),
};

describe("GET /api/broker-portal/invoices/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "broker@example.com" } } });
  });

  it("returns 400 for non-numeric invoice ID", async () => {
    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when no active broker account", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when invoice not found for this broker", async () => {
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    expect(res.status).toBe(404);
  });

  it("returns HTML with Content-Type text/html", async () => {
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: baseInvoice, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("sets Content-Disposition with invoice number in filename", async () => {
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: baseInvoice, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("INV-2026-042");
    expect(disposition).toContain("inline");
  });

  it("includes status label PAID in HTML body", async () => {
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: baseInvoice, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const html = await res.text();
    expect(html).toContain("PAID");
  });

  it("renders PENDING status label for unpaid invoices", async () => {
    const pendingInvoice = { ...baseInvoice, status: "pending", paid_at: null };
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: pendingInvoice, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const html = await res.text();
    expect(html).toContain("PENDING");
  });

  it("uses line_items JSON when present", async () => {
    const invoiceWithItems = {
      ...baseInvoice,
      line_items: JSON.stringify([
        { description: "Lead delivery — March 2026", amount_cents: 5000, quantity: 2 },
        { description: "Platform fee", amount_cents: 1000, quantity: 1 },
      ]),
    };
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: invoiceWithItems, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const html = await res.text();
    expect(html).toContain("Lead delivery");
    expect(html).toContain("Platform fee");
  });

  it("falls back to single description line when line_items is null", async () => {
    const invoiceNoItems = { ...baseInvoice, line_items: null, description: "Monthly ad spend" };
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: invoiceNoItems, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const html = await res.text();
    expect(html).toContain("Monthly ad spend");
  });

  it("escapes XSS in invoice fields", async () => {
    const xssInvoice = { ...baseInvoice, broker_company_name: '<script>alert("xss")</script>' };
    const accountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { broker_slug: "commsec" } }),
    };
    const invoiceChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: xssInvoice, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(accountChain)
      .mockReturnValueOnce(invoiceChain);

    const { GET } = await import("@/app/api/broker-portal/invoices/[id]/pdf/route");
    const res = await GET(makeReq("42"), makeParams("42"));
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
