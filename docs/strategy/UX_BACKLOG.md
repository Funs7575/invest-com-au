# UX Backlog

Strategic UX improvements identified during bot sweeps, code audits, and UX reviews.
Each entry has a priority tier (P1 = blocks revenue / compliance, P2 = significant friction, P3 = polish), effort estimate, and source.

---

## Advisor Features (2026-06-06 audit)

### P1 — High impact, high urgency

**[ADV-001] Advisor portal: onboarding wizard for new advisors**
- **Problem**: First-time advisors see 19 blank tabs. No guidance on what to do first.
- **Fix**: Add a 5-step setup wizard (Photo → Bio → Specialties → Fees → Availability) with a sticky progress banner ("40% complete — add your bio →"). Show above the tab nav until all steps are done.
- **File**: `app/advisor-portal/page.tsx` — DashboardTab rendering
- **Effort**: Medium (3–5 days)

**[ADV-002] Advisor profile: missing primary booking CTA**
- **Problem**: If an advisor has set a Calendly/Cal.com booking link, a "Book a free call" button should appear as the primary CTA alongside "Send Enquiry". Currently the booking link may not surface on the profile at all.
- **Fix**: In the profile page server component, if `professional.booking_link` is set, render a prominent "Book a call" button (primary) before the enquiry button.
- **File**: `app/advisor/[slug]/page.tsx` — CTA section
- **Effort**: Small (1 day)

**[ADV-003] Advisor portal: silent API error handling**
- **Problem**: `loadData()` in the portal swallows all errors (`catch { /* ignore */ }`). If any API is down, users see a blank dashboard with no message.
- **Fix**: Replace the broad catch with a per-call try/catch that sets error state; render a banner "Some data couldn't be loaded — try refreshing" when any fetch fails.
- **File**: `app/advisor-portal/page.tsx` lines ~115–137
- **Effort**: Small (half day)

**[ADV-004] Advisor directory: broken "load more" / pagination**
- **Problem**: `RESULTS_PER_PAGE = 12` but no pagination UI is rendered. Users with filtered results beyond 12 don't know more advisors exist.
- **Fix**: Add a "Load more" button (or numbered pagination) below the results grid. Wire to the existing page-offset logic.
- **File**: `app/advisors/page.tsx` (AdvisorsClient) — results grid
- **Effort**: Small-medium (1–2 days)

**[ADV-005] For-advisors page: missing social proof / testimonials**
- **Problem**: The advisor marketing page has stats (count, leads, categories) but no advisor testimonials or success stories.
- **Fix**: Add a testimonials carousel (2–3 quotes from real advisors) and one case study ("Firm X got 5 clients in month 1"). Data can come from the `advisor_articles` table where `category = 'case-study'`.
- **File**: `app/for-advisors/page.tsx`
- **Effort**: Medium (2–3 days for content + component)

---

### P2 — Significant friction

**[ADV-006] Advisor portal: mobile nav — 19 tabs in horizontal scroll**
- **Problem**: On mobile, 19 tab items in a scrollable nav are nearly unusable. Tabs like "Settings" and "Widgets" are hidden behind scroll.
- **Fix**: Collapse to top 7 tabs + "More…" dropdown (or switch to a sidebar drawer on mobile). Top 7 by usage: Dashboard, Leads, Profile, Analytics, Reviews, Billing, Articles.
- **File**: `app/advisor-portal/page.tsx` — nav section (lines 241–296)
- **Effort**: Medium (2 days)

**[ADV-007] Find-advisor quiz: no "why this advisor" explanation after matching**
- **Problem**: After the quiz, the matched advisor card shows name + rating but no explanation of why they were matched. Users don't know if it's a 60% or 99% match.
- **Fix**: Add a 3-bullet "Why we matched you" panel below the advisor card: `✓ Specialises in SMSF setup` / `✓ Located 3 km from you` / `✓ Available for new clients`.
- **File**: `app/find-advisor/page.tsx` — result card rendering (~lines 1459–1563)
- **Effort**: Medium (2–3 days, needs matching explainability data from API)

**[ADV-008] Find-advisor quiz: save progress in localStorage**
- **Problem**: Closing the browser mid-quiz loses all answers. Users who return start from scratch.
- **Fix**: After each step, serialize quiz answers to `localStorage['quiz-progress']`. On landing, check for saved progress and show "Resume your quiz" banner.
- **File**: `app/find-advisor/page.tsx` — step state management
- **Effort**: Small (1 day)

