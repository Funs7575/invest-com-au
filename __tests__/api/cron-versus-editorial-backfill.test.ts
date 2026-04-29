import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockGenerateVersusPairs = vi.fn();
vi.mock("@/lib/versus-pairs", () => ({
  generateVersusPairs: (...args: unknown[]) => mockGenerateVersusPairs(...args),
}));

const mockMessagesCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockMessagesCreate(...args) },
  })),
}));

import { GET } from "@/app/api/cron/versus-editorial-backfill/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import AnthropicSDK from "@anthropic-ai/sdk";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const MockAnthropic = vi.mocked(AnthropicSDK);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "not", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/versus-editorial-backfill", { method: "GET" });
}

const brokerA = { id: 1, slug: "abc", name: "ABC Broker", rating: 4.5, platform_type: "broker", asx_fee: "$9.50", asx_fee_value: 9.5, us_fee: null, us_fee_value: null, fx_rate: null, chess_sponsored: true, smsf_support: null, min_deposit: null, markets: ["ASX"], tagline: "Low fees" };
const brokerB = { id: 2, slug: "xyz", name: "XYZ Broker", rating: 4.2, platform_type: "broker", asx_fee: "$14.95", asx_fee_value: 14.95, us_fee: null, us_fee_value: null, fx_rate: null, chess_sponsored: false, smsf_support: null, min_deposit: null, markets: ["ASX"], tagline: null };

const mockEditorial = {
  title: "ABC vs XYZ: Side-by-Side Comparison",
  meta_description: "Comparing ABC Broker and XYZ Broker for Australian investors seeking low fees.",
  intro: "ABC and XYZ are both ASX brokers. ABC charges lower fees while XYZ offers wider market access.",
  choose_a: "Choose ABC if you want the lowest ASX brokerage fees.",
  choose_b: "Choose XYZ if you want a broader range of markets.",
  sections: [
    { heading: "Fees head-to-head", body: "ABC charges $9.50 per trade. XYZ charges $14.95 per trade." },
    { heading: "Platform & features", body: "ABC is mobile-first. XYZ offers a full desktop platform." },
  ],
  verdict: "Both are solid ASX brokers. ABC wins on fees; XYZ suits heavier traders.",
  faqs: [
    { question: "Which broker is cheaper for ASX trades?", answer: "ABC at $9.50 is cheaper than XYZ at $14.95." },
    { question: "Is this financial advice?", answer: "This is general information, not personal financial advice." },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  delete process.env.ANTHROPIC_API_KEY;
  mockGenerateVersusPairs.mockReturnValue([]);
  // Re-setup Anthropic constructor mock after vi.resetAllMocks() clears it
  MockAnthropic.mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockMessagesCreate(...args) },
  }) as never);
});

describe("GET /api/cron/versus-editorial-backfill", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    const res = await GET(makeReq());
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 500 when broker fetch fails", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })),
    } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns generated:0 when all pairs already have editorial", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    mockGenerateVersusPairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [brokerA, brokerB], error: null });
        return makeChain({ data: [{ slug: "abc-vs-xyz" }], error: null }); // already exists
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.generated).toBe(0);
    expect(body.reason).toBe("all pairs have editorial");
  });

  it("generates editorial and inserts for missing pair", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    mockGenerateVersusPairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockEditorial) }],
    });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [brokerA, brokerB], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // no existing
        return makeChain({ data: null, error: null }); // insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.generated).toBe(1);
    expect(body.failed).toBe(0);
    expect(mockMessagesCreate).toHaveBeenCalledOnce();
  });

  it("increments failed when AI generation throws", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    mockGenerateVersusPairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    mockMessagesCreate.mockRejectedValue(new Error("API overloaded"));
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [brokerA, brokerB], error: null });
        return makeChain({ data: [], error: null }); // no existing
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.generated).toBe(0);
    expect(body.failed).toBe(1);
  });

  it("skips pair when broker slug not found in bySlug map", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    // Pair references "unknown-vs-abc" but only "abc" is in brokers
    mockGenerateVersusPairs.mockReturnValue([{ slug: "unknown-vs-abc" }]);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockEditorial) }],
    });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [brokerA], error: null }); // only one broker
        return makeChain({ data: [], error: null }); // no existing
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.generated).toBe(0); // skipped because "unknown" not in map
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
