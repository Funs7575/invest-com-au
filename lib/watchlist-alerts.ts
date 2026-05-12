/**
 * Watchlist alert helpers (W2.13 / WW-02).
 *
 * The weekly cron at /api/cron/watchlist-alerts uses these pure functions to:
 *   1. Resolve which watched entities have changed since the last digest.
 *   2. Render the digest email HTML.
 *
 * Compliance: this is comparison + factual surfacing only ("a broker you're
 * watching updated its fees last week"). Never personalised advice. See
 * lib/compliance.ts for the disclaimer copy referenced in the footer.
 */

import { escapeHtml } from "@/lib/html-escape";

export type WatchableType = "stock" | "etf" | "broker" | "fund" | "crypto";

export interface WatchlistItemRow {
  id: number;
  item_type: string;
  item_slug: string;
  display_name: string | null;
}

export interface BrokerSnapshot {
  slug: string;
  name: string;
  updated_at: string;
}

export interface ArticleSnapshot {
  slug: string;
  title: string;
  excerpt: string | null;
  related_brokers: string[];
  published_at: string;
}

export type WatchlistChangeKind = "broker_update" | "related_article";

export interface WatchlistChange {
  kind: WatchlistChangeKind;
  item_slug: string;
  item_type: WatchableType;
  display_name: string;
  headline: string;
  body: string;
  href: string;
  occurred_at: string;
}

const TYPE_HREF_PREFIX: Record<WatchableType, string> = {
  broker: "/brokers/",
  etf: "/etfs/",
  stock: "/stocks/",
  fund: "/funds/",
  crypto: "/crypto/",
};

const KNOWN_TYPES = new Set<WatchableType>(["stock", "etf", "broker", "fund", "crypto"]);

export function isWatchableType(value: string): value is WatchableType {
  return KNOWN_TYPES.has(value as WatchableType);
}

/**
 * Build the change list for a single user.
 *
 * Pure function — takes everything it needs as inputs. Cron route is
 * responsible for batching DB reads (one query for all brokers, one for all
 * articles in window) and passing them in. Keeps the function testable
 * without mocking Supabase.
 */
export function collectChangesForUser(opts: {
  items: WatchlistItemRow[];
  windowStart: Date;
  brokers: BrokerSnapshot[];
  articles: ArticleSnapshot[];
}): WatchlistChange[] {
  const { items, windowStart, brokers, articles } = opts;
  const windowMs = windowStart.getTime();
  const changes: WatchlistChange[] = [];

  const brokerSlugsWatched = new Set<string>();
  for (const item of items) {
    if (item.item_type === "broker") brokerSlugsWatched.add(item.item_slug);
  }

  const brokerBySlug = new Map<string, BrokerSnapshot>();
  for (const b of brokers) brokerBySlug.set(b.slug, b);

  for (const item of items) {
    if (!isWatchableType(item.item_type)) continue;
    const display = item.display_name?.trim() || item.item_slug;
    const href = `${TYPE_HREF_PREFIX[item.item_type]}${item.item_slug}`;

    // Broker-specific signal: brokers row updated in window.
    if (item.item_type === "broker") {
      const broker = brokerBySlug.get(item.item_slug);
      if (broker && new Date(broker.updated_at).getTime() >= windowMs) {
        changes.push({
          kind: "broker_update",
          item_slug: item.item_slug,
          item_type: "broker",
          display_name: display,
          headline: `${broker.name} listing was updated`,
          body: "Fees, features or eligibility may have changed since you last looked. Tap through for the current detail.",
          href,
          occurred_at: broker.updated_at,
        });
      }
    }

    // Related-article signal: any article tagged with the broker slug.
    if (item.item_type === "broker" && brokerSlugsWatched.has(item.item_slug)) {
      for (const article of articles) {
        if (!article.related_brokers.includes(item.item_slug)) continue;
        if (new Date(article.published_at).getTime() < windowMs) continue;
        changes.push({
          kind: "related_article",
          item_slug: item.item_slug,
          item_type: "broker",
          display_name: display,
          headline: `New: ${article.title}`,
          body: article.excerpt ?? `New analysis touching ${display}.`,
          href: `/articles/${article.slug}`,
          occurred_at: article.published_at,
        });
      }
    }
  }

  // Stable order: newest event first.
  changes.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return changes;
}

/**
 * Render the digest HTML for one recipient. Returns null when there's
 * nothing to send — callers should skip sending entirely rather than
 * mailing an empty digest.
 */
export function renderWatchlistDigestHtml(opts: {
  changes: WatchlistChange[];
  recipientName: string | null;
  now: Date;
  unsubscribeHref: string;
  manageHref: string;
}): string | null {
  const { changes, recipientName, now, unsubscribeHref, manageHref } = opts;
  if (changes.length === 0) return null;

  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)}` : "Hi there";
  const dateStr = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const changeBlocks = changes
    .map((c) => {
      const tagColour = c.kind === "broker_update" ? "#0369a1" : "#15803d";
      const tagLabel = c.kind === "broker_update" ? "Listing update" : "New article";
      return `
      <div style="border-left: 3px solid ${tagColour}; background: #f8fafc; padding: 14px 16px; margin: 0 0 14px; border-radius: 4px;">
        <div style="font-size: 11px; font-weight: 700; color: ${tagColour}; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">
          ${tagLabel} · ${escapeHtml(c.display_name)}
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">
          ${escapeHtml(c.headline)}
        </div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0 0 6px;">
          ${escapeHtml(c.body)}
        </div>
        <a href="https://invest.com.au${escapeHtml(c.href)}" style="display: inline-block; color: #15803d; font-size: 13px; font-weight: 600; text-decoration: none;">View →</a>
      </div>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 32px 24px;">
    <div style="text-align: center; margin: 0 0 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
        Your watchlist this week
      </div>
      <h1 style="font-size: 22px; color: #0f172a; margin: 0;">${greeting} — here's what changed</h1>
      <div style="font-size: 13px; color: #64748b; margin: 8px 0 0;">${dateStr} · ${changes.length} update${changes.length === 1 ? "" : "s"}</div>
    </div>

    ${changeBlocks}

    <div style="text-align: center; margin: 32px 0 0; padding: 20px 0 0; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 8px;">
        You're receiving this because you turned on watchlist email alerts on
        invest.com.au. General information only — not financial advice.
      </p>
      <p style="font-size: 12px; margin: 0;">
        <a href="https://invest.com.au${escapeHtml(manageHref)}" style="color: #64748b;">Manage watchlist</a>
        &nbsp;·&nbsp;
        <a href="https://invest.com.au${escapeHtml(unsubscribeHref)}" style="color: #64748b;">Turn off alerts</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
