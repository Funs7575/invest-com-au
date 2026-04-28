import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/shortlist/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeGet(code?: string): NextRequest {
  const url = code
    ? `http://localhost/api/shortlist?code=${code}`
    : "http://localhost/api/shortlist";
  return new NextRequest(url, { method: "GET" });
}

/**
 * Chain for POST: insert().select().single() → resolves to singleResult.
 */
function makeInsertChain(singleResult: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(singleResult));
  return c;
}

/**
 * Chain for GET: select().eq().gt().single() → resolves to singleResult.
 * Also supports the fire-and-forget update().eq().then() path.
 */
function makeSelectChain(singleResult: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "gt"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(singleResult));
  // .then() used by the fire-and-forget update (not awaited)
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({});
    return Promise.resolve({});
  });
  return c;
}

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/shortlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "Too many requests" });
  });

  it("passes IP-keyed rate limit args (10 per 60 min)", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    await POST(makePost({ slugs: ["aaa"] }, "10.0.0.9"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("shortlist:10.0.0.9", 10, 60);
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/shortlist", {
      method: "POST",
      body: "bad-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid request body." });
  });

  it("returns 400 when slugs array is empty", async () => {
    const res = await POST(makePost({ slugs: [] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("1-8 broker") });
  });

  it("returns 400 when slugs array has more than 8 items", async () => {
    const res = await POST(makePost({ slugs: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when all slugs fail the alphanumeric pattern check", async () => {
    const res = await POST(makePost({ slugs: ["UPPER_CASE", "has spaces", "has@chars"] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid broker slugs." });
  });

  it("returns 500 on non-collision DB insert error", async () => {
    mockFrom.mockReturnValue(
      makeInsertChain({ data: null, error: { code: "OTHER", message: "DB error" } })
    );
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to create share link." });
  });

  it("retries on code collision (23505) and succeeds on second attempt", async () => {
    const collisionChain = makeInsertChain({ data: null, error: { code: "23505", message: "dup" } });
    const retryChain = makeInsertChain({ data: { code: "RETRY456" }, error: null });
    mockFrom.mockReturnValueOnce(collisionChain).mockReturnValueOnce(retryChain);
    const res = await POST(makePost({ slugs: ["stake"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("RETRY456");
    expect(body.url).toBe("/shortlist?code=RETRY456");
  });

  it("returns 500 when collision retry also fails", async () => {
    const collision = makeInsertChain({ data: null, error: { code: "23505", message: "dup" } });
    const alsoCollision = makeInsertChain({ data: null, error: { code: "23505", message: "dup" } });
    mockFrom.mockReturnValueOnce(collision).mockReturnValueOnce(alsoCollision);
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to generate share link. Try again." });
  });

  it("returns 200 { code, url } on success", async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: { code: "ABCD1234" }, error: null }));
    const res = await POST(makePost({ slugs: ["commsec", "stake"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("ABCD1234");
    expect(body.url).toBe("/shortlist?code=ABCD1234");
  });

  it("filters out invalid slug patterns while keeping valid ones", async () => {
    const chain = makeInsertChain({ data: { code: "FILTERED1" }, error: null });
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ slugs: ["valid-slug", "INVALID", "also-valid-2"] }));
    // Only valid slugs (lowercase alphanumeric + hyphens) should be passed
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        broker_slugs: expect.arrayContaining(["valid-slug", "also-valid-2"]),
      })
    );
    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect((insertArg.broker_slugs as string[]).includes("INVALID")).toBe(false);
  });
});

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/shortlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when code query param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid or missing share code." });
  });

  it("returns 400 when code is shorter than 4 characters", async () => {
    const res = await GET(makeGet("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is longer than 16 characters", async () => {
    const res = await GET(makeGet("A".repeat(17)));
    expect(res.status).toBe(400);
  });

  it("returns 404 when share link is not found or expired", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({ data: null, error: { message: "No rows returned" } })
    );
    const res = await GET(makeGet("ABCD1234"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Share link not found or expired." });
  });

  it("returns 200 with shortlist data including incremented view_count", async () => {
    const record = {
      code: "ABCD1234",
      broker_slugs: ["commsec", "stake"],
      created_at: "2026-04-27T00:00:00Z",
      view_count: 5,
    };
    mockFrom.mockReturnValue(makeSelectChain({ data: record, error: null }));
    const res = await GET(makeGet("ABCD1234"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("ABCD1234");
    expect(body.slugs).toEqual(["commsec", "stake"]);
    expect(body.view_count).toBe(6); // view_count + 1
    expect(body.created_at).toBe("2026-04-27T00:00:00Z");
  });
});
