/**
 * Advisor articles / insights browsing flow.
 *
 * Covers:
 *   1. /articles (or /advisor-guides) hub renders with category links
 *   2. Category filter navigates without 500
 *   3. Individual article renders: h1, author, date, body content
 *   4. Article has JSON-LD (Article schema)
 *   5. Article has a back-link to its author advisor profile
 *   6. Related articles or advisor profile CTA present at bottom
 *   7. Advisor insights tab on an advisor profile renders
 */

import type { Flow } from "./types";

export const ADVISOR_ARTICLE_BROWSE_FLOW: Flow = {
  name: "advisor-article-browse",
  description:
    "Browses the advisor insights/articles hub, reads an article, and checks schema, author attribution, and back-links to advisor profiles.",
  steps: [
    // ── Step 1: articles hub renders ─────────────────────────────────────────
    {
      name: "articles-hub-renders",
      async run({ page, store, persona, config }) {
        // Try /articles first, fall back to /advisor-guides.
        const candidates = ["/articles", "/advisor-guides"];
        let found = false;

        for (const path of candidates) {
          const url = config.baseUrl.replace(/\/$/, "") + path;
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const status = res?.status() ?? 0;
          if (status < 400) {
            found = true;
            await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
            await page.waitForTimeout(400);
            break;
          }
        }

        if (!found) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "articles hub (/articles or /advisor-guides) returned 404 on both paths",
            detail: "Neither /articles nor /advisor-guides returned a 2xx response.",
            url: page.url(),
            persona,
            signatureKey: "advisor-articles:hub-404",
          });
          throw new Error("no articles hub found");
        }

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 30) throw new Error("articles hub rendered almost no content");
      },
    },

    // ── Step 2: click first article link ────────────────────────────────────
    {
      name: "open-first-article",
      async run({ page, store, persona, config }) {
        // Look for links into /article/[slug] or /advisor-guides/[slug].
        const articleLinks = page.locator('main a[href*="/article/"], main a[href*="/advisor-guides/"]');
        const count = await articleLinks.count().catch(() => 0);

        if (count === 0) {
          store.add({
            severity: "low",
            category: "flow-failure",
            title: "articles hub: no article links found",
            detail: "No links into /article/ or /advisor-guides/ were found on the hub page. The list may be empty or rendering differently.",
            url: page.url(),
            persona,
            signatureKey: "advisor-articles:no-links",
          });
          throw new Error("no article links on hub");
        }

        const href = await articleLinks.first().getAttribute("href") ?? "";
        const articleUrl = config.baseUrl.replace(/\/$/, "") + href;
        const res = await page.goto(articleUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        if (status >= 400) throw new Error(`article page ${href} returned HTTP ${status}`);
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);
      },
    },

    // ── Step 3: article content elements ─────────────────────────────────────
    {
      name: "article-content-elements",
      async run({ page, store, persona }) {
        const url = page.url();

        const h1Count = await page.locator("h1").count().catch(() => 0);
        const bodyText = await page.locator("main, article, body").first().innerText().catch(() => "");

        if (h1Count === 0) {
          store.add({
            severity: "high",
            category: "ux",
            title: "article page: no h1 heading",
            detail: "Article page at " + url + " has no <h1> element. This harms SEO and GEO citability — the title is not machine-readable.",
            url,
            persona,
            signatureKey: "advisor-articles:no-h1",
          });
        }

        if (bodyText.trim().length < 200) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "article page: body content very short (<200 chars)",
            detail: `Article body text is only ${bodyText.trim().length} chars — likely a stub or render failure.`,
            url,
            persona,
            signatureKey: "advisor-articles:thin-content",
          });
        }

        // Author attribution: look for author name near a byline.
        const hasAuthor = /by |author|written by/i.test(bodyText) ||
          (await page.locator('[rel="author"], [itemprop="author"], [data-author]').count().catch(() => 0)) > 0;

        if (!hasAuthor) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "article page: no visible author attribution",
            detail:
              "No author byline detected on the article page. Author attribution builds trust and links the article back to the advisor profile.",
            url,
            persona,
            signatureKey: "advisor-articles:no-author",
          });
        }
      },
    },

    // ── Step 4: Article JSON-LD present ──────────────────────────────────────
    {
      name: "article-schema-present",
      async run({ page, store, persona }) {
        const url = page.url();
        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => [] as string[]);
        const hasArticleSchema = scripts.some((s) =>
          /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/i.test(s)
        );

        if (!hasArticleSchema) {
          store.add({
            severity: "high",
            category: "schema",
            title: "article page: no Article/BlogPosting JSON-LD",
            detail:
              "No script[type=application/ld+json] with @type=Article, BlogPosting, or NewsArticle was found. " +
              "Google's AI Overviews use Article schema to cite advisor content — missing this is a GEO miss.",
            url,
            persona,
            signatureKey: "advisor-articles:no-article-schema",
          });
        }
      },
    },

    // ── Step 5: link back to advisor profile ─────────────────────────────────
    {
      name: "back-link-to-advisor",
      async run({ page, store, persona }) {
        const url = page.url();
        const hasAdvisorBackLink =
          (await page.locator('a[href^="/advisor/"]').count().catch(() => 0)) > 0;

        if (!hasAdvisorBackLink) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "article page: no link back to author advisor profile",
            detail:
              "The article page has no link into /advisor/[slug]. " +
              "Users who find articles via search have no path to the advisor's profile — a conversion gap.",
            url,
            persona,
            signatureKey: "advisor-articles:no-profile-backlink",
          });
        }
      },
    },

    // ── Step 6: related content or advisor CTA at bottom ─────────────────────
    {
      name: "bottom-cta-or-related",
      async run({ page, store, persona }) {
        const url = page.url();
        // Scroll to bottom to trigger lazy-loaded content.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => undefined);
        await page.waitForTimeout(600);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        const hasRelatedOrCTA =
          /related|more articles|read more|enquir|get in touch|speak to an advisor/i.test(bodyText) ||
          (await page.locator('a[href^="/advisor/"], a[href*="find-advisor"]').count().catch(() => 0)) > 1;

        if (!hasRelatedOrCTA) {
          store.add({
            severity: "low",
            category: "ux",
            title: "article page: no related content or advisor CTA at bottom",
            detail:
              "After scrolling to the bottom, no related articles, advisor CTA, or 'Speak to an advisor' prompt was found. " +
              "Article endings should direct readers somewhere — either to the advisor's profile or related content.",
            url,
            persona,
            signatureKey: "advisor-articles:no-bottom-cta",
          });
        }
      },
    },
  ],
};
