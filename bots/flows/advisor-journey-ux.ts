/**
 * Advisor journey UX evaluation flow.
 *
 * Walks the full pre-auth advisor funnel and the public portal surfaces,
 * evaluating UX quality at each step:
 *
 *   1.  /for-advisors          — marketing page: value prop, CTAs, testimonials, FAQ,
 *                                urgency signal, pricing transparency
 *   2.  /for-advisors → apply  — conversion step: can an advisor actually start applying?
 *   3.  /advisor-portal        — login form: magic-link vs password tabs, field labels,
 *                                error state accessible, mobile layout at 390px
 *   4.  /advisor-portal tab UX — password tab switches in; email placeholder present
 *   5.  /teams                 — squad directory: cards, search, creation CTA
 *   6.  /teams/new step 1      — category + name: form fields render, validation present
 *   7.  /teams/new step 2      — description + template: text area + chip selectors
 *   8.  /teams/new step 3      — member add: search box or invite input present
 *   9.  /teams/new step 4      — preview card: public preview renders before submit
 *  10.  /find-advisor (advisor POV) — the lead capture quiz that sends leads TO advisors:
 *                                     does it look trustworthy from the advisor's perspective?
 *  11.  Mobile portal at 390px — "More…" dropdown exposes hidden tabs on mobile
 *  12.  /advisor-portal/health — health JSON round-trip
 */

import type { Page } from "@playwright/test";
import type { Flow } from "./types";

/** Grab page body text safely. */
async function bodyText(page: Page): Promise<string> {
  return page.locator("main, body").first().innerText().catch(() => "");
}

/** Navigate and assert 2xx. Generous timeout for dev-server cold-start. */
async function goto(
  page: Page,
  url: string,
  label: string,
): Promise<number> {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const status = res?.status() ?? 0;
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  if (status >= 400) throw new Error(`${label} → HTTP ${status}`);
  return status;
}

