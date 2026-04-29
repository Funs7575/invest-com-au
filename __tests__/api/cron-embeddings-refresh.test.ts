import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockIsFeatureDisabled = vi.fn(async () => false);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

const mockEmbedBatch = vi.fn(async (texts: string[]) =>
  texts.map((_, i) => ({ vector: [i * 0.1], model: "stub" })),
);
const mockSelectProvider = vi.fn(() => "stub");
vi.mock("@/lib/embeddings", () => ({
  embedBatch: (...args: unknown[]) => mockEmbedBatch(...args),
  selectEmbeddingProvider: () => mockSelectProvider(),
}));

import { GET } from "@/app/api/cron/embeddings-refresh/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "eq", "in", "not", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/embeddings-refresh", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockIsFeatureDisabled.mockResolvedValue(false);
  mockSelectProvider.mockReturnValue("stub");
});

describe("GET /api/cron/embeddings-refresh", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns skipped when kill switch on", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
  });

  it("returns zero counts when all sources return empty", async () => {
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: [], error: null })),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.articles).toBe(0);
    expect(body.brokers).toBe(0);
    expect(body.advisors).toBe(0);
    expect(mockEmbedBatch).not.toHaveBeenCalled();
  });

  it("skips embeddings when all existing embeddings are up to date", async () => {
    const updated = new Date(Date.now() - 1000).toISOString();
    const article = { id: 1, slug: "a", title: "A", excerpt: "ex", updated_at: updated };
    // Table order: articles, search_embeddings (articles), brokers, search_embeddings (brokers), professionals, search_embeddings (advisors)
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [article], error: null }); // articles
        if (call === 2) return makeChain({ data: [{ document_id: "a", source_updated_at: updated }], error: null }); // existing embeddings
        if (call === 3) return makeChain({ data: [], error: null }); // brokers
        if (call === 4) return makeChain({ data: [], error: null }); // professionals
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.articles).toBe(0); // not dirty — same updated_at
    expect(mockEmbedBatch).not.toHaveBeenCalled();
  });

  it("embeds and upserts dirty articles", async () => {
    const older = new Date(Date.now() - 10000).toISOString();
    const newer = new Date(Date.now() - 1000).toISOString();
    const article = { id: 1, slug: "a", title: "Article A", excerpt: "excerpt", updated_at: newer };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [article], error: null }); // articles
        if (call === 2) return makeChain({ data: [{ document_id: "a", source_updated_at: older }], error: null }); // existing (older)
        if (call === 3) return makeChain({ data: null, error: null }); // upsert
        if (call === 4) return makeChain({ data: [], error: null }); // brokers
        if (call === 5) return makeChain({ data: [], error: null }); // professionals
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.articles).toBe(1);
    expect(mockEmbedBatch).toHaveBeenCalledOnce();
  });

  it("counts failed when upsert errors", async () => {
    const newer = new Date().toISOString();
    const article = { id: 1, slug: "a", title: "A", excerpt: "", updated_at: newer };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [article], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // no existing
        if (call === 3) return makeChain({ data: null, error: { message: "upsert failed" } }); // upsert error
        if (call === 4) return makeChain({ data: [], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.articles).toBe(0); // upsert failed → returns 0
  });
});
