import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

import { GET, POST } from "@/app/api/versus/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns a thenable chainable builder that resolves to `result` when awaited. */
function makeChain(result: unknown): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit", "insert", "update"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve();
  };
  return b;
}

function getReq(params: { a?: string; b?: string } = {}): NextRequest {
  const url = new URL("http://localhost/api/versus/vote");
  if (params.a) url.searchParams.set("a", params.a);
  if (params.b) url.searchParams.set("b", params.b);
  return new NextRequest(url.toString());
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/versus/vote", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.1",
    },
  });
}

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/versus/vote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when param a is missing", async () => {
    const res = await GET(getReq({ b: "stake" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when param b is missing", async () => {
    const res = await GET(getReq({ a: "commsec" }));
    expect(res.status).toBe(400);
  });

  it("returns vote counts and percentages", async () => {
    const votes = [
      { chosen_slug: "commsec" },
      { chosen_slug: "commsec" },
      { chosen_slug: "stake" },
    ];
    adminFromMock.mockReturnValue(makeChain({ data: votes, error: null }));

    const res = await GET(getReq({ a: "commsec", b: "stake" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.commsec).toBe(2);
    expect(json.stake).toBe(1);
    expect(json.total).toBe(3);
    expect(json.percent_a + json.percent_b).toBeLessThanOrEqual(101); // rounding
  });

  it("returns 50/50 percent when there are no votes", async () => {
    adminFromMock.mockReturnValue(makeChain({ data: [], error: null }));

    const res = await GET(getReq({ a: "commsec", b: "stake" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(0);
    expect(json.percent_a).toBe(50);
    expect(json.percent_b).toBe(50);
  });

  it("returns 500 on DB error", async () => {
    adminFromMock.mockReturnValue(makeChain({ data: null, error: { message: "connection timeout" } }));

    const res = await GET(getReq({ a: "commsec", b: "stake" }));
    expect(res.status).toBe(500);
  });
});

// ── Tests: POST ────────────────────────────────────────────────────────────────

describe("POST /api/versus/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake", chosen_slug: "commsec" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when broker_a_slug is missing", async () => {
    const res = await POST(postReq({ broker_b_slug: "stake", chosen_slug: "stake" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when broker_b_slug is missing", async () => {
    const res = await POST(postReq({ broker_a_slug: "commsec", chosen_slug: "commsec" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when chosen_slug is missing", async () => {
    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when chosen_slug is not one of the pair", async () => {
    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake", chosen_slug: "other" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when IP has already voted on this pair", async () => {
    // First from() call = check existing (returns an existing vote row)
    const checkChain = makeChain({ data: [{ id: "vote-42" }], error: null });
    adminFromMock.mockReturnValueOnce(checkChain);

    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake", chosen_slug: "commsec" }));
    expect(res.status).toBe(409);
  });

  it("returns 500 on insert error", async () => {
    // check existing returns null (no prior vote)
    adminFromMock.mockReturnValueOnce(makeChain({ data: null, error: null }));
    // insert returns an error
    adminFromMock.mockReturnValueOnce(makeChain({ error: { message: "constraint violation" } }));

    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake", chosen_slug: "commsec" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 and {success:true} on a new vote", async () => {
    adminFromMock.mockReturnValueOnce(makeChain({ data: null, error: null })); // no existing
    adminFromMock.mockReturnValueOnce(makeChain({ error: null }));              // insert ok

    const res = await POST(postReq({ broker_a_slug: "commsec", broker_b_slug: "stake", chosen_slug: "stake" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("normalises pair order (b > a) before checking/inserting", async () => {
    const checkChain = makeChain({ data: null, error: null });
    const insertChain = makeChain({ error: null });
    adminFromMock.mockReturnValueOnce(checkChain).mockReturnValueOnce(insertChain);

    // "stake" < "commsec" alphabetically — pair should be normalised to [commsec, stake]
    await POST(postReq({ broker_a_slug: "stake", broker_b_slug: "commsec", chosen_slug: "commsec" }));

    const insertArg = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg?.broker_a_slug).toBe("commsec");
    expect(insertArg?.broker_b_slug).toBe("stake");
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/versus/vote", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
