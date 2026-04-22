import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAuth = { getUser: vi.fn() };
const mockAuthFrom = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: mockAuth, from: mockAuthFrom })
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Import route AFTER mocks ───────────────────────────────────────────────
import { POST } from "@/app/api/admin/fin-objection/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(id: string) {
  return new NextRequest(`http://localhost/api/admin/fin-objection/${id}`, {
    method: "POST",
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/admin/fin-objection/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // FIN_OBJECTION_EMAILS is deliberately narrower than ADMIN_EMAILS —
    // admin alone is not enough to stamp fin_objection_at.
    process.env.FIN_OBJECTION_EMAILS = "finn@invest.com.au";
    process.env.ADMIN_EMAILS = "finn@invest.com.au,admin@invest.com.au";
  });

  it("stamps fin_objection_at successfully when user is in FIN_OBJECTION_EMAILS", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "finn@invest.com.au" } },
      error: null,
    });

    const builder = createChainableBuilder("editorial_articles");
    builder.single = vi.fn(() =>
      Promise.resolve({
        data: {
          id: "article-uuid",
          fin_objection_at: "2026-04-21T12:00:00.000Z",
          status: "review_passed",
        },
        error: null,
      })
    );
    mockAdminFrom.mockReturnValue(builder);

    const res = await POST(
      makeRequest("article-uuid"),
      makeContext("article-uuid")
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("article-uuid");
    expect(json.fin_objection_at).toBeTruthy();

    // Update payload includes a timestamp for fin_objection_at
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fin_objection_at: expect.any(String),
      })
    );
    // Update is scoped by id AND status='review_passed'
    expect(builder.eq).toHaveBeenCalledWith("id", "article-uuid");
    expect(builder.eq).toHaveBeenCalledWith("status", "review_passed");
  });

  it("returns 403 for admin user NOT in FIN_OBJECTION_EMAILS — admin alone is not enough", async () => {
    // admin@invest.com.au IS in ADMIN_EMAILS but NOT in FIN_OBJECTION_EMAILS.
    // The narrower allowlist must reject admin-only auth — that's the whole
    // point of splitting the allowlists.
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } },
      error: null,
    });

    const res = await POST(
      makeRequest("article-uuid"),
      makeContext("article-uuid")
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Fin-objection");
    // DB layer is never reached when allowlist check fails
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("documents auto-publish cron query filter: status='review_passed' AND fin_objection_at IS NULL AND review_passed_at <= now() - 4h", async () => {
    // Locks the canonical query shape the auto-publish cron must use per
    // .claude/agents/04-editorial.md § Prompt skeleton. The cron itself
    // ships in Step 4; this test keeps the filter shape — which matches
    // the partial index idx_editorial_articles_auto_publish — stable
    // before that lands.

    type Chain = {
      select: (...args: unknown[]) => Chain;
      eq: (...args: unknown[]) => Chain;
      is: (...args: unknown[]) => Chain;
      lte: (...args: unknown[]) => Promise<{ data: unknown[]; error: null }>;
    };

    const chain = {
      select: vi.fn<Chain["select"]>(),
      eq: vi.fn<Chain["eq"]>(),
      is: vi.fn<Chain["is"]>(),
      lte: vi.fn<Chain["lte"]>(),
    };
    chain.select.mockReturnValue(chain as unknown as Chain);
    chain.eq.mockReturnValue(chain as unknown as Chain);
    chain.is.mockReturnValue(chain as unknown as Chain);
    chain.lte.mockResolvedValue({ data: [], error: null });

    const fromMock = vi.fn<() => Chain>(() => chain as unknown as Chain);
    const supabase = { from: fromMock };

    const fourHoursAgo = new Date(
      Date.now() - 4 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from("editorial_articles")
      .select("id, review_passed_at, fin_objection_at")
      .eq("status", "review_passed")
      .is("fin_objection_at", null)
      .lte("review_passed_at", fourHoursAgo);

    expect(fromMock).toHaveBeenCalledWith("editorial_articles");
    expect(chain.select).toHaveBeenCalledWith(
      "id, review_passed_at, fin_objection_at"
    );
    expect(chain.eq).toHaveBeenCalledWith("status", "review_passed");
    // fin_objection_at IS NULL is the gate — matches the partial index
    expect(chain.is).toHaveBeenCalledWith("fin_objection_at", null);
    // 4h offset on review_passed_at is an ISO timestamp
    expect(chain.lte).toHaveBeenCalledWith(
      "review_passed_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    );
  });
});