**[ADV-009] Advisor directory: empty-state filter chip hints**
- **Problem**: When filters return 0 results, the empty state says "Try adjusting your filters" but doesn't say which filters are active or offer one-click removal.
- **Fix**: Under the empty state heading, show chips for each active filter with an × to remove each one individually. "No results for: Type: Accountant × / State: VIC ×"
- **File**: `app/advisors/page.tsx` (AdvisorsClient) — EmptyState component wiring
- **Effort**: Small (1 day)

**[ADV-010] Advisor profile: no "table of contents" for long profiles**
- **Problem**: Long advisor profiles (profile + reviews + articles + case studies + similar advisors) require lots of scrolling. No sticky nav.
- **Fix**: Add a sticky "On this page" anchor nav (Profile / Reviews / Articles / Case Studies / Similar Advisors). Render only if the section exists.
- **File**: `app/advisor/[slug]/page.tsx`
- **Effort**: Small (1 day)

**[ADV-011] Advisor profile: reviews capped at 20, no "load more"**
- **Problem**: `reviews.limit(20)` — advisors with 50+ reviews only show 20. No indication of how many total reviews exist.
- **Fix**: Show "Showing 20 of 47 reviews — Load more" button. Lazy-fetch next page on click.
- **File**: `app/advisor/[slug]/page.tsx` — reviews fetch (line ~103–109)
- **Effort**: Small (1 day)

**[ADV-012] Community hub: vague "coming soon" copy**
- **Problem**: If community is in "launching soon" state, users see a placeholder with no timeline or notification signup.
- **Fix**: Either launch community (if ready) or add a notification signup ("Be the first to know when community launches → [email]") to capture intent.
- **File**: `app/community/page.tsx` — placeholder state
- **Effort**: Small (half day for notification CTA)

**[ADV-013] Teams: no "my teams" visibility on advisor profiles**
- **Problem**: If an advisor belongs to a team, their public profile doesn't link to it. Discoverability gap.
- **Fix**: In the advisor profile page, if `professional` has team memberships, render a "Part of [Team Name] →" section.
- **File**: `app/advisor/[slug]/page.tsx` — fetch team membership, render card
- **Effort**: Small-medium (1–2 days)

**[ADV-014] Advisor articles: no "share" or "save" actions on article page**
- **Problem**: No social share buttons or bookmarking on advisor articles. Users who want to share an insight have to manually copy the URL.
- **Fix**: Add a share row (Copy link / LinkedIn / Twitter/X / Email) below the article title. Use the native Web Share API with fallback buttons.
- **File**: article page component
- **Effort**: Small (half day)

**[ADV-015] Find-advisor quiz: OTP code expiry not communicated**
- **Problem**: When an OTP is sent, there's no timer showing when the code expires. Users may wait too long then see a confusing error.
- **Fix**: Show a countdown timer ("Code expires in 4:32") next to the OTP input. When expired, auto-show "Resend code" button.
- **File**: `app/find-advisor/page.tsx` — OTP stage (lines ~608–639)
- **Effort**: Small (half day)

---

### P3 — Polish / quick wins

**[ADV-016] Advisor directory: filter count badge on mobile "All filters" button**
- **Problem**: The mobile filter button shows just a sliders icon with a count badge (e.g., "3") but no labels. Users don't know which 3 filters are active.
- **Fix**: Show "Filters (3)" text on mobile too, removing `hidden sm:inline` from the label.
- **File**: `app/advisors/page.tsx` lines ~782–784
- **Effort**: Trivial (5 min)

**[ADV-017] For-advisors: FAQ doesn't address top objections**
- **Problem**: FAQ covers pricing mechanics but not: "What if I get spam leads?", "How long before first lead?", "Do you help with follow-up?"
- **Fix**: Add 3 more FAQ entries addressing the top sales objections.
- **File**: `app/for-advisors/page.tsx` — FAQ section (lines ~211–230)
- **Effort**: Trivial (content only)

**[ADV-018] Advisor portal: data refresh indicator / last-updated timestamp**
- **Problem**: No "Last updated: 2 minutes ago" or manual refresh button on the portal dashboard.
- **Fix**: Show a subtle "Updated X minutes ago" label near the leads count + a refresh icon.
- **File**: `app/advisor-portal/page.tsx` — DashboardTab
- **Effort**: Trivial (half day)

**[ADV-019] Advisor profile: "last updated" timestamp**
- **Problem**: Users don't know if the advisor's bio, fees, and availability are current.
- **Fix**: Show "Profile last updated: 3 months ago" below the advisor photo.
- **File**: `app/advisor/[slug]/page.tsx`
- **Effort**: Trivial (use `professionals.updated_at`)

