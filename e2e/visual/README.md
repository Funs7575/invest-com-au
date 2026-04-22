# Visual regression specs

**Status: skeleton — enable with the setup steps in
`.github/workflows/visual-regression.yml`.**

This directory holds Playwright specs whose only assertion is
`toHaveScreenshot()`. They're kept separate from the functional e2e
specs because the coverage goals are different: functional tests
lock the DOM shape and behaviour; visual tests lock the pixels.

When the Chromatic integration is enabled, Chromatic's Playwright
mode runs these specs, uploads each screenshot to Chromatic's diff
service, and fails the PR check if any pixel-level diff exceeds the
tolerance threshold (configurable in the Chromatic dashboard —
default: 0.2% of pixels changed).

## Coverage plan (14 routes × 2 viewports = 28 snapshots/run)

Legal / meta (highest ROI — rarely changes, so every diff is likely
a regression):

- `/`
- `/privacy`
- `/terms`
- `/accessibility`
- `/about`
- `/how-we-earn`

Financial tools (user-critical UI):

- `/fee-impact`
- `/tax/capital-gains`
- `/tax/franking-credits`

Marketplace (the most CSS-heavy surface):

- `/compare`
- `/find-advisor`

Reviews (content pages that pick up header/footer changes):

- `/broker/example-share-broker`
- `/broker/example-sponsored-broker`

Glossary (long list, catches typography regressions):

- `/glossary`

## Viewports

Each route is captured at two widths:

- **desktop** — 1440×900 (Chromium, default)
- **mobile** — 375×812 (iPhone 13, via Playwright device preset)

## Why not Percy / Storybook / Playwright built-in

- **Percy**: similar feature, more expensive at this scale.
- **Storybook + Chromatic stories**: requires setting up Storybook
  (not currently in the repo). Would be more thorough than page-
  level snapshots (catches component-level regressions in
  isolation) but is a bigger commit.
- **Playwright built-in `toHaveScreenshot()`**: stores baselines in
  the repo. Free, no SaaS. Trade-off: diffs are reviewed in git
  commits, not in a hosted UI — painful to approve/reject a 14-
  snapshot batch.

## Implementation (for when enabling)

1. Create `e2e/visual/{legal,tools,marketplace,reviews,glossary}.spec.ts`
   — each file has 2-4 tests, one per route, using
   `await expect(page).toHaveScreenshot()` after page.goto + a
   short wait for network-idle.
2. Make sure the `needs: ci` step in
   `.github/workflows/visual-regression.yml` still downloads the
   correct `.next` build artifact.
3. Generate the initial baseline by pushing with the workflow
   enabled and accepting all snapshots in Chromatic's dashboard.
4. Tune the tolerance in Chromatic project settings —
   0.2% (default) is usually fine for finance sites; tune down
   to 0.1% if false negatives outweigh true ones.

## Budget

Free tier: 5,000 snapshots/month. Expected usage: ~28 snapshots
per PR × ~6 PRs/day = 5,040/month. That's right at the free-tier
ceiling. Hobby plan ($149/mo) triples it.

Workflow is `paths:`-gated so docs-only PRs don't consume budget.
