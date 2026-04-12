import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })
  ),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ ok: true })),
}));

// ── Import routes AFTER mocks ────────────────────────────────────────────────
import { POST as submitPOST } from "@/app/api/listings/submit/route";
import { POST as enquirePOST } from "@/app/api/listings/enquire/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function submitBuilder() {
  const builder = createChainableBuilder("investment_listings");
  builder.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return builder;
}

function enquireListingBuilder(listing: Record<string, unknown> | null) {
  const builder = createChainableBuilder("investment_listings");
  builder.single = vi.fn(() =>
    Promise.resolve({ data: listing, error: listing ? null : { message: "not found" } })
  );
  return builder;
}

function enquireInsertBuilder() {
  const builder = createChainableBuilder("listing_enquiries");
  builder.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return builder;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Listing Submit API — /api/listings/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject listing without title", async () => {
    const req = makeRequest("/api/listings/submit", {
      vertical: "business",
      description:
        "test desc over fifty chars needed for validation to pass properly and correctly",
      contact_email: "test@test.com",
      contact_name: "Test",
      location_state: "NSW",
    });

    const res = await submitPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/title/i);
  });

  it("should reject listing without valid email", async () => {
    const req = makeRequest("/api/listings/submit", {
      vertical: "business",
      title: "Test Listing Title",
      description:
        "test desc over fifty chars needed for validation to pass properly and correctly",
      contact_email: "invalid",
      contact_name: "Test",
      location_state: "NSW",
    });

    const res = await submitPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("should reject listing with invalid vertical", async () => {
    const req = makeRequest("/api/listings/submit", {
      vertical: "invalid_vertical",
      title: "Test Listing Title",
      description:
        "test desc over fifty chars needed for validation to pass properly and correctly",
      contact_email: "test@test.com",
      contact_name: "Test",
      location_state: "NSW",
    });

    const res = await submitPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/vertical/i);
  });

  it("should reject listing without location_state", async () => {
    const req = makeRequest("/api/listings/submit", {
      vertical: "business",
      title: "Test Listing Title",
      description:
        "test desc over fifty chars needed for validation to pass properly and correctly",
      contact_email: "test@test.com",
      contact_name: "Test",
    });

    const res = await submitPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/state/i);
  });

  it("should accept a valid listing submission", async () => {
    mockFrom.mockImplementation(() => submitBuilder());

    const req = makeRequest("/api/listings/submit", {
      vertical: "business",
      title: "Great Business Opportunity",
      description:
        "This is a detailed description that is well over fifty characters for validation purposes.",
      contact_email: "seller@example.com",
      contact_name: "Jane Seller",
      location_state: "VIC",
    });

    const res = await submitPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("Listing Enquire API — /api/listings/enquire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject enquiry without listing_id", async () => {
    const req = makeRequest("/api/listings/enquire", {
      user_name: "Test",
      user_email: "test@test.com",
    });

    const res = await enquirePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/i);
  });

  it("should reject enquiry with invalid email", async () => {
    const req = makeRequest("/api/listings/enquire", {
      listing_id: 1,
      user_name: "Test",
      user_email: "not-an-email",
    });

    const res = await enquirePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("should return 404 for non-existent listing", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "investment_listings") {
        // First call is the existence check — return not found
        return enquireListingBuilder(null);
      }
      return enquireInsertBuilder();
    });

    const req = makeRequest("/api/listings/enquire", {
      listing_id: 999999,
      user_name: "Test",
      user_email: "test@test.com",
    });

    const res = await enquirePOST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("should return 410 for inactive listing", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "investment_listings") {
        callCount++;
        if (callCount === 1) {
          return enquireListingBuilder({ id: 1, status: "expired", title: "Old Listing" });
        }
        // Second call (email lookup) — return listing with contact_email
        return enquireListingBuilder({ contact_email: "seller@test.com", title: "Old Listing", slug: "old-listing" });
      }
      return enquireInsertBuilder();
    });

    const req = makeRequest("/api/listings/enquire", {
      listing_id: 1,
      user_name: "Test",
      user_email: "test@test.com",
    });

    const res = await enquirePOST(req);
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/no longer/i);
  });

  it("should accept valid enquiry for active listing", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "investment_listings") {
        callCount++;
        if (callCount === 1) {
          return enquireListingBuilder({ id: 1, status: "active", title: "Active Listing" });
        }
        // Second call (email lookup)
        return enquireListingBuilder({ contact_email: "seller@test.com", title: "Active Listing", slug: "active-listing" });
      }
      return enquireInsertBuilder();
    });

    const req = makeRequest("/api/listings/enquire", {
      listing_id: 1,
      user_name: "Investor Bob",
      user_email: "bob@investor.com",
      message: "I am interested in this opportunity.",
    });

    const res = await enquirePOST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