**[ADV-020] Team creation: no preview before submit**
- **Problem**: Users fill in the team creation form but can't preview what the public team page will look like.
- **Fix**: Add a "Preview" button that opens a read-only modal showing the team profile as it will appear publicly.
- **File**: `app/teams/new/page.tsx` — TeamNewWizard
- **Effort**: Medium (2 days)

**[ADV-021] Article hub: add "sort by date / trending" filter**
- **Problem**: The articles hub shows articles in default order only. No "newest first" or "trending this week" filter.
- **Fix**: Add a sort select (Newest / Most views / Trending). Wire to existing `view_count` + `published_at` columns on `advisor_articles`.
- **File**: article hub page + API
- **Effort**: Small (1 day)

**[ADV-022] For-advisors: add urgency / scarcity signal**
- **Problem**: No mention of limited availability, founding cohort, or first-mover advantage.
- **Fix**: Add "X advisors joined this week" real-time counter (from `professionals` table) near the primary CTA. Optionally: "Founding member rate — applies to first 500 advisors".
- **File**: `app/for-advisors/page.tsx`
- **Effort**: Small (half day for counter, content decision needed for founding discount)

**[ADV-023] Advisor profile: credential verification display**
- **Problem**: Verified badge exists but doesn't show AFSL number, license year, or credential type.
- **Fix**: Expand the verified badge into a "Credentials" chip (hover/click reveals: "AFSL 123456 · Licensed since 2015 · Financial Planner"). Source from `professionals` table or `advisor_verifications`.
- **File**: `components/VerifiedAdvisorBadge.tsx` + profile page
- **Effort**: Medium (1–2 days)

---

## Resolved / Shipped

**[ADV-001]** Advisor portal: onboarding wizard — changed condition so checklist shows when `profileCompleteness` is null (new advisors), added local score fallback from advisor fields. `app/advisor-portal/DashboardTab.tsx`

**[ADV-002]** Advisor profile: primary booking CTA — added prominent teal "Book a Free Call" card in right sidebar before contact form when `booking_link` is set. `app/advisor/[slug]/AdvisorProfileClient.tsx`

**[ADV-003]** Advisor portal: silent API error handling — added `dataLoadError` state, error banner with "Try again" button, `dataLoadedAt` timestamp. `app/advisor-portal/page.tsx`

**[ADV-004]** ALREADY IMPLEMENTED — pagination existed at lines 1424-1437. Resolved (no change needed).

**[ADV-005]** For-advisors: testimonials section — added 3 advisor quote cards between "Who should apply" and FAQ. `app/for-advisors/page.tsx`

**[ADV-006]** Advisor portal mobile nav — top 7 tabs always visible, items 8+ hidden on mobile behind a "More…" dropdown. `app/advisor-portal/page.tsx`

**[ADV-007]** Find-advisor match explanation — added "Why we matched you" panel with 3 bullets (specialty, location, rating) in MatchConfirmation. `app/find-advisor/page.tsx`

**[ADV-008]** Quiz progress in localStorage — saves non-PII fields after each step, shows "Resume" banner on return. `app/find-advisor/page.tsx`

**[ADV-009]** Directory empty-state filter chips — individual clear chips for each active filter with one-click removal. `app/advisors/AdvisorsClient.tsx`

**[ADV-010]** Advisor profile anchor nav — "On this page" nav between hero and two-column layout with anchors to About/Credentials/Reviews/Articles/Contact. `app/advisor/[slug]/AdvisorProfileClient.tsx`

**[ADV-011]** Reviews load more — load-more button fetching next page via `/api/advisor-reviews-public`. `app/advisor/[slug]/AdvisorProfileClient.tsx`

**[ADV-012]** Community coming soon — email notification signup form with `CommunityNotifyForm` client component + API + migration. `app/community/page.tsx`

**[ADV-013]** Teams visibility on advisor profile — queries `expert_team_members` → `expert_teams` and renders "Part of [Squad] →" card. `app/advisor/[slug]/page.tsx` + `AdvisorProfileClient.tsx`

**[ADV-014]** Article share buttons — `ArticleShareRow` client component with Web Share API / copy / LinkedIn / X / Email. `app/article/[slug]/page.tsx` + `components/ArticleShareRow.tsx`

**[ADV-015]** OTP countdown timer — 5-minute countdown in Step 4 with colour change at <60s, prominent "Resend" button on expiry. `app/find-advisor/page.tsx`

**[ADV-016]** Mobile "All filters" label — removed `hidden sm:inline` so label shows on all screen sizes. `app/advisors/AdvisorsClient.tsx`

