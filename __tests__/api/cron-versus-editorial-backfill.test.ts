import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockGeneratePairs = vi.fn(() => []);
vi.mock("@/lib/versus-pairs", () => ({ generateVersusPairs: (...args: unknown[]) => mockGeneratePairs(...args) }));

const mockMessagesCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: (...args: unknown[]) => mockMessagesCreate(...args) };
  },
}));

import { GET } from "@/app/api/cron/versus-editorial-backfill/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "not"]) { c[m] = vi.fn(() => c); }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq(search = "") {
  return new NextRequest(`http://localhost/api/cron/versus-editorial-backfill${search}`, { method: "GET" });
}

const validEditorial = {
  title: "ABC vs XYZ: Side-by-Side Comparison",
  meta_description: "Compare ABC and XYZ on fees, features and suitability for Australian investors.",
  intro: "ABC is cheaper for frequent traders. XYZ suits long-term investors with its CHESS sponsorship.",
  choose_a: "Choose ABC if you trade frequently and want low brokerage.",
  choose_b: "Choose XYZ if you want CHESS sponsorship and SMSF support.",
  sections: [
    { heading: "Fees head-to-head", body: "ABC charges $9.50/trade vs XYZ at $14.95." },
    { heading: "Platform & features", body: "Both offer ASX and US markets." },
    { heading: "Who should pick which", body: "ABC suits active traders; XYZ suits buy-and-hold." },
  ],
  verdict: "For cost-conscious investors ABC wins on fees. XYZ edges ahead on safety features.",
  faqs: [
    { question: "Is ABC safe?", answer: "ABC is regulated by ASIC. This is general information, not personal financial advice." },
    { question: "Which is better for SMSFs?", answer: "XYZ offers dedicated SMSF support; ABC does not." },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockGeneratePairs.mockReturnValue([]);
  delete process.env.ANTHROPIC_API_KEY;
});

describe("GET /api/cron/versus-editorial-backfill", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 503 when ANTHROPIC_API_KEY missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns 500 when broker fetch errors", async () => {
    process.env.ANTHROPIC_API_KEY = "sk_test";
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns generated:0 when all pairs already have editorial", async () => {
    process.env.ANTHROPIC_API_KEY = "sk_test";
    mockGeneratePairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [{ slug: "abc", name: "ABC", platform_type: "share_broker" }], error: null }); // brokers
        return makeChain({ data: [{ slug: "abc-vs-xyz" }], error: null }); // existing editorials
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.generated).toBe(0);
    expect(body.reason).toContain("all pairs");
  });

  it("generates and inserts editorial for missing pair", async () => {
    process.env.ANTHROPIC_API_KEY = "sk_test";
    mockGeneratePairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validEditorial) }],
    });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [
          { id: 1, slug: "abc", name: "ABC", rating: 4, platform_type: "share_broker", asx_fee: "$9.50", asx_fee_value: 9.5, us_fee: "$9.50", us_fee_value: 9.5, fx_rate: 0.5, chess_sponsored: false, smsf_support: false, min_deposit: null, markets: ["ASX"], tagline: "Fast trading" },
          { id: 2, slug: "xyz", name: "XYZ", rating: 4, platform_type: "share_broker", asx_fee: "$14.95", asx_fee_value: 14.95, us_fee: "$14.95", us_fee_value: 14.95, fx_rate: 0.5, chess_sponsored: true, smsf_support: true, min_deposit: null, markets: ["ASX"], tagline: "Long-term" },
        ], error: null }); // brokers
        if (call === 2) return makeChain({ data: [], error: null }); // existing (empty → need to generate)
        return makeChain({ data: null, error: null }); // insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.generated).toBe(1);
    expect(body.failed).toBe(0);
  });

  it("counts failed when AI generation throws", async () => {
    process.env.ANTHROPIC_API_KEY = "sk_test";
    mockGeneratePairs.mockReturnValue([{ slug: "abc-vs-xyz" }]);
    mockMessagesCreate.mockRejectedValue(new Error("rate limited"));
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [
          { id: 1, slug: "abc", name: "ABC", rating: 4, platform_type: "share_broker", asx_fee: null, asx_fee_value: null, us_fee: null, us_fee_value: null, fx_rate: null, chess_sponsored: null, smsf_support: null, min_deposit: null, markets: null, tagline: null },
          { id: 2, slug: "xyz", name: "XYZ", rating: 4, platform_type: "share_broker", asx_fee: null, asx_fee_value: null, us_fee: null, us_fee_value: null, fx_rate: null, chess_sponsored: null, smsf_support: null, min_deposit: null, markets: null, tagline: null },
        ], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.generated).toBe(0);
  });
});
