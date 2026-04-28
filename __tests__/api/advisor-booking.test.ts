import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

const serverFromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: serverFromMock })),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { GET, POST } from "@/app/api/advisor-booking/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "order", "insert"]) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

function getReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/advisor-booking");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-booking", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "2.2.2.2" },
  });
}

const ACTIVE_ADVISOR = { id: "adv-1", name: "Bob", email: "bob@firm.com", booking_enabled: true, booking_link: null, booking_intro: null };

const VALID_POST = {
  advisorSlug: "bob-sydney",
  investorName: "Alice",
  investorEmail: "alice@example.com",
  bookingDate: "2026-05-10",
  bookingTime: "10:00",
  topic: "Superannuation",
};

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/advisor-booking", () => {
  beforeEach(() => { vi.clearAllMocks(); fetchMock.mockResolvedValue(new Response("{}", { status: 200 })); });

  it("returns 400 when advisor slug is missing", async () => {
    expect((await GET(getReq())).status).toBe(400);
  });

  it("returns 404 when advisor is not found", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: null }));
    expect((await GET(getReq({ advisor: "unknown-slug" }))).status).toBe(404);
  });

  it("returns 200 with bookingEnabled=false when advisor has not enabled booking", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: { ...ACTIVE_ADVISOR, booking_enabled: false } }));
    const res = await GET(getReq({ advisor: "bob-sydney" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookingEnabled).toBe(false);
    expect(json.slots).toEqual([]);
  });

  it("returns 200 with schedule and no existingBookings when no date param", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: [{ id: 1, day_of_week: 1, start_time: "09:00" }] }));
    const res = await GET(getReq({ advisor: "bob-sydney" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookingEnabled).toBe(true);
    expect(json.schedule).toHaveLength(1);
    expect(json.existingBookings).toEqual([]);
  });

  it("returns existingBookings when date param is provided", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: [] })); // schedule
    serverFromMock.mockReturnValueOnce(chain({ data: [{ booking_time: "10:00" }, { booking_time: "14:00" }] }));
    const res = await GET(getReq({ advisor: "bob-sydney", date: "2026-05-10" }));
    expect(res.status).toBe(200);
    expect((await res.json()).existingBookings).toEqual(["10:00", "14:00"]);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/advisor-booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRateLimitedMock.mockResolvedValue(false);
    delete process.env.RESEND_API_KEY;
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  it("returns 429 when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    expect((await POST(postReq(VALID_POST))).status).toBe(429);
  });

  it("returns 400 when advisorSlug is missing", async () => {
    expect((await POST(postReq({ ...VALID_POST, advisorSlug: undefined }))).status).toBe(400);
  });

  it("returns 400 when investorName is missing", async () => {
    expect((await POST(postReq({ ...VALID_POST, investorName: undefined }))).status).toBe(400);
  });

  it("returns 400 when bookingDate is missing", async () => {
    expect((await POST(postReq({ ...VALID_POST, bookingDate: undefined }))).status).toBe(400);
  });

  it("returns 400 when advisor not found", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: null }));
    expect((await POST(postReq(VALID_POST))).status).toBe(400);
  });

  it("returns 400 when advisor has booking disabled", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: { ...ACTIVE_ADVISOR, booking_enabled: false } }));
    expect((await POST(postReq(VALID_POST))).status).toBe(400);
  });

  it("returns 409 when slot is already taken", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: { id: 99 } })); // slot taken
    expect((await POST(postReq(VALID_POST))).status).toBe(409);
  });

  it("returns 500 when booking insert fails", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: null })); // slot free
    serverFromMock.mockReturnValueOnce(chain({ data: null, error: { message: "db error" } })); // insert fails
    expect((await POST(postReq(VALID_POST))).status).toBe(500);
  });

  it("returns 200 on success without RESEND_API_KEY", async () => {
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: null })); // slot free
    serverFromMock.mockReturnValueOnce(chain({ data: { id: 42 }, error: null })); // booking
    serverFromMock.mockReturnValueOnce(chain({ error: null })); // lead insert
    const res = await POST(postReq(VALID_POST));
    expect(res.status).toBe(200);
    expect((await res.json()).bookingId).toBe(42);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 200 with RESEND_API_KEY and fires two confirmation emails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    serverFromMock.mockReturnValueOnce(chain({ data: ACTIVE_ADVISOR }));
    serverFromMock.mockReturnValueOnce(chain({ data: null }));
    serverFromMock.mockReturnValueOnce(chain({ data: { id: 42 }, error: null }));
    serverFromMock.mockReturnValueOnce(chain({ error: null }));
    const res = await POST(postReq(VALID_POST));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2); // advisor + investor
  });
});
