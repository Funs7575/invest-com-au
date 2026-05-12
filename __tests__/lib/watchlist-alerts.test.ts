import { describe, it, expect } from "vitest";
import {
  collectChangesForUser,
  isWatchableType,
  renderWatchlistDigestHtml,
  type ArticleSnapshot,
  type BrokerSnapshot,
  type WatchlistItemRow,
} from "@/lib/watchlist-alerts";

const NOW = new Date("2026-05-12T09:00:00Z");
const WINDOW_START = new Date(NOW.getTime() - 7 * 86400_000);
const BEFORE_WINDOW = new Date(WINDOW_START.getTime() - 86400_000).toISOString();
const AFTER_WINDOW = new Date(WINDOW_START.getTime() + 86400_000).toISOString();

function watchedBroker(slug: string, name = slug): WatchlistItemRow {
  return { id: 1, item_type: "broker", item_slug: slug, display_name: name };
}

function brokerSnap(slug: string, updated_at: string): BrokerSnapshot {
  return { slug, name: slug.toUpperCase(), updated_at };
}

function articleSnap(opts: Partial<ArticleSnapshot> & { slug: string; related_brokers: string[] }): ArticleSnapshot {
  return {
    title: "Article title",
    excerpt: "Article excerpt",
    published_at: AFTER_WINDOW,
    ...opts,
  };
}

describe("isWatchableType", () => {
  it("recognises known types", () => {
    expect(isWatchableType("broker")).toBe(true);
    expect(isWatchableType("etf")).toBe(true);
    expect(isWatchableType("stock")).toBe(true);
    expect(isWatchableType("fund")).toBe(true);
    expect(isWatchableType("crypto")).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(isWatchableType("bond")).toBe(false);
    expect(isWatchableType("")).toBe(false);
  });
});

describe("collectChangesForUser", () => {
  it("returns an empty list when nothing changed in the window", () => {
    const changes = collectChangesForUser({
      items: [watchedBroker("commsec")],
      windowStart: WINDOW_START,
      brokers: [brokerSnap("commsec", BEFORE_WINDOW)],
      articles: [],
    });
    expect(changes).toEqual([]);
  });

  it("emits a broker_update when the broker row updated inside the window", () => {
    const changes = collectChangesForUser({
      items: [watchedBroker("commsec", "CommSec")],
      windowStart: WINDOW_START,
      brokers: [brokerSnap("commsec", AFTER_WINDOW)],
      articles: [],
    });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      kind: "broker_update",
      item_slug: "commsec",
      display_name: "CommSec",
      href: "/brokers/commsec",
    });
  });

  it("emits a related_article when an article tags a watched broker", () => {
    const changes = collectChangesForUser({
      items: [watchedBroker("stake")],
      windowStart: WINDOW_START,
      brokers: [],
      articles: [
        articleSnap({
          slug: "stake-fees-2026",
          title: "Stake cuts US fees",
          excerpt: "From May 2026 Stake is dropping US trade fees…",
          related_brokers: ["stake"],
        }),
      ],
    });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      kind: "related_article",
      headline: "New: Stake cuts US fees",
      href: "/articles/stake-fees-2026",
    });
  });

  it("ignores articles tagged with brokers the user isn't watching", () => {
    const changes = collectChangesForUser({
      items: [watchedBroker("stake")],
      windowStart: WINDOW_START,
      brokers: [],
      articles: [
        articleSnap({
          slug: "commsec-news",
          title: "CommSec news",
          related_brokers: ["commsec"],
        }),
      ],
    });
    expect(changes).toEqual([]);
  });

  it("ignores articles published before the window starts", () => {
    const changes = collectChangesForUser({
      items: [watchedBroker("stake")],
      windowStart: WINDOW_START,
      brokers: [],
      articles: [
        articleSnap({
          slug: "old-article",
          title: "Old news",
          related_brokers: ["stake"],
          published_at: BEFORE_WINDOW,
        }),
      ],
    });
    expect(changes).toEqual([]);
  });

  it("skips items with unknown types defensively", () => {
    const changes = collectChangesForUser({
      items: [{ id: 1, item_type: "bond", item_slug: "x", display_name: null }],
      windowStart: WINDOW_START,
      brokers: [],
      articles: [],
    });
    expect(changes).toEqual([]);
  });

  it("sorts changes newest-first", () => {
    const oldArticle = articleSnap({
      slug: "first",
      title: "First",
      related_brokers: ["commsec"],
      published_at: new Date(WINDOW_START.getTime() + 86400_000).toISOString(),
    });
    const newArticle = articleSnap({
      slug: "second",
      title: "Second",
      related_brokers: ["commsec"],
      published_at: new Date(WINDOW_START.getTime() + 2 * 86400_000).toISOString(),
    });
    const changes = collectChangesForUser({
      items: [watchedBroker("commsec")],
      windowStart: WINDOW_START,
      brokers: [],
      articles: [oldArticle, newArticle],
    });
    expect(changes.map((c) => c.headline)).toEqual(["New: Second", "New: First"]);
  });
});

describe("renderWatchlistDigestHtml", () => {
  it("returns null for empty change lists", () => {
    expect(
      renderWatchlistDigestHtml({
        changes: [],
        recipientName: "Alex",
        now: NOW,
        unsubscribeHref: "/account/watchlist",
        manageHref: "/account/watchlist",
      }),
    ).toBeNull();
  });

  it("renders one block per change with HTML-escaped content", () => {
    const html = renderWatchlistDigestHtml({
      changes: [
        {
          kind: "broker_update",
          item_slug: "commsec",
          item_type: "broker",
          display_name: "CommSec",
          headline: "CommSec & friends",
          body: "Fees changed — '<script>' won't run here",
          href: "/brokers/commsec",
          occurred_at: AFTER_WINDOW,
        },
      ],
      recipientName: "Alex",
      now: NOW,
      unsubscribeHref: "/account/watchlist",
      manageHref: "/account/watchlist",
    });
    expect(html).toContain("Hi Alex");
    expect(html).toContain("CommSec &amp; friends");
    expect(html).not.toContain("<script>");
    expect(html).toContain("/brokers/commsec");
  });

  it("falls back to 'Hi there' when recipient name is null", () => {
    const html = renderWatchlistDigestHtml({
      changes: [
        {
          kind: "broker_update",
          item_slug: "x",
          item_type: "broker",
          display_name: "X",
          headline: "h",
          body: "b",
          href: "/brokers/x",
          occurred_at: AFTER_WINDOW,
        },
      ],
      recipientName: null,
      now: NOW,
      unsubscribeHref: "/account/watchlist",
      manageHref: "/account/watchlist",
    });
    expect(html).toContain("Hi there");
  });
});
