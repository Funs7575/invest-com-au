import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  setAuthUser,
  getTable,
  seedTable,
} from "./harness";

// Admin allowlist stub so requireAdmin treats our test user as admin.
vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@example.com"],
  getAdminEmail: () => "admin@example.com",
}));

installSupabaseFake();

const saveMod = await import("@/app/api/admin/articles-editor/save/route");
const scorecardMod = await import("@/app/api/admin/article-scorecard/route");
const previewTokenMod = await import(
  "@/app/api/admin/article-preview-tokens/route"
);

function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown },
): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method || "GET",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

// A clean body that will pass every scorecard check including the
// default 600-word minimum. Long, structured, contains the GA warning
// phrase, affiliate disclosure, internal links, no forward-looking
// statements, no marketing cliches.
const CLEAN_BODY = `
## What you will learn

This piece is a practical walkthrough of how Australian investors can
get started with share-trading platforms. It covers what the different
broker types are, what the typical fee structures look like, how
account opening actually works in practice, and the tax implications
you need to think about before your first trade. By the end of it you
should be able to open an account, fund it, place a first trade, and
understand what your ongoing costs will be.

## The regulator and why it matters

The Australian Financial Services Licence (AFSL) regime governs every
broker you can legally sign up to in Australia. Read our guide to
[the AFSL basics](/article/afsl-explained) and the [Stake
review](/broker/stake) for more detail. The AFSL
holder is the entity that owes you obligations under the Corporations
Act. If you are ever in doubt about whether an online platform is
legitimately regulated, check the ASIC Professional Registers for the
AFSL number it claims to hold. This information is general advice only
and does not take into account your personal objectives, financial
situation or needs. Before acting on any information in this article,
consider whether it is appropriate for you.

We may earn a commission from partner brokers when readers open
accounts via our affiliate links. This does not influence our
editorial coverage and we refuse paid placement inside reviews.

## Fees you need to understand

Different brokers charge different brokerage amounts, and the
structure of those fees matters more than the headline number. See
/compare for a side by side comparison. Most Australian brokers now
charge either a flat rate per trade, a percentage of the trade value,
or a tiered structure that rewards higher volumes. For small retail
portfolios the flat rate is usually the cheapest option because the
percentage models add up quickly once you start placing trades in the
$5000 to $10000 range. Foreign exchange fees are a hidden cost
whenever you buy shares on US or international markets, and they
can dwarf the brokerage itself if you are not careful.

## Account opening

Account opening on most Australian platforms now takes about 15
minutes with photo ID, a bank account, and a verified email address.
Expect identity verification via a government document check, a small
test deposit from your nominated funding account, and a compliance
questionnaire about your trading experience. If anything on the
questionnaire feels like it is pressuring you into a particular
answer, step away — the regulator requires brokers to classify you
based on honest answers, not on what gets you the fastest approval.

## Settlement and custody

Once a trade executes, the shares have to move from seller to buyer.
In Australia this is the CHESS system, run by the ASX. A CHESS
sponsored account means the shares are registered directly in your
name via a Holder Identification Number (HIN). A custodial broker
holds the shares in a pool through an intermediary — usually cheaper,
but with a different risk profile. Neither is inherently better, but
you should know which one you have signed up for. The guide at
/article/chess-vs-custodial walks through the differences in depth.

## Getting started from here

The simplest path for most beginners is to pick a low-cost broker,
fund it with a small amount (a few hundred dollars), place a single
trade in a diversified ETF, and watch how the platform behaves over a
few weeks before committing more capital. This is how most long-term
retail investors build their allocations gradually, after they have
confidence the tools work and the statements make sense.

## Record keeping for tax time

Australian investors have to report capital gains and dividend income
at tax time, which means you need to keep records of every buy, every
sell, and every dividend. Most brokers provide an annual statement
that covers the basics, but if you use more than one broker you will
need to consolidate the data yourself. Read /article/capital-gains
for how the CGT discount works on holdings over twelve months. A
simple spreadsheet is usually enough for a small portfolio; more
complex situations (SMSF, multiple brokers, international holdings)
justify specialist accounting software or an accountant.

## A final note on risk

Every investment involves the possibility of losing money. Past
performance is not a reliable indicator of future outcomes and
nothing in this guide should be taken as a recommendation to buy
or sell a specific security.
`.trim();