**[ADV-017]** For-advisors FAQ — added 3 FAQ entries addressing spam leads, first lead timeline, and follow-up support. `app/for-advisors/page.tsx`

**[ADV-018]** Portal refresh indicator — "Updated X minutes ago" + refresh button in DashboardTab header. `app/advisor-portal/DashboardTab.tsx`

**[ADV-019]** Advisor profile last-updated timestamp — "Profile last updated X ago" in follow strip. `app/advisor/[slug]/page.tsx`

**[ADV-020]** Team creation preview — added public preview card in Step 4 of TeamNewWizard showing the squad as it will appear. `app/teams/new/_components/TeamNewWizard.tsx`

**[ADV-021]** Article hub sort filter — added Newest / Most views / Trending sort selector in ArticlesClient. `app/articles/ArticlesClient.tsx`

**[ADV-022]** For-advisors urgency signal — pulsing "X advisors joined this week" counter near final CTA. `app/for-advisors/page.tsx`

**[ADV-023]** Credential verification display — "Verified" chip in advisor profile now shows AFSL number inline and expands to reveal full licence details on click. `app/advisor/[slug]/AdvisorProfileClient.tsx`

**[ADV-024]** Advisor portal mobile More dropdown — Briefs, Auctions, Marketplace, Expert Teams links added to the mobile "More…" dropdown alongside collapsed SPA tabs. `app/advisor-portal/page.tsx`

**[ADV-025]** Find-advisor quiz localStorage sync — `update()` callback now syncs localStorage on every call so step-back + intent change is always reflected on reload. `app/find-advisor/page.tsx`

**[ADV-026]** Article detail bottom share row — second `<ArticleShareRow>` added below the article body so readers don't need to scroll back up to share. `app/article/[slug]/page.tsx`

**[ADV-027]** Login mode-switch buttons enlarged and "Forgot password?" added — mode-switch buttons changed from `text-xs` (12px) to `text-sm` (14px) for legibility; `aria-pressed` added to all mode-switch buttons; "Forgot password? Use magic link" button added below password-mode controls. `app/advisor-portal/AdvisorPortalLogin.tsx`

**[ADV-028]** Wizard step 2 required-template hint — "Select at least one to continue" inline hint added to the scope-selection step so the disabled "Next" button is self-explanatory. `app/teams/new/_components/TeamNewWizard.tsx`

**[ADV-029]** Wizard step 3 empty-invite rows no longer block "Next" — `filledInvites` computed from non-empty rows, so partially-filled invite rows don't lock the user out. `app/teams/new/_components/TeamNewWizard.tsx`

**[ADV-030]** WCAG cursor sweep — `disabled:cursor-not-allowed` added to all disabled buttons/selects/inputs across 100+ components. `(bulk sed across app/)`

**[ADV-031]** Nav landmark aria-labels — `aria-label="Breadcrumb"` on all 260+ breadcrumb navs; named labels on portal sidebar, lesson, pagination, article TOC, and startup portal navs. `(bulk perl/sed across app/)`

**[ADV-032]** Focus ring completeness — `focus:ring-2` added to EventsTab select and StartupThesisClient inputs that only had `focus:outline-none`. `app/advisor-portal/EventsTab.tsx`, `app/account/startup-thesis/StartupThesisClient.tsx`

**[ADV-033]** role=alert on watchlist/digest toggle errors — two `<p>` error nodes got `role="alert"`. `app/account/watchlist/WatchlistAlertsToggle.tsx`, `DigestToggle.tsx`

**[ADV-034]** role=alert/status sweep — all remaining `{error && <p>}` and `{success && <span>}` blocks across 14 files now carry `role="alert"` / `role="status"`. `(bulk across app/)`

**[ADV-035]** Icon-only button aria-labels — four icon-only close/remove buttons got descriptive `aria-label`. `app/compare/_components/CompareSelectionBar.tsx`, `app/portfolio/PortfolioClient.tsx`, `app/quotes/[slug]/QuoteBidsClient.tsx`, `app/property/suburbs/SuburbsClient.tsx`

**[ADV-036]** `scope="col"` on all table headers — bulk perl sweep across 200+ `.tsx` files in `app/`; 1200+ `<th>` elements now declare column vs row scope. Duplicate/conflicting scope on multi-line `<th>` elements fixed.

**[ADV-037]** `aria-busy` on submit buttons — six forms that previously had no `aria-busy` now set it during async submission. `app/account/investor-profile/InvestorProfileForm.tsx`, `app/account/upgrade/business/BusinessUpgradeForm.tsx`, `app/broker-portal/register/page.tsx`, `app/broker-portal/settings/page.tsx`, `app/advisor-portal/TeamTab.tsx`.

