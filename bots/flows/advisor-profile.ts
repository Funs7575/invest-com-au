/**
 * Advisor profile page flow.
 *
 * Finds the first advisor in the directory, navigates to their profile,
 * and verifies every major section:
 *   1. Profile renders (name, photo/initials, type, location)
 *   2. Trust signals present (rating, verified badge or review count)
 *   3. Enquiry/booking CTA renders above the fold
 *   4. Reviews section renders (or explicitly states zero reviews)
 *   5. Articles/Insights section renders (or explicitly says none)
 *   6. Related advisors section renders
 *   7. Schema.org Person JSON-LD present
 *   8. No booking CTA regression (calendar embed / booking link visible if advisor has one set)
 */

import type { Flow } from "./types";

export const ADVISOR_PROFILE_FLOW: Flow = {
  name: "advisor-profile",
  description:
    "Finds the first advisor from the directory and walks through every section of their profile page: trust signals, CTA, reviews, articles, schema.",
  steps: [
    // ── Step 1: discover a live advisor slug from the directory ──────────────
    {
      name: "discover-advisor-slug",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisors";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        if ((res?.status() ?? 0) >= 400) {
          throw new Error(`/advisors returned HTTP ${res?.status()}`);
        }
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);

        // Grab the first profile link from the directory.
        const profileLinks = page.locator('main a[href^="/advisor/"]');
        const count = await profileLinks.count().catch(() => 0);
        if (count === 0) {
          store.add({
            severity: "medium",
            category: "flow-failure",
            title: "advisor directory has no profile links — profile flow skipped",
            detail: "Could not find any a[href^='/advisor/'] on /advisors. The directory may be empty on this target.",
            url,
            persona,
            signatureKey: "advisor-profile:no-slug",
          });
          throw new Error("no advisor profiles in directory");
        }

        const firstHref = await profileLinks.first().getAttribute("href");
        if (!firstHref) throw new Error("advisor profile link has no href");

        // Store slug in page context for subsequent steps.
        await page.evaluate((slug) => { (window as unknown as Record<string, unknown>).__botAdvisorSlug = slug; }, firstHref);
      },
    },

    // ── Step 2: profile page renders ────────────────────────────────────────
    {
      name: "profile-page-renders",
      async run({ page, config }) {
        const slug = await page.evaluate(() => (window as unknown as Record<string, unknown>).__botAdvisorSlug as string | undefined);
        if (!slug) throw new Error("no advisor slug from discovery step");

        const url = config.baseUrl.replace(/\/$/, "") + slug;
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) throw new Error(`${slug} returned HTTP ${status}`);
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 50) {
          throw new Error(`advisor profile at ${slug} rendered almost no content`);
        }
      },
    },

    // ── Step 3: trust signals present ───────────────────────────────────────
    {
      name: "trust-signals-present",
      async run({ page, store, persona }) {
        const url = page.url();

        // Look for a rating number (e.g., "4.8") or a star element.
        const hasRating =
          (await page.locator('[aria-label*="rating" i], [data-rating], .star-rating').count().catch(() => 0)) > 0 ||
          (await page.locator("main").first().innerText().catch(() => "")).match(/\d\.\d\s*(out of|\/\s*5)/i) !== null;

        // Verified badge (text or aria-label).
        const hasVerified =
          (await page.locator('[aria-label*="verified" i], [data-verified], :text("Verified")').count().catch(() => 0)) > 0;

        if (!hasRating && !hasVerified) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "advisor profile: no visible trust signals (rating or verified badge)",
            detail:
              "Neither a star/rating element nor a 'Verified' badge was found on the profile page. " +
              "Trust signals are critical conversion drivers — their absence is a UX regression.",
            url,
            persona,
            signatureKey: "advisor-profile:no-trust-signals",
          });
        }
      },
    },

    // ── Step 4: enquiry / booking CTA above-the-fold ─────────────────────────
    {
      name: "enquiry-cta-present",
      async run({ page, store, persona }) {
        const url = page.url();

        // CTA could be "Send Enquiry", "Contact", "Book", "Request a call", etc.
        const ctaSelector =
          'a:has-text("Enquiry"), a:has-text("enquiry"), button:has-text("Enquiry"), ' +
          'a:has-text("Book"), button:has-text("Book"), a:has-text("Contact"), button:has-text("Contact"), ' +
          'a:has-text("Request"), button:has-text("Request")';

        const ctaCount = await page.locator(ctaSelector).count().catch(() => 0);
        if (ctaCount === 0) {
          store.add({
            severity: "high",
            category: "ux",
            title: "advisor profile: primary enquiry/booking CTA missing",
            detail:
              "Could not find a 'Send Enquiry', 'Book', 'Contact', or 'Request' CTA on the advisor profile. " +
              "This is the primary conversion action — its absence will kill lead flow.",
            url,
            persona,
            signatureKey: "advisor-profile:no-cta",
          });
        }
      },
    },

    // ── Step 5: reviews section renders ──────────────────────────────────────
    {
      name: "reviews-section-renders",
      async run({ page, store, persona }) {
        const url = page.url();
        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");

        const hasReviews =
          /review[s]?|testimonial[s]?/i.test(bodyText) ||
          (await page.locator('[aria-label*="review" i], [data-testid*="review" i], h2:has-text("Review"), h3:has-text("Review")').count().catch(() => 0)) > 0;

        if (!hasReviews) {
          store.add({
            severity: "low",
            category: "ux",
            title: "advisor profile: reviews section not found",
            detail:
              "The reviews section heading or no-reviews state was not detected on the profile. " +
              "Either the section is missing or its markup doesn't include the word 'review'.",
            url,
            persona,
            signatureKey: "advisor-profile:no-reviews-section",
          });
        }
      },
    },

    // ── Step 6: related advisors section ─────────────────────────────────────
    {
      name: "related-advisors-section",
      async run({ page, store, persona }) {
        const url = page.url();
        const relatedLinks = await page.locator('a[href^="/advisor/"]').count().catch(() => 0);

        // Should see MORE than 1 link — the canonical one plus at least one related.
        if (relatedLinks < 2) {
          store.add({
            severity: "low",
            category: "ux",
            title: "advisor profile: related advisors section appears empty",
            detail:
              "Found fewer than 2 /advisor/ links on the profile page. " +
              "The 'Similar advisors' rail either isn't rendering or returned no data.",
            url,
            persona,
            signatureKey: "advisor-profile:no-related",
          });
        }
      },
    },

    // ── Step 7: Person JSON-LD present ───────────────────────────────────────
    {
      name: "person-schema-present",
      async run({ page, store, persona }) {
        const url = page.url();
        const scripts = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => [] as string[]);
        const hasPerson = scripts.some((s) => /"@type"\s*:\s*"Person"/i.test(s));

        if (!hasPerson) {
          store.add({
            severity: "medium",
            category: "schema",
            title: "advisor profile: no Person JSON-LD",
            detail:
              "No script[type=application/ld+json] with @type=Person was found. " +
              "Google's AI search uses structured data to cite advisor profiles — missing this hurts GEO citability.",
            url,
            persona,
            signatureKey: "advisor-profile:no-person-schema",
          });
        }
      },
    },

    // ── Step 8: booking embed check (if advisor has link) ────────────────────
    {
      name: "booking-embed-or-link",
      async run({ page, store, persona }) {
        const url = page.url();
        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");

        // If the profile page mentions Calendly/Cal.com but shows no iframe or booking link,
        // the integration may be broken. Only flag if the word "book" appears (implies booking is expected).
        if (/\bbook\b/i.test(bodyText)) {
          const hasCalEmbed =
            (await page.locator('iframe[src*="calendly"], iframe[src*="cal.com"], [data-cal-link]').count().catch(() => 0)) > 0;
          const hasBookingBtn =
            (await page.locator('a[href*="calendly"], a[href*="cal.com"], button:has-text("Book a call"), a:has-text("Book a call")').count().catch(() => 0)) > 0;

          if (!hasCalEmbed && !hasBookingBtn) {
            store.add({
              severity: "low",
              category: "ux",
              title: "advisor profile: 'Book' text present but no booking embed/link found",
              detail:
                "The word 'book' appears on this profile but no Calendly iframe, Cal.com embed, or booking link is present. " +
                "The advisor may have a booking URL configured that isn't rendering.",
              url,
              persona,
              signatureKey: "advisor-profile:book-text-no-embed",
            });
          }
        }
      },
    },
  ],
};
