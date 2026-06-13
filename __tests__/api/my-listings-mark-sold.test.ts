import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const sessionMock = vi.fn();
vi.mock("@/lib/require-listing-owner-session", () => ({
  requireListingOwnerSession: () => sessionMock(),
}));

const maybeSingleMock = vi.fn();
const updateEqMock = vi.fn();
const updateMock = vi.fn((_payload: Record<string, unknown>) => ({ eq: updateEqMock }));
const selectChain = {
  select: vi.fn(() => selectChain),
  eq: vi.fn(() => selectChain),
  maybeSingle: maybeSingleMock,
  update: updateMock,
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn(() => selectChain) })),
}));

const authedEmailMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: authedEmailMock() } })) },
  })),
}));

import { POST } from "@/app/api/listings/my-listings/mark-sold/route";

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/listings/my-listings/mark-sold", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/listings/my-listings/mark-sold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateEqMock.mockResolvedValue({ error: null });
  });

  it("400s on invalid body", async () => {
    const res = await POST(request({ listing_id: "nope" }));
    expect(res.status).toBe(400);
  });

  it("401s without a listing-owner session", async () => {
    sessionMock.mockResolvedValueOnce(null);
    const res = await POST(request({ listing_id: 12 }));
    expect(res.status).toBe(401);
  });

  it("404s when the session email does not own the listing", async () => {
    sessionMock.mockResolvedValueOnce({ kind: "otp", email: "evil@example.com" });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: 12, contact_email: "owner@example.com", status: "active" },
      error: null,
    });
    const res = await POST(request({ listing_id: 12 }));
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("marks sold with the disclosed price for the OTP owner", async () => {
    sessionMock.mockResolvedValueOnce({ kind: "otp", email: "Owner@Example.com" });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: 12, contact_email: "owner@example.com", status: "active" },
      error: null,
    });
    const res = await POST(request({ listing_id: 12, sold_price_cents: 45_000_00 }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    const payload = updateMock.mock.calls[0]![0];
    expect(payload.status).toBe("sold");
    expect(payload.sold_price_cents).toBe(45_000_00);
    expect(typeof payload.sold_at).toBe("string");
  });

  it("resolves ownership via the auth user email for JWT sessions", async () => {
    sessionMock.mockResolvedValueOnce({ kind: "jwt", userId: "u1", accountId: 7 });
    authedEmailMock.mockReturnValueOnce({ email: "owner@example.com" });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: 12, contact_email: "owner@example.com", status: "active" },
      error: null,
    });
    const res = await POST(request({ listing_id: 12 }));
    expect(res.status).toBe(200);
  });

  it("no-ops politely when already sold", async () => {
    sessionMock.mockResolvedValueOnce({ kind: "otp", email: "owner@example.com" });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: 12, contact_email: "owner@example.com", status: "sold" },
      error: null,
    });
    const res = await POST(request({ listing_id: 12 }));
    expect((await res.json()).already_sold).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("refuses to publish non-active listings into the sold archive", async () => {
    // pending/expired/removed rows haven't passed (or have left) the
    // moderation lifecycle — mark-sold must not be a side door to the
    // public archive surfaces.
    for (const status of ["pending", "expired", "removed", "draft"]) {
      sessionMock.mockResolvedValueOnce({ kind: "otp", email: "owner@example.com" });
      maybeSingleMock.mockResolvedValueOnce({
        data: { id: 12, contact_email: "owner@example.com", status },
        error: null,
      });
      const res = await POST(request({ listing_id: 12 }));
      expect(res.status, status).toBe(404);
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("retries status-only when the archive columns are missing (pre-migration)", async () => {
    sessionMock.mockResolvedValueOnce({ kind: "otp", email: "owner@example.com" });
    maybeSingleMock.mockResolvedValueOnce({
      data: { id: 12, contact_email: "owner@example.com", status: "active" },
      error: null,
    });
    updateEqMock
      .mockResolvedValueOnce({ error: { message: 'column "sold_at" does not exist' } })
      .mockResolvedValueOnce({ error: null });
    const res = await POST(request({ listing_id: 12, sold_price_cents: 1000 }));
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls[1]?.[0]).toEqual({ status: "sold" });
  });
});