**[ADV-038]** role=status on success feedback + autoComplete — `role="status"` on 9 more saved-state paragraphs/spans across advisor portal, broker portal, billing, ops settings, startup thesis. `autoComplete="email"` on advisor TeamTab email inputs.

**[ADV-039]** `aria-sort` on all sortable tables — six screener/compare tables now declare `ascending`/`descending`/`none` on sortable column headers. `ETFScreenerClient`, `ETFCompareClient`, `SuperCompareClient`, `SuburbsClient`, `BenchmarkClient`, `LicScreenerClient`, `PricingClient`.

**[ADV-040]** Tab/toggle ARIA semantics — `role="tablist"` + `role="tab"` + `aria-selected` on advisor portal nav and scenario planner. `role="group"` + `aria-pressed` on broker analytics, reports, and dashboard period toggles.

**[ADV-041]** `autoComplete="tel"` on all phone inputs — 9 phone inputs across broker-portal, property enquiry forms, invest listing, for-advisors, quotes/post, briefs, and org-portal now declare `autoComplete="tel"` for mobile autofill.

**[ADV-042]** `<fieldset>/<legend>` on radio groups — five radio-button groups (`WholesaleCertClient`, `WidgetBuilderTab`, broker packages cancel dialog, borrowing power loan term, ETP age) converted from unlabeled div wrappers to semantic `<fieldset>/<legend>`.

**[ADV-043]** `aria-expanded` + `aria-haspopup` on disclosure buttons — advisor portal mobile "More…" dropdown now declares `aria-expanded={moreNavOpen}` and `aria-haspopup="menu"`. `app/advisor-portal/page.tsx`

**[ADV-044]** `aria-pressed` on widget builder toggles — Theme, Layout, and Rows toggle button groups in `WidgetBuilderTab` now carry `aria-pressed` and `role="group"` with labelled by IDs. `app/advisor-portal/WidgetBuilderTab.tsx`

**[ADV-045]** `aria-hidden-focus` in FloatingRightCTA — `tabIndex={-1}` added to the Link and dismiss button when the CTA is scrolled out of view, preventing keyboard focus on aria-hidden elements. `components/FloatingRightCTA.tsx`

**[ADV-046]** `definition-list` spec compliance in HubHero stats — `<p>` subtitle/source elements inside `<dl>/<div>` groups changed to `<dd>` (the only valid element inside a `<dl>/<div>` group). `components/HubHero.tsx`

**[ADV-047]** `autoComplete="email"` on 4 more invite inputs + `type="search"` on articles — AdvisorsClient alert email, TeamTab invite+firm email, ReviewsTab review invite, TeamsManagerClient invite now declare `autoComplete="email"`; ArticlesClient search changed from `type="text"` to `type="search"`.

**[ADV-048]** `aria-pressed` on compare feature toggle buttons and interest pill buttons — CompareClient feature filter toggles and ProfileClient InterestPill now declare `aria-pressed` so screen readers announce checked/unchecked state.

**[ADV-049]** Invalid `role="tablist"` on jump-link navs replaced with `<nav>` — 7 invest sector pages (lithium, uranium, royalties, hydrogen, oil-gas, income-assets, pre-ipo) used `role="tablist"` on anchor-link navs; replaced with `<nav aria-label="Ways to invest">`.

**[ADV-050]** `role="alert"` on error message containers in 6 account pages — ReferralsClient, SavedComparisonsClient, WatchlistClient, SavedSearchesClient, StartupThesisClient, AlertsClient error blocks now announce via `role="alert"` for screen readers.

**[ADV-051]** `role="alert"` on error blocks in 10 advisor/broker portal pages — broker-portal campaigns, login, register; advisor-portal CaseStudiesTab, EventsTab, ProfileDetailsTab, BriefsInboxClient, TeamsManagerClient, WebhooksClient.

**[ADV-052]** `role="alert"` sweep across 25 additional user-facing pages — advertise/packages, advertise/featured-placement, community/thread, for-advisors/sponsored, invest/list, auth/reset-password, wholesale-cert, briefs (BookConsultationPanel, IntakeAnswerForm, BriefForm), pros (connect, availability, pricing-tier, intake questions), quotes/JobPostForm, events/RsvpButton, startup-portal (round/new, esic-verification), startup-signup, account/holdings, account/alerts PushOptIn, teams (new wizard, ops settings), firm-portal/performance, org-portal login. All error display elements now announce to screen readers.
