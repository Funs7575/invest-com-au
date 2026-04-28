import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockConfirmSubscription = vi.fn();
const mockUnsubscribeByToken = vi.fn();

vi.mock("@/lib/newsletter", () => ({
  confirmSubscription: (...args: unknown[]) => mockConfirmSubscription(...args),
  unsubscribeByToken: (...args: unknown[]) => mockUnsubscribeByToken(...args),
}));

import { GET, POST } from "@/app/api/newsletter-segments/confirm/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(token?: string): NextRequest {
  const url = new URL("http://localhost/api/newsletter-segments/confirm");
  if (token !== undefined) url.searchParams.set("token", token);
  return new NextRequest(url, { headers: { "x-forwarded-for": "1.2.3.4" } });
}

function makePost(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/newsletter-segments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/newsletter-segments/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet("token123"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when token is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing token/i);
  });

  it("returns 400 when confirmSubscription returns error", async () => {
    mockConfirmSubscription.mockResolvedValue({ ok: false, error: "Token expired" });
    const res = await GET(makeGet("bad-token"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("returns 200 with email when confirm succeeds", async () => {
    mockConfirmSubscription.mockResolvedValue({ ok: true, email: "user@example.com" });
    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.email).toBe("user@example.com");
    expect(mockConfirmSubscription).toHaveBeenCalledWith("valid-token");
  });
});

describe("POST /api/newsletter-segments/confirm (unsubscribe)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ action: "unsubscribe", token: "tok" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when action is wrong", async () => {
    const res = await POST(makePost({ action: "confirm", token: "tok" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is missing", async () => {
    const res = await POST(makePost({ action: "unsubscribe" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when unsubscribeByToken returns error", async () => {
    mockUnsubscribeByToken.mockResolvedValue({ ok: false, error: "Not found" });
    const res = await POST(makePost({ action: "unsubscribe", token: "tok" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with email when unsubscribe succeeds", async () => {
    mockUnsubscribeByToken.mockResolvedValue({ ok: true, email: "user@example.com" });
    const res = await POST(makePost({ action: "unsubscribe", token: "valid" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.email).toBe("user@example.com");
  });
});