describe("integration: /api/admin/articles-editor/save", () => {
  beforeEach(() => {
    reset();
    setAuthUser("admin-1", "admin@example.com");
  });

  it("rejects non-admin callers", async () => {
    setAuthUser("u1", "random@example.com");
    const res = await saveMod.POST(
      makeRequest("/api/admin/articles-editor/save", {
        method: "POST",
        body: {
          slug: "test-article",
          title: "Test article title",
          content: CLEAN_BODY,
          status: "draft",
        },
      }),
    );
    expect([401, 403]).toContain(res.status);
  });

  it("rejects a slug that isn't kebab-case", async () => {
    const res = await saveMod.POST(
      makeRequest("/api/admin/articles-editor/save", {
        method: "POST",
        body: {
          slug: "Test Article",
          title: "Test article title",
          content: CLEAN_BODY,
          status: "draft",
        },
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/kebab/i);
  });

  it("saves a draft and persists a scorecard run", async () => {
    const res = await saveMod.POST(
      makeRequest("/api/admin/articles-editor/save", {
        method: "POST",
        body: {
          slug: "practical-shares-guide",
          title: "A practical Australian shares guide for new investors",
          excerpt:
            "Independent guide to share-trading platforms in Australia, covering fees, tax and getting started.",
          content: CLEAN_BODY,
          category: "beginners",
          tags: ["beginners", "shares"],
          status: "draft",
        },
      }),
    );
    expect(res.status).toBe(200);
    const articles = getTable("articles");
    expect(articles).toHaveLength(1);
    expect(articles[0].status).toBe("draft");
    const runs = getTable("article_scorecard_runs");
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs[0].article_slug).toBe("practical-shares-guide");
  });

  it("refuses to publish if the scorecard grade is F", async () => {
    const res = await saveMod.POST(
      makeRequest("/api/admin/articles-editor/save", {
        method: "POST",
        body: {
          slug: "forward-looking-bad",
          title: "WDS will hit $40 by next year",
          excerpt: "short",
          content:
            "## Bad content\n\nWoodside will hit $40 by Q3 2026 and double your money.",
          status: "published",
        },
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/F/);
  });

  it("publishes a clean piece and stamps published_at", async () => {
    const res = await saveMod.POST(
      makeRequest("/api/admin/articles-editor/save", {
        method: "POST",
        body: {
          slug: "clean-piece",
          title: "A clean piece about investing in Australian shares",
          excerpt:
            "Independent educational content about Australian share-trading platforms, covering fees and tax.",
          content: CLEAN_BODY,
          category: "beginners",
          tags: ["beginners", "shares"],
          status: "published",
        },
      }),
    );
    expect(res.status).toBe(200);
    const row = getTable("articles")[0];
    expect(row.status).toBe("published");
    expect(row.published_at).toBeTruthy();
  });
});

describe("integration: /api/admin/article-scorecard", () => {
  beforeEach(() => {
    reset();
    setAuthUser("admin-1", "admin@example.com");
  });

  it("POST returns a scorecard for a draft", async () => {
    const res = await scorecardMod.POST(
      makeRequest("/api/admin/article-scorecard", {
        method: "POST",
        body: {
          slug: "probe",
          title: "A probe article about Australian investing",
          body: CLEAN_BODY,
          tags: ["shares", "beginners"],
          category: "beginners",
          min_words: 10,
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      score: number;
      grade: string;
      passed_checks: string[];
    };
    expect(json.score).toBeGreaterThan(50);
    expect(["A", "B", "C"]).toContain(json.grade);
  });

  it("POST with persist=true writes to article_scorecard_runs", async () => {
    await scorecardMod.POST(
      makeRequest("/api/admin/article-scorecard", {
        method: "POST",
        body: {
          slug: "persist-probe",
          title: "Persist test title long enough",
          body: CLEAN_BODY,
          min_words: 10,
          persist: true,
        },
      }),
    );
    const runs = getTable("article_scorecard_runs");
    expect(runs.length).toBe(1);
    expect(runs[0].article_slug).toBe("persist-probe");
  });

  it("POST without persist does not touch the audit table", async () => {
    await scorecardMod.POST(
      makeRequest("/api/admin/article-scorecard", {
        method: "POST",
        body: {
          slug: "probe-no-persist",
          title: "Non-persist probe",
          body: CLEAN_BODY,
          min_words: 10,
        },
      }),
    );
    expect(getTable("article_scorecard_runs")).toHaveLength(0);
  });
});

describe("integration: /api/admin/article-preview-tokens", () => {
  beforeEach(() => {
    reset();
    setAuthUser("admin-1", "admin@example.com");
  });

  it("POST creates a token row", async () => {
    const res = await previewTokenMod.POST(
      makeRequest("/api/admin/article-preview-tokens", {
        method: "POST",
        body: { slug: "my-article", ttl_hours: 24, note: "review please" },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { token: string };
    expect(json.token).toBeTruthy();
    expect(json.token.length).toBeGreaterThan(16);
    const rows = getTable("article_preview_tokens");
    expect(rows).toHaveLength(1);
    expect(rows[0].article_slug).toBe("my-article");
  });

  it("GET lists tokens for a slug", async () => {
    seedTable("article_preview_tokens", [
      {
        token: "tkn-abc-123",
        article_slug: "my-article",
        created_by: "admin@example.com",
        note: null,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        opened_count: 0,
        last_opened_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await previewTokenMod.GET(
      makeRequest("/api/admin/article-preview-tokens?slug=my-article"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: unknown[] };
    expect(json.items).toHaveLength(1);
  });

  it("DELETE revokes a token", async () => {
    seedTable("article_preview_tokens", [
      {
        token: "tkn-xyz-999",
        article_slug: "my-article",
        created_by: "admin@example.com",
        note: null,
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
        opened_count: 0,
        last_opened_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    const firstId = getTable("article_preview_tokens")[0].id;
    const res = await previewTokenMod.DELETE(
      makeRequest("/api/admin/article-preview-tokens", {
        method: "DELETE",
        body: { id: firstId },
      }),
    );
    expect(res.status).toBe(200);
    expect(getTable("article_preview_tokens")[0].revoked_at).toBeTruthy();
  });
});
