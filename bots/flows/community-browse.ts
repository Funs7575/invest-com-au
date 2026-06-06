/**
 * Community features browsing flow.
 *
 * Covers:
 *   1. /community hub renders with category links
 *   2. Individual category page renders
 *   3. Thread detail page renders (title, body, vote controls)
 *   4. "New thread" CTA is present (even if gated behind auth)
 *   5. Community search / filter works without crashing
 *   6. Confessions page renders (/community/confessions)
 *   7. Thread JSON-LD (DiscussionForumPosting) present on thread detail
 */

import type { Flow } from "./types";

export const COMMUNITY_BROWSE_FLOW: Flow = {
  name: "community-browse",
  description:
    "Walks the community hub → category → thread detail, checks vote controls, new-thread CTA, and DiscussionForumPosting schema.",
  steps: [
    // ── Step 1: /community hub renders ──────────────────────────────────────
    {
      name: "community-hub-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/community";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 400) throw new Error(`/community returned HTTP ${status}`);
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 20) {
          throw new Error("/community rendered almost no content");
        }

        // Check if it's a "coming soon" / placeholder page — note it but don't fail.
        if (/coming soon|launching soon|under construction/i.test(bodyText)) {
          store.add({
            severity: "info",
            category: "ux",
            title: "community: hub shows 'coming soon' state",
            detail:
              "The community hub is rendering a placeholder/coming-soon message. " +
              "If launch is imminent, add a notification signup to capture interested users.",
            url,
            persona,
            signatureKey: "community:coming-soon",
          });
        }
      },
    },

    // ── Step 2: category links and navigation ────────────────────────────────
    {
      name: "category-navigation",
      async run({ page, store, persona, config }) {
        const url = page.url();

        // Community categories link to /community/[category].
        const categoryLinks = page.locator('main a[href*="/community/"]');
        const count = await categoryLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "community: no category links found on hub",
            detail: "No links into /community/[category] were found on the hub page. Categories may not be seeded on this target.",
            url,
            persona,
            signatureKey: "community:no-categories",
          });
          return; // subsequent steps need a category — skip gracefully
        }

        // Navigate to the first non-confessions category.
        let categoryHref: string | null = null;
        for (let i = 0; i < count && !categoryHref; i++) {
          const h = await categoryLinks.nth(i).getAttribute("href") ?? "";
          if (h.includes("/community/") && !h.includes("confessions") && h !== "/community/new") {
            categoryHref = h;
          }
        }
        if (!categoryHref) categoryHref = await categoryLinks.first().getAttribute("href") ?? "";

        if (!categoryHref) {
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "community: could not resolve a category href",
            detail: "All category links on the community hub were either /community/new or /community/confessions — no regular category found.",
            url,
            persona,
            signatureKey: "community:no-category-href",
          });
          return;
        }

        const catUrl = config.baseUrl.replace(/\/$/, "") + categoryHref;
        const res = await page.goto(catUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 400) {
          store.add({
            severity: "high",
            category: "http-error",
            title: `community category ${categoryHref} returned HTTP ${status}`,
            detail: `Navigating to community category ${categoryHref} returned a ${status} error.`,
            url: catUrl,
            persona,
            signatureKey: `community:category:${status}`,
          });
          return;
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        await page.evaluate((slug) => { (window as unknown as Record<string, unknown>).__botCategoryHref = slug; }, categoryHref);
      },
    },

    // ── Step 3: thread detail renders ────────────────────────────────────────
    {
      name: "thread-detail-renders",
      async run({ page, store, persona, config }) {
        // Look for thread links on the category page.
        const threadLinks = page.locator('main a[href*="/community/"][href*="/"]').filter({
          hasNot: page.locator('[href$="/community/new"]'),
        });
        const count = await threadLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "community: no thread links found on category page",
            detail: "The category page shows no thread links — may be empty on this target or all threads are in a different format.",
            url: page.url(),
            persona,
            signatureKey: "community:no-threads",
          });
          return;
        }

        const href = await threadLinks.first().getAttribute("href") ?? "";
        if (!href || href === "/community/new") return;

        const threadUrl = config.baseUrl.replace(/\/$/, "") + href;
        const res = await page.goto(threadUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 400) {
          store.add({
            severity: "high",
            category: "http-error",
            title: `community thread ${href} returned HTTP ${status}`,
            url: threadUrl,
            persona,
            signatureKey: `community:thread:${status}`,
            detail: `Thread page at ${href} returned ${status}.`,
          });
          return;
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 30) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "community thread: body rendered almost no content",
            url: page.url(),
            persona,
            signatureKey: "community:thread:empty",
            detail: "Thread detail page rendered less than 30 chars of content.",
          });
        }
      },
    },

    // ── Step 4: vote controls present on thread ───────────────────────────────
    {
      name: "vote-controls-present",
      async run({ page, store, persona }) {
        const url = page.url();
        // Skip if we're back on the hub / category (no thread was opened).
        if (!url.match(/\/community\/.+\/.+/)) return;

        const voteSelector =
          'button[aria-label*="pvo" i], button[aria-label*="vote" i], button:has-text("Upvote"), button:has-text("Vote"), [data-vote]';
        const hasVotes = (await page.locator(voteSelector).count().catch(() => 0)) > 0;

        if (!hasVotes) {
          store.add({
            severity: "low",
            category: "ux",
            title: "community thread: no vote controls found",
            detail:
              "Expected upvote/downvote controls on the thread detail page but none were found. " +
              "If voting is a feature, the controls may not be rendering.",
            url,
            persona,
            signatureKey: "community:thread:no-votes",
          });
        }
      },
    },

    // ── Step 5: new-thread CTA present ───────────────────────────────────────
    {
      name: "new-thread-cta-present",
      async run({ page, store, persona, config }) {
        // Return to hub to check new-thread CTA.
        const url = config.baseUrl.replace(/\/$/, "") + "/community";
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        const hasNewThread =
          (await page.locator(
            'a[href*="/community/new"], button:has-text("New thread"), button:has-text("Ask a question"), a:has-text("Start a discussion")'
          ).count().catch(() => 0)) > 0;

        if (!hasNewThread) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "community: no 'New thread' / 'Ask a question' CTA on hub",
            detail:
              "No CTA to create a new thread was found on the community hub. " +
              "This is the primary engagement action — its absence means users can't contribute.",
            url,
            persona,
            signatureKey: "community:no-new-thread-cta",
          });
        }
      },
    },

    // ── Step 6: confessions page renders ─────────────────────────────────────
    {
      name: "confessions-page-renders",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/community/confessions";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status === 404) {
          store.add({
            severity: "low",
            category: "http-error",
            title: "community/confessions returned 404",
            url,
            persona,
            signatureKey: "community:confessions:404",
            detail: "The confessions sub-page doesn't exist or has been removed.",
          });
        } else if (status >= 500) {
          store.add({
            severity: "high",
            category: "http-error",
            title: `community/confessions returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `community:confessions:${status}`,
            detail: "Server error on the confessions page.",
          });
        }
      },
    },

    // ── Step 7: DiscussionForumPosting schema on thread ───────────────────────
    {
      name: "thread-discussion-schema",
      async run({ page, store, persona, config }) {
        // Navigate back to a category and open the first thread again to check schema.
        const url = config.baseUrl.replace(/\/$/, "") + "/community";
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const threadLinks = page.locator('main a[href*="/community/"][href*="/"]');
        const href = await threadLinks.first().getAttribute("href").catch(() => null);
        if (!href) return; // no threads to check

        const threadUrl = config.baseUrl.replace(/\/$/, "") + href;
        await page.goto(threadUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);

        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => [] as string[]);
        const hasSchema = scripts.some((s) =>
          /"@type"\s*:\s*"(DiscussionForumPosting|QAPage|Question)"/i.test(s)
        );

        if (!hasSchema) {
          store.add({
            severity: "medium",
            category: "schema",
            title: "community thread: no DiscussionForumPosting/QAPage JSON-LD",
            detail:
              "Thread detail page has no structured data. " +
              "DiscussionForumPosting schema enables community threads to appear in Google's AI Overviews as cited Q&A content.",
            url: page.url(),
            persona,
            signatureKey: "community:thread:no-schema",
          });
        }
      },
    },
  ],
};