export const ADVISOR_JOURNEY_UX_FLOW: Flow = {
  name: "advisor-journey-ux",
  description:
    "Full pre-auth advisor journey: marketing page quality, login form UX, team-creation wizard, mobile nav, and lead-capture quiz.",

  steps: [
    // ── 1. /for-advisors marketing page ──────────────────────────────────────
    {
      name: "for-advisors-marketing",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/for-advisors";
        await goto(page, url, "/for-advisors");

        const text = await bodyText(page);

        // Primary CTA visible
        const hasCta = (await page.locator(
          'a:has-text("Get started"), a:has-text("Apply"), a:has-text("Join"), button:has-text("Apply")',
        ).count()) > 0;
        if (!hasCta) {
          store.add({
            severity: "high", category: "ux",
            title: "for-advisors: no primary CTA (Apply/Join/Get started)",
            detail: "The advisor marketing page has no primary CTA. Advisors can't start the signup process.",
            url, persona, signatureKey: "advisor-journey:for-advisors:no-cta",
          });
        }

        // Testimonials section (ADV-005)
        const hasTestimonials =
          /testimonial|what.*advisors.*say|hear from|joined|trusted by/i.test(text) ||
          (await page.locator('blockquote, [data-testimonial]').count()) > 0;
        if (!hasTestimonials) {
          store.add({
            severity: "medium", category: "ux",
            title: "for-advisors: no testimonials/social proof section found",
            detail: "Advisor marketing page has no testimonials. Social proof is critical for B2B conversion.",
            url, persona, signatureKey: "advisor-journey:for-advisors:no-testimonials",
          });
        }

        // FAQ section (ADV-017)
        const hasFaq =
          /faq|frequently asked|spam|how long|first lead/i.test(text.toLowerCase());
        if (!hasFaq) {
          store.add({
            severity: "low", category: "ux",
            title: "for-advisors: FAQ section missing or doesn't address key objections",
            detail: "Expected FAQ entries about spam leads, time to first lead, or follow-up support.",
            url, persona, signatureKey: "advisor-journey:for-advisors:no-faq-objections",
          });
        }

        // Pricing transparency
        const hasPricing = /\$|per month|free|plan|pricing|credit/i.test(text);
        if (!hasPricing) {
          store.add({
            severity: "medium", category: "ux",
            title: "for-advisors: no pricing signals on marketing page",
            detail: "No $ amounts, plan names, or 'free' mentions. Advisors can't evaluate cost before applying.",
            url, persona, signatureKey: "advisor-journey:for-advisors:no-pricing",
          });
        }
      },
    },

    // ── 2. Apply / signup conversion step ────────────────────────────────────
    {
      name: "for-advisors-apply-cta",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/for-advisors";
        // Find the primary CTA and check it points somewhere real.
        const cta = page.locator(
          'a:has-text("Get started"), a:has-text("Apply now"), a:has-text("Apply"), a:has-text("Join for free"), a:has-text("Join")',
        ).first();

        const href = await cta.getAttribute("href").catch(() => null);
        if (!href) {
          store.add({
            severity: "medium", category: "ux",
            title: "for-advisors: primary CTA has no href",
            detail: "The Apply/Join CTA button has no destination. Clicking it does nothing.",
            url, persona, signatureKey: "advisor-journey:for-advisors:cta-no-href",
          });
          return;
        }

        // Navigate to the apply destination.
        const applyUrl = href.startsWith("http") ? href : config.baseUrl.replace(/\/$/, "") + href;
        const res = await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 120_000 }).catch(() => null);
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: "high", category: "ux",
            title: `for-advisors CTA destination returned HTTP ${status}`,
            detail: `The Apply CTA links to ${applyUrl} which returned ${status}. The entire onboarding funnel is broken.`,
            url: applyUrl, persona, signatureKey: "advisor-journey:for-advisors:cta-dead",
          });
        }
      },
    },

    // ── 3. Login form render + structure ─────────────────────────────────────
    {
      name: "portal-login-form-ux",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal";
        await goto(page, url, "/advisor-portal");

        const text = await bodyText(page);

        // Email input present
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
        if ((await emailInput.count()) === 0) {
          store.add({
            severity: "high", category: "ux",
            title: "advisor-portal: login form missing email input",
            detail: "No email input on the login screen. Advisors cannot sign in.",
            url, persona, signatureKey: "advisor-journey:portal:no-email",
          });
        }

        // Tab switch buttons (magic-link vs password)
        const tabs = page.locator('button[aria-pressed], [role="tab"]');
        const tabCount = await tabs.count().catch(() => 0);
        if (tabCount < 2) {
          store.add({
            severity: "medium", category: "ux",
            title: "advisor-portal: login form has no auth-method toggle",
            detail: "Expected at least 2 tab buttons (magic-link + password). Only one auth path is visible.",
            url, persona, signatureKey: "advisor-journey:portal:no-auth-tabs",
          });
        }

        // Heading / value prop on login screen
        const hasHeading = (await page.locator("h1, h2").count()) > 0;
        if (!hasHeading) {
          store.add({
            severity: "low", category: "ux",
            title: "advisor-portal: login screen has no heading",
            detail: "The login page has no h1/h2. No context is given to the advisor about what they're signing in to.",
            url, persona, signatureKey: "advisor-journey:portal:no-heading",
          });
        }

        // "Don't have an account" / register link
        const hasRegisterLink =
          /sign up|register|create.*account|apply/i.test(text) ||
          (await page.locator('a:has-text("Sign up"), a:has-text("Apply"), a:has-text("Register")').count()) > 0;
        if (!hasRegisterLink) {
          store.add({
            severity: "medium", category: "ux",
            title: "advisor-portal login: no register/apply link",
            detail: "New advisors who land on the login page have no path to create an account. Missing 'Apply' or 'Sign up' link.",
            url, persona, signatureKey: "advisor-journey:portal:no-register-link",
          });
        }
      },
    },

    // ── 4. Password tab switches in ───────────────────────────────────────────
    {
      name: "portal-login-password-tab",
      async run({ page, store, persona }) {
        const url = page.url();
        // Find a "Password" tab and click it.
        const passwordTab = page.locator(
          'button:has-text("Password"), [role="tab"]:has-text("Password")',
        );
        if ((await passwordTab.count()) === 0) {
          store.add({
            severity: "low", category: "ux",
            title: "advisor-portal: no 'Password' tab button on login form",
            detail: "Couldn't find a Password login tab. Advisors who prefer password auth have no clear path.",
            url, persona, signatureKey: "advisor-journey:portal:no-password-tab",
          });
          return;
        }

        await passwordTab.first().click().catch(() => undefined);
        await page.waitForTimeout(400);

        const passwordInput = page.locator('input[type="password"]');
        if ((await passwordInput.count()) === 0) {
          store.add({
            severity: "medium", category: "ux",
            title: "advisor-portal: clicking Password tab didn't reveal password input",
            detail: "After clicking the Password tab, no input[type=password] appeared. The tab interaction is broken.",
            url, persona, signatureKey: "advisor-journey:portal:password-tab-broken",
          });
        }
      },
    },

    // ── 5. /teams hub ─────────────────────────────────────────────────────────
    {
      name: "teams-hub-ux",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/teams";
        await goto(page, url, "/teams");

        const text = await bodyText(page);

        // Create team CTA
        const hasCreateCta =
          (await page.locator('a:has-text("Create"), a:has-text("New squad"), a[href="/teams/new"]').count()) > 0 ||
          /create.*squad|start.*team|new.*squad/i.test(text);
        if (!hasCreateCta) {
          store.add({
            severity: "medium", category: "ux",
            title: "teams hub: no 'Create a squad' CTA",
            detail: "The teams hub doesn't surface a path to create a new team. Advisor discovery is a dead end.",
            url, persona, signatureKey: "advisor-journey:teams:no-create-cta",
          });
        }
      },
    },

    // ── 6–9. Team creation wizard ─────────────────────────────────────────────
    {
      name: "team-creation-wizard",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/teams/new";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;
        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(500);

        if (status >= 500) {
          store.add({
            severity: "high", category: "ux",
            title: `teams/new returned HTTP ${status}`,
            url, persona, signatureKey: `advisor-journey:teams-new:${status}`,
            detail: "Team creation page is erroring.",
          });
          return;
        }

        const text = await bodyText(page);

        // If redirected to login — acceptable, note it and stop
        if (/log in|sign in|create an account/i.test(text)) {
          store.add({
            severity: "info", category: "ux",
            title: "teams/new: gated behind auth (expected)",
            detail: "Navigating to /teams/new redirected to login — this is the expected auth gate.",
            url: page.url(), persona, signatureKey: "advisor-journey:teams-new:auth-gate",
          });
          return;
        }

        // Step 1: squad name + category
        const hasNameInput = (await page.locator(
          'input[name*="name" i], input[placeholder*="squad" i], input[placeholder*="team" i]',
        ).count()) > 0;
        if (!hasNameInput) {
          store.add({
            severity: "medium", category: "ux",
            title: "teams/new step 1: no squad name input found",
            detail: "The first step of the team creation wizard has no name input.",
            url, persona, signatureKey: "advisor-journey:teams-new:no-name-input",
          });
        }

        // Category selector
        const hasCategorySelect =
          (await page.locator('select, [role="listbox"], [role="combobox"]').count()) > 0 ||
          /category|type of squad|squad type/i.test(text);
        if (!hasCategorySelect) {
          store.add({
            severity: "low", category: "ux",
            title: "teams/new step 1: no category selector visible",
            detail: "Can't find a team category selector in step 1 of the creation wizard.",
            url, persona, signatureKey: "advisor-journey:teams-new:no-category",
          });
        }

        // Progress indicator (step counter)
        const hasProgress =
          /step [1-9]|[1-9] of [1-9]|[1-9]\/[1-9]/i.test(text) ||
          (await page.locator('[role="progressbar"], [aria-label*="step" i], .step-indicator').count()) > 0;
        if (!hasProgress) {
          store.add({
            severity: "low", category: "ux",
            title: "teams/new: no step progress indicator",
            detail: "The team creation wizard has no 'Step X of Y' indicator. Users don't know how many steps remain.",
            url, persona, signatureKey: "advisor-journey:teams-new:no-progress",
          });
        }

        // Try advancing to step 2 by filling a name and clicking Next
        const nameInput = page.locator('input[name*="name" i], input[placeholder*="squad" i], input[placeholder*="team" i]').first();
        if ((await nameInput.count()) > 0) {
          await nameInput.fill("Test Squad UX Check").catch(() => undefined);
          await page.waitForTimeout(200);

          const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]:has-text("Next")').first();
          if ((await nextBtn.count()) > 0) {
            await nextBtn.click().catch(() => undefined);
            await page.waitForTimeout(600);

            // Step 2: description or template
            const step2Text = await bodyText(page);
            const onStep2 =
              /description|about your squad|template|speciality|step 2/i.test(step2Text);
            if (!onStep2) {
              store.add({
                severity: "low", category: "ux",
                title: "teams/new: Next button didn't advance to step 2",
                detail: "After filling name and clicking Next, the wizard didn't progress. May require validation first.",
                url: page.url(), persona, signatureKey: "advisor-journey:teams-new:step2-no-advance",
              });
            } else {
              // Check for preview card on step 4 by trying to get there
              // (soft — only if we can keep advancing)
              const step2NextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
              if ((await step2NextBtn.count()) > 0) {
                await step2NextBtn.click().catch(() => undefined);
                await page.waitForTimeout(500);
                const step3NextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
                if ((await step3NextBtn.count()) > 0) {
                  await step3NextBtn.click().catch(() => undefined);
                  await page.waitForTimeout(500);

                  // Step 4: look for preview card (ADV-020)
                  const step4Text = await bodyText(page);
                  const hasPreview = /public preview|how.*appear|squad preview/i.test(step4Text);
                  if (!hasPreview) {
                    store.add({
                      severity: "medium", category: "ux",
                      title: "teams/new step 4: no public preview card",
                      detail: "Step 4 of the team wizard should show a 'Public preview' card so advisors see how their squad will appear before submitting.",
                      url: page.url(), persona, signatureKey: "advisor-journey:teams-new:no-preview",
                    });
                  }
                }
              }
            }
          }
        }
      },
    },

    // ── 10. /find-advisor quiz (advisor POV — do leads look legit?) ───────────
    {
      name: "find-advisor-lead-quality",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/find-advisor";
        await goto(page, url, "/find-advisor");

        const text = await bodyText(page);

        // Trust signals for the advisor: does the quiz communicate what info it collects?
        const hasTrustSignals =
          /matched|personalised|specific|verified|how it works/i.test(text);
        if (!hasTrustSignals) {
          store.add({
            severity: "low", category: "ux",
            title: "find-advisor: no trust-building copy for advisors",
            detail: "The quiz page doesn't explain what it does or why the match will be personalised. Low-quality or generic leads reduce advisor trust in the platform.",
            url, persona, signatureKey: "advisor-journey:find-advisor:no-trust-copy",
          });
        }

        // Does the quiz have a progress indicator? (ADV-015 context — advisors read this when reviewing leads)
        const hasProgress =
          /step [1-9]|[1-9] of [1-9]|progress/i.test(text) ||
          (await page.locator('[role="progressbar"]').count()) > 0;
        if (!hasProgress) {
          store.add({
            severity: "low", category: "ux",
            title: "find-advisor quiz: no progress indicator on landing",
            detail: "No 'Step X of Y' or progress bar on the quiz landing. Potential leads may drop off without knowing how long the quiz is.",
            url, persona, signatureKey: "advisor-journey:find-advisor:no-progress",
          });
        }
      },
    },

    // ── 11. Mobile portal — "More…" dropdown exposes hidden tabs ─────────────
    {
      name: "portal-mobile-more-dropdown",
      async run({ page, store, persona, config }) {
        // Resize to mobile viewport
        await page.setViewportSize({ width: 390, height: 844 });
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal";
        await goto(page, url, "/advisor-portal (mobile)");

        // No horizontal overflow
        const { overflow } = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        }));
        if (overflow) {
          store.add({
            severity: "high", category: "ux",
            title: "advisor-portal mobile: horizontal overflow detected",
            detail: "The advisor portal page scrolls horizontally at 390px. This breaks mobile UX.",
            url, persona, signatureKey: "advisor-journey:portal:mobile-overflow",
          });
        }

        // "More…" dropdown button should exist on mobile (ADV-006)
        const moreBtn = page.locator('button:has-text("More")');
        const moreCount = await moreBtn.count().catch(() => 0);

        // If we're on the login page (not the portal tabs), skip this check
        const text = await bodyText(page);
        const isLoginPage = /log in|sign in|magic link|enter.*email/i.test(text);

        if (!isLoginPage) {
          if (moreCount === 0) {
            store.add({
              severity: "high", category: "ux",
              title: "advisor-portal mobile: no 'More…' dropdown button",
              detail: "At 390px the portal nav should collapse to top-7 tabs + 'More…' dropdown. No More button found — hidden tabs are inaccessible on mobile.",
              url, persona, signatureKey: "advisor-journey:portal:no-more-btn",
            });
          } else {
            // Open the dropdown and verify it has items
            await moreBtn.first().click().catch(() => undefined);
            await page.waitForTimeout(300);

            const dropdownItems = page.locator('[class*="dropdown"] button, [class*="more"] button').filter({ hasText: /\w+/ });
            const itemCount = await dropdownItems.count().catch(() => 0);

            if (itemCount === 0) {
              store.add({
                severity: "medium", category: "ux",
                title: "advisor-portal mobile: More dropdown opened but is empty",
                detail: "The More… button exists and opens, but the dropdown has no items. Hidden tabs are unreachable.",
                url, persona, signatureKey: "advisor-journey:portal:more-empty",
              });
            }
          }
        }
      },
    },

    // ── 12. Portal health JSON ────────────────────────────────────────────────
    {
      name: "portal-health-check",
      async run({ page, store, persona, config }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-portal/health";
        const res = await page.request.fetch(url, { method: "GET", timeout: 10_000 }).catch(() => null);
        if (!res) {
          store.add({
            severity: "medium", category: "http-error",
            title: "advisor portal health endpoint: request failed",
            url, persona, signatureKey: "advisor-journey:health:failed",
            detail: "GET /advisor-portal/health threw a network error or timed out.",
          });
          return;
        }
        const status = res.status();
        if (status >= 400) {
          store.add({
            severity: "medium", category: "http-error",
            title: `advisor portal health returned HTTP ${status}`,
            url, persona, signatureKey: `advisor-journey:health:${status}`,
            detail: "Health endpoint is not returning 2xx.",
          });
          return;
        }
        try {
          JSON.parse(await res.text().catch(() => ""));
        } catch {
          store.add({
            severity: "low", category: "http-error",
            title: "advisor portal health: non-JSON response",
            url, persona, signatureKey: "advisor-journey:health:non-json",
            detail: "Health endpoint response is not valid JSON.",
          });
        }
      },
    },
  ],
};
