# UX Backlog

Strategic UX improvements identified during bot sweeps, code audits, and UX reviews.
Each entry has a priority tier (P1 = blocks revenue / compliance, P2 = significant friction, P3 = polish), effort estimate, and source.

---

## A11y — 2026-06-07 sweep

### P1 — High impact, requires design decision

**[ADV-057] WCAG AA color-contrast: 542 violations — `text-slate-400` on white**
- **Problem**: `text-slate-400` (#94a3b8) on white = 3.07:1 ratio — fails WCAG AA (needs 4.5:1 for normal text). Bot sweep found 542 serious violations; all are this token. 2692 usages in app/.
- **Fix**: Design decision: change the "muted secondary text" token from `slate-400` to `slate-500` (#64748b = 4.54:1 ratio). Pure icon uses (aria-hidden) don't need changing. Requires visual review of key pages to confirm hierarchy is preserved. Founder sign-off needed on the visual redesign impact.
- **Effort**: Medium (half day of systematic find/replace + visual QA)

---

## Advisor Features (2026-06-06 audit)

> **2026-06-08 status check**: ADV-001 through ADV-023 below have all been implemented and verified in the codebase. Items remain listed here for historical reference. ADV-057 is blocked pending founder sign-off; ADV-167 remains deprioritized.

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

**[ADV-056]** `autoComplete="name"` on advisor contact + buyer-agent contact forms; `autoComplete="email"` on broker-portal register and buyer-agent contact form. Auth, login, signup, and complaints already had it.

**[ADV-055]** `aria-label` on 6 icon-only ✕/× close buttons — EventsTab (×2), advisor portal dispute modal, CaseStudiesTab, portfolio calculator remove holding, LIC screener close.

**[ADV-054]** `role="dialog"` + `aria-modal="true"` on 6 modal overlays — VaultClient upload, advisor-portal dispute, EventsTab RSVP, DataRoomClient upload, broker-portal packages confirm, org-portal OrgEventsTab edit/delete now declare proper dialog semantics with `aria-labelledby` for screen-reader title announcements.

**[ADV-053]** Skip link focus + broker portal main landmark — `tabIndex={-1}` added to root `<main id="main-content">` so anchor-link focus works in Safari; broker portal layout gained its own skip link + `id="main-content"`. `components/LayoutShell.tsx`, `app/broker-portal/layout.tsx`

**[ADV-052]** `role="alert"` sweep across 25 additional user-facing pages — advertise/packages, advertise/featured-placement, community/thread, for-advisors/sponsored, invest/list, auth/reset-password, wholesale-cert, briefs (BookConsultationPanel, IntakeAnswerForm, BriefForm), pros (connect, availability, pricing-tier, intake questions), quotes/JobPostForm, events/RsvpButton, startup-portal (round/new, esic-verification), startup-signup, account/holdings, account/alerts PushOptIn, teams (new wizard, ops settings), firm-portal/performance, org-portal login. All error display elements now announce to screen readers.

**[ADV-060]** Escape key closes all `role="dialog"` modals — 9 modal backdrops got `onKeyDown` handlers that dismiss on Escape. Covers VaultClient upload, advisor-portal dispute, EventsTab RSVP, DataRoomClient upload, broker-portal packages confirm, OrgEventsTab edit + delete, QuoteBidsClient compare drawer, ReferDialog. Matches ARIA authoring practices dialog pattern.

**[ADV-059]** Loading spinner a11y sweep across 28 files — every `animate-spin` element in `app/` and `components/` annotated. Standalone spinners (no adjacent text) got `role="status" aria-label="Loading"` so screen readers announce loading state; spinners next to visible text got `aria-hidden="true"` to prevent double-announcement; in-field lookup spinners got `role="status" aria-label="Looking up location"`. Files: advisor-portal (BadgesTab, AnalyticsTab, TeamTab, ReviewsTab, page), advisor-apply, advisor/[slug], quiz (AdvisorResultsScreen, AdvisorMatchedScreen, AdvisorLocationStep), find-advisor, review/[token], review/broker/[token], insurance/quiz, invest/list, quotes/JobPostForm, briefs/BriefForm, get-matched/AnalyzingScreen, org-portal, teams/accept-invite, pros/join, admin/AdminAuthGuard, account (AccountClient, ManualBalancesPanel), ExitIntentBrokerMatch, AdvisorFeeOpinionButton, CalculatorExplainButton.

**[ADV-061]** Password show/hide toggle on all sign-in/sign-up forms — eye-icon toggle added to advisor portal login (magic/password/signup modes), broker portal login, broker portal registration (separate toggles for password and confirm-password fields), and startup signup. Eliminates guesswork when typing masked passwords. `app/advisor-portal/AdvisorPortalLogin.tsx`, `app/broker-portal/login/page.tsx`, `app/broker-portal/register/page.tsx`, `app/startup-signup/page.tsx`

**[ADV-062]** WCAG 1.3.1 label-control `htmlFor`/`id` associations across 13 form pages — sibling `<label>` elements without `htmlFor` are a Level A violation (screen readers can't programmatically associate label to control). Fixed 70+ label/control pairs: alerts (6), vault (3), advisor profile-details (11), course builder (6), events (8), case studies (6), team/firm (9), broker settings (6), job-post form (7), brief form (8), data room (2), org-events (9), advisor-apply (9). Controls now have matching `id` attributes so AT announces correct context on focus.

**[ADV-063]** WCAG 1.3.1 label sweep batch 2 — 8 more form pages: advisor-apply short bio/website/fee (3), startup-thesis min/max ticket (2), term-deposits 6 fields, advisor portal ProfileTab 9 fields, CourseBuilderTab 7 fields, ReviewsTab invite name+email, lists title+description, advertise packages category.

**[ADV-064]** WCAG 1.3.1 label sweep batch 3 — 7 more pages: advisor-portal main page (dispute details, 6 article fields), EventsTab description, TeamTab seat request, TeamsManagerClient 5 fields, BenchmarkClient 2 selects, broker ab-tests 4 fields, broker campaigns edit 7 fields.

**[ADV-065]** WCAG 1.3.1 label sweep batch 4 — 6 broker-portal pages: login 2, register 8, support 4, creatives 2, deals 4, settings alert threshold.

**[ADV-066]** WCAG 1.3.1 label sweep batch 5 — 6 public-facing pages: find-advisor OTP code, quiz AdvisorResultsScreen (name/phone/email), for-advisors sponsored form (5), ScenarioPlannerClient auto-id InputField, health-scores platform select, switch current/target ASX fee.

**[ADV-067]** WCAG 1.3.1 label sweep batch 6 — 11 calculator and tool pages: reviews/write (title, body), CGT calculator (4 inputs), FHSS calculator (3 range sliders), startup-portal round/new (9 fields), ESIC verification (3 fields), compound-interest calculator (4 inputs), dividend-reinvestment calculator (5 inputs), debt calculator (4 per-row + consolidation rate), FIRE calculator (6 inputs), fee-impact calculator (useId() on InputField+SelectField), embed builder (8 selects).

**[ADV-068]** WCAG 1.3.1 label sweep batch 7 (admin pages) — 17 admin pages: broker-transfer-guides (8 fields), calculator-config (4 fields), consultations (13 fields), content-calendar (14 fields), export-import (1 field), health-scores (14 fields), quarterly-reports (10 fields), marketplace/packages (6 fields), marketplace/placements (3 fields), moderation (1 field), pro-deals (12 fields), quiz-questions (2 fields), regulatory-alerts (11 fields), site-settings (dynamic htmlFor={field.key}), team-members (11 fields), bd-pipeline (11 fields), automation/dry-run DryRunForm (2 fields).

---

## UX / UI / Feature sweep — 2026-06-07

Sourced from a parallel code-review sweep across 7 feature areas (69 compiled findings after dedup). ADV-069 onwards.
All items ADV-070 through ADV-178 are shipped — see Resolved section below. Remaining open items:

---

### P3 — Polish (deprioritised)

**[ADV-167]** Article comments: Flat list with no threading — `components/ArticleComments.tsx` — **Effort**: Very large (deprioritised — out of scope until community launch)

---

## Resolved / Shipped — 2026-06-07 UX sweep

**[ADV-069]** Homepage: above-the-fold restructure fully shipped — hero + 4 route cards always visible without scroll; all async teasers (HomeFeedSection, HomepagePersonalisedStrip, HomeListingsTeaser, HomeAdvisorsTeaser) sit below the fold. `app/page.tsx`

**[ADV-139]** Dividend Reinvestment: Added SVG crossover line chart showing DRP vs Cash total wealth over time, with shaded advantage area; also added `cashTotalWealth` (portfolio + cumulative dividends) to snapshot data for accurate comparison. `app/dividend-reinvestment-calculator/DividendReinvestmentClient.tsx`

**[ADV-179]** Articles hub missing filter categories (reviews, etfs, super, property, crypto) — added to CATEGORIES array + CATEGORY_COLORS. `app/articles/ArticlesClient.tsx`

**[ADV-180]** Invest page: General Advice Warning collapsed by default — changed `<details>` to `<details open>`. `app/invest/page.tsx`

**[ADV-181]** Compare page intro: Dense single sentence — broken into 3 shorter sentences. `app/compare/page.tsx`

**[ADV-182]** Advisors page: GetMatched embed had no context copy — added "Not sure which advisor you need? Get matched in 60 seconds." `app/advisors/AdvisorsClient.tsx`

**[ADV-183]** Advisors page: Filter section had no heading — added "Narrow by type, location, and fees — or search by name." `app/advisors/AdvisorsClient.tsx`

**[ADV-184]** Debt Calculator: "Send Plan" button had no loading/disabled state — added `emailSending` state + "Sending…" text. `app/debt-calculator/DebtCalculatorClient.tsx`

**[ADV-185]** Debt Calculator: No success message after email submit — added "Plan sent to your inbox!" banner with 2s delay. `app/debt-calculator/DebtCalculatorClient.tsx`

**[ADV-186]** Account page: Portal error appeared below the button group — moved above the button group. `app/account/AccountClient.tsx`

**[ADV-187]** Quotes post: Budget dropdown had no context — added "Total project budget. SOA from ~$1,500 · Hourly from ~$250/hr" helper text. `app/quotes/post/JobPostForm.tsx`

**[ADV-188]** Quotes post: 30-char requirement had no explanation — updated copy to "specific descriptions attract better quotes from advisors". `app/quotes/post/JobPostForm.tsx`

**[ADV-189]** Watchlist empty state: Didn't explain how to add items — updated body to explain the heart button mechanic. `app/account/watchlist/WatchlistClient.tsx`

**[ADV-190]** Advisor Apply hero benefits: Generic copy — updated to outcome-focused descriptions. `app/advisor-apply/page.tsx`

**[ADV-191]** Invest page sector cards: No CTA text — added "Browse {category} →" label to each card. `app/invest/page.tsx`

**[ADV-192]** WCAG 1.3.1 label sweep batch 8 (admin — final) — 14 admin-area files: marketplace/support (status + priority filters), marketplace/funnel (broker A + B), professionals/queue (reject-reason textarea), afsl-register (CSV upload), quiz-weights (sim inputs + pre-existing exhaustive-deps), quiz-questions (orphan options span), country-rule-alerts (country filter), country-schemes (country filter), placement-experiments (status filter), advisor-signup (orphan specialties → `<p>`), admin/brokers (Field/TextArea labels), admin/finance (8 transaction modal fields), marketplace/placements (5 form fields), courses/[slug] (27 fields across 3 sections). Courses admin page (13 fields + immutability suppress) completed as final commit `93817590`. Zero sibling-label violations remain across `app/`.

**[ADV-076]** FIRE Calculator — Goal saved state upgraded to prominent green toast (rounded card, "✓ Goal saved" + "View dashboard" link) that auto-dismisses after 4s. `app/fire-calculator/FireCalculatorClient.tsx`

**[ADV-073]** FIRE Calculator — Error state gains Retry + dismiss (✕) buttons; auto-dismisses after 8s. `app/fire-calculator/FireCalculatorClient.tsx`

**[ADV-077]** FeeSimulatorClient — Replaced `alert("Link copied!")` with a `<p role="status">` inline toast that auto-dismisses after 2s. `app/fee-simulator/FeeSimulatorClient.tsx`

**[ADV-093]** HoldingsClient — Price "—" cell now carries `title` attr explaining unavailability (invalid ticker / unsupported exchange / data issue). `app/account/holdings/HoldingsClient.tsx`

**[ADV-072]** CompoundInterestClient — Save button shows "Saved ✓" for 2s (disabled during flash) after localStorage write. `app/compound-interest-calculator/CompoundInterestClient.tsx`

**[ADV-088]** Broker dashboard — "This Week vs Last Week" renamed to "Last 7 days vs previous 7 days" with explicit date range subtitle computed client-side. Metric-card labels updated to "vs prev 7 days". `app/broker-portal/page.tsx`

**[ADV-131]** Advisors page — Removed duplicate alert signup widget from inside EmptyState; the standalone widget below results already handles this. `app/advisors/AdvisorsClient.tsx`

**[ADV-114]** ArticleShareRow — Added WhatsApp and Facebook share links alongside existing LinkedIn/X/Email/copy-link buttons. `components/ArticleShareRow.tsx`

**[ADV-075]** TaxOptimizerClient — Marginal tax rate label gets InfoTip: "ATO Stage 3 rates 2024–25 including Medicare levy." `app/tax-optimizer/TaxOptimizerClient.tsx`

**[ADV-091]** GoalsClient — Target date validated client-side before API call; if date ≤ today returns "Target date must be in the future." `app/account/goals/GoalsClient.tsx`

**[ADV-095]** AccountClient — Saved comparisons count: non-ok response, network error, and 3s timeout all now set count to 0 instead of leaving "Loading…" indefinitely. `app/account/AccountClient.tsx`

**[ADV-109]** DashboardTab — "Enquiries Per Week" section always rendered; empty state "No enquiries yet — they'll appear here once investors reach out." shown when no data. `app/advisor-portal/DashboardTab.tsx`

**[ADV-111]** Academy empty state — "Browse guides →" CTA linking to /articles added below the "Check back soon" copy. `app/academy/page.tsx`

**[ADV-103]** TeamTab — Seat request input shows inline amber validation "Must be more than your current limit ({N} seats)" when value ≤ current max. `app/advisor-portal/TeamTab.tsx`

**[ADV-106]** LeadsTab — "Hot leads only" button gets InfoTip: "Quality score 70+ — investors who provided more detail and showed higher intent." `app/advisor-portal/LeadsTab.tsx`

**[ADV-108]** LeadsTab — Notes input onBlur shows "Saving…" / "Saved" (2s) inline indicator per lead ID. `app/advisor-portal/LeadsTab.tsx`

**[ADV-119]** Broker register success — Added "Preview placements →" secondary CTA alongside "Back to Login"; copy updated to mention approval → login → first campaign flow. `app/broker-portal/register/page.tsx`

**[ADV-130]** Compare page reordered: H1 → intro → GetMatchedEmbed. GetMatched no longer appears before the page title. `app/compare/page.tsx`

**[ADV-128]** For-Advisors — Stats band (advisor count, lead count, 9 categories) moved from after Pricing to immediately below the hero. `app/for-advisors/page.tsx`

**[ADV-129]** For-Advisors pricing — "Most Popular" Pay Per Lead card upgraded: gradient bg (violet-50 → indigo-50), md:scale-[1.03], stronger badge with ★ and shadow, heavier button shadow. `app/for-advisors/page.tsx`

**[ADV-081]** A/B Tests — End and Declare Winner now open a confirmation modal (cancel + confirm) instead of native `confirm()`. Modal copy explains what will be locked in. `app/broker-portal/ab-tests/page.tsx`

**[ADV-086]** Broker portal — Budget-exhausted campaigns show "Increase Budget →" link (to /broker-portal/packages) beneath the budget bar. `app/broker-portal/page.tsx`

**[ADV-092]** HoldingsClient — Ticker input validates format (e.g. BHP.AX / AAPL) client-side before API call; invalid formats surface "Enter a valid ticker (e.g. BHP.AX or AAPL)." `app/account/holdings/HoldingsClient.tsx`

**[ADV-094]** HoldingsClient — Stale price indicator gains a warning triangle SVG icon alongside the "stale price" text. `app/account/holdings/HoldingsClient.tsx`

**[ADV-096]** GoalsClient — If current balance > target, submit is blocked with "Current balance exceeds target — consider increasing the target amount." `app/account/goals/GoalsClient.tsx`

**[ADV-101]** SettingsTab — Session pricing input replaced with a skeleton loader (animated placeholder divs) while the price data loads. `app/advisor-portal/SettingsTab.tsx`

**[ADV-120]** Quotes job-post form — Trust banner added at the top of step 1: "Free, no obligation · AFSL-licensed advisors only · Compare up to 5 quotes · Reply within 72 hours." `app/quotes/post/JobPostForm.tsx`

**[ADV-121]** Quotes success screen — Secondary CTA changed from "Browse the marketplace" to "Share with an advisor you know" (mailto link). Timeline added: "Expect quotes within 24–72 hours." `app/quotes/post/JobPostForm.tsx`

**[ADV-122]** Get Matched quiz — Progress strip shows "~N min remaining" alongside step count on both mobile and desktop (computed at 20s/step). `app/get-matched/GetMatchedClient.tsx`

**[ADV-148]** Broker portal campaign list — Status dots and badges now carry `title` tooltips explaining each status. `budget_exhausted` gets a distinct red badge. `app/broker-portal/page.tsx`

**[ADV-151]** GoalsClient — "Current" and "Monthly" stat cells show "—" when the value is zero, avoiding the misleading "$0" display. `app/account/goals/GoalsClient.tsx`

**[ADV-152]** NotificationsList — "Mark all as read" shows a 2.5s "All marked as read" flash confirmation after success. `app/account/notifications/NotificationsList.tsx`

**[ADV-153]** ManualBalancesPanel — Amount label updated to "Amount (AUD, e.g. 25000)" with placeholder simplified to "25000". `app/account/net-worth/ManualBalancesPanel.tsx`

**[ADV-155]** WatchlistAlertsToggle — Toggle button carries `title="Add watchlist items first to enable alerts"` when disabled due to empty watchlist. `app/account/watchlist/WatchlistAlertsToggle.tsx`

**[ADV-158]** Net worth goal progress — Always shows a percentage label below the bar. 0% includes "add funds to start tracking progress". `app/account/net-worth/page.tsx`

**[ADV-071]** Portfolio X-Ray: adding a holding with invalid input now shows inline per-field validation messages via `addError` state; `<p role="alert">` displays the error. `app/portfolio-xray/XRayClient.tsx`

**[ADV-133]** X-Ray: Status line "`N` holdings added. Ready to analyse?" rendered between holdings list and Analyse button. `app/portfolio-xray/XRayClient.tsx`

**[ADV-084]** Analytics: Skeleton guard now preserves existing stats during re-fetch; date-range buttons disabled and labeled "Loading…" while fetching. `app/broker-portal/analytics/page.tsx`

**[ADV-143]** Analytics CSV export: Toast "CSV export started" fires after `downloadCSV()`. `app/broker-portal/analytics/page.tsx`

**[ADV-085]** Edit campaign: Live-campaign lock icon (amber for live) + descriptive text added to read-only start-date display. `app/broker-portal/campaigns/[id]/edit/page.tsx`

**[ADV-087]** Dayparting: Requires both start and end hours; real-time preview text shows e.g. "9:00 AM – 5:00 PM". `app/broker-portal/campaigns/new/page.tsx`

**[ADV-144]** Campaign form: Required fields marked with red `*`; optional fields labeled "(optional)". `app/broker-portal/campaigns/new/page.tsx`

**[ADV-147]** Creatives: Copy URL button shows per-button "Copied!" for 2s then resets. `app/broker-portal/creatives/page.tsx`

**[ADV-156]** Health scores: Dimension scores of 0 render "—" (grey) with tooltip "No data yet"; score bar uses grey for zero. `app/account/health/page.tsx`

**[ADV-154]** Net worth: "X of Y holdings priced" label wrapped in `<span title="...">` tooltip explaining live/cached market price. `app/account/net-worth/page.tsx`

**[ADV-157]** Goals: Submit button shows spinner SVG inline while "Adding…". `app/account/goals/GoalsClient.tsx`

**[ADV-134]** CGT Calculator: "✓ Updated" micro-badge flashes for 1.5s after any input change (deferred via `setTimeout` to satisfy `react-hooks/set-state-in-effect`). `app/tools/cgt-calculator/CGTCalculatorClient.tsx`

**[ADV-161]** EarnTab: Zero-referral onboarding card (amber-50) with 🚀 and explanation copy shown when `total_referred === 0`. `app/advisor-portal/EarnTab.tsx`

**[ADV-102]** Team analytics: spinner replaced with layout-matching skeleton (4-col stat grid + bar placeholder, animate-pulse) while `firmAnalytics` loads. `app/advisor-portal/TeamTab.tsx`

**[ADV-132]** Homepage: ResumeBanner and GetMatchedEmbed moved into separate `<section>` elements so returning users see the resume prompt without it visually merging with the quiz embed. `app/page.tsx`

**[ADV-136]** Fee Simulator: middle tick labels (50/100, $10k/$25k, 50%) hidden on mobile (`hidden sm:inline`) so only min/max labels show on narrow viewports. `app/fee-simulator/FeeSimulatorClient.tsx`

**[ADV-162]** Dashboard leaderboard ranked card: `bg-teal-50 border-teal-200` replaces generic `bg-slate-50 border-slate-200`, matching the teal award icon and making a ranked position visually distinctive. `app/advisor-portal/DashboardTab.tsx`

**[ADV-164]** Billing outstanding card: conditional "Pending — see payment history" link shown when `pendingBilledCents > 0`, giving advisors a direct action path. `app/advisor-portal/BillingTab.tsx`

**[ADV-173]** Broker register slug field: helper text now explains URL identifier format (lowercase, numbers, hyphens), gives a worked example (`commsec`), and notes the auto-generate fallback. `app/broker-portal/register/page.tsx`

**[ADV-175]** Compare H1: "— Fees, Features & Safety" appended to align the heading with the meta description that already mentions safety. `app/compare/page.tsx`

**[ADV-112]** Community: anticipated forum category cards (Shares/ETFs, Property, SMSF, Crypto, Super, Financial Planning) shown above the waitlist so visitors understand what they're signing up for. `app/community/page.tsx`

**[ADV-116]** RelatedContentGrid: 4-item curated fallback (How to start investing, ETFs vs shares, Best platforms, Super guide) rendered when no DB matches, preventing content dead ends. `components/RelatedContentGrid.tsx`

**[ADV-160]** SettingsTab Slack integration: restructured with numbered setup steps and a "Test connection" button that fires `POST /api/advisor-portal/slack-settings/test` and shows success/failure inline for 5s. New API route includes rate-limiting (5/advisor/20 min) and Zod validation. `app/advisor-portal/SettingsTab.tsx`

**[ADV-165]** Academy: breadcrumb reflects active category depth — "Academy" alone when on root, "Academy / {Category}" when a category filter is active. `app/academy/page.tsx`

**[ADV-166]** ArticleShareRow: 150ms scale press-effect on all share buttons (copy, LinkedIn, X, email, WhatsApp, Facebook, print) via `usePressEffect` hook. `components/ArticleShareRow.tsx`

**[ADV-168]** Authors empty state: replaced "Team profiles coming soon" with "Are you a financial adviser or investing expert?" heading + 50,000-investor context copy + "Apply to write →" CTA linking to /contact. `app/authors/page.tsx`

**[ADV-169]** Article print view: `@media print` CSS (via `<style>` child) hides nav, ads, comments, sidebar; URL printed as `::after` content on a hidden `#article-print-url` element. `components/ArticleShareRow.tsx`

**[ADV-170]** Article: `ArticleReadingProgress` bar at top of viewport scrolls with the user, showing reading completion as a teal fill. `app/article/[slug]/page.tsx`

**[ADV-172]** About page: "Explore our research" section with 3 category link cards (ETFs, Tax & Investing, Beginner's Corner) added above the team grid. `app/about/page.tsx`

**[ADV-176]** Advisors cards: 🌏 emoji replaced with `<Icon name="globe" size={9} />` in the Intl eligibility badge, making it consistent with the rest of the icon system. `app/advisors/AdvisorsClient.tsx`

**[ADV-074]** XRay + TaxOptimizer: Edit icon re-populates add form with current holding values; Cancel button exits edit mode. `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`

**[ADV-078]** XRay + TaxOptimizer + DebtCalculator: Required fields marked `*`; optional fields labeled "(optional)". Form-level note added. `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`, `app/debt-calculator/DebtCalculatorClient.tsx`

**[ADV-079]** Broker portal new campaign: redirect to /broker-portal delayed 2s after success toast so user reads the confirmation. `app/broker-portal/campaigns/new/page.tsx`

**[ADV-080]** Broker portal: "Save as Template" replaced native `prompt()` with a modal dialog containing a labelled name input, char count, and validation. `app/broker-portal/campaigns/new/page.tsx`

**[ADV-082]** Broker portal creatives: Image URL validated before save (HTTPS, image extension or CDN pattern); error toast if image fails to load. `app/broker-portal/creatives/page.tsx`

**[ADV-083]** Broker portal creatives: Delete confirmation modal with creative name + post-delete name toast instead of native `confirm()`. `app/broker-portal/creatives/page.tsx`

**[ADV-089]** AccountClient: After subscription-processing banner resolves, replaced with "Your subscription is now active. Premium features are enabled." green flash. `app/account/AccountClient.tsx`

**[ADV-090]** AccountClient: Refund success copy updated to "Expect the amount back within 5–10 business days." `app/account/AccountClient.tsx`

**[ADV-097]** AnalyticsTab: "Article Performance" heading conditionally rendered — hidden when advisor has no articles. `app/advisor-portal/AnalyticsTab.tsx`

**[ADV-098]** DashboardTab: Lead rows expand on click to show inline quick-actions (view profile, go to Leads tab). `app/advisor-portal/DashboardTab.tsx`

**[ADV-099]** LeadsTab: "Your Lead Account" card — primary status line is colour-coded (green = credits, amber = free-leads, red = exhausted). `app/advisor-portal/LeadsTab.tsx`

**[ADV-100]** ProfileDetailsTab: Adding a service or certification flashes a 2s green "Added ✓" highlight on the new row. `app/advisor-portal/ProfileDetailsTab.tsx`

**[ADV-105]** ProfileDetailsTab: Specialisations and Languages fields unified as searchable combo-boxes (type to filter, click chip to add, × to remove). `app/advisor-portal/ProfileDetailsTab.tsx`

**[ADV-107]** DashboardTab: Profile completeness fields stack vertically on mobile (`flex-col`) and wrap horizontally on sm+ (`sm:flex-row sm:flex-wrap`). `app/advisor-portal/DashboardTab.tsx`

**[ADV-110]** AnalyticsTab: "Tips to Improve" section always rendered; shows next-level growth tips when advisor is fully optimised. `app/advisor-portal/AnalyticsTab.tsx`

**[ADV-113]** ArticlesClient: No-results state shows trending articles and "Browse all articles" reset CTA. `app/articles/ArticlesClient.tsx`

**[ADV-117]** Advisor Apply: Photo upload moved from the top of the form to just before the submit button; helper text updated to "Almost done — add a headshot photo". `app/advisor-apply/page.tsx`

**[ADV-123]** Advertise page: Tier small-print added per placement — minimum spend, billing terms, rate/CPC note. `app/advertise/page.tsx`

**[ADV-124]** Advertise page: Placement cards show "Best for: …" guidance and "Avg CTR: N%–M%" estimate. `app/advertise/page.tsx`

**[ADV-125]** Advisors: GetMatched embed is correctly positioned between the hero stats and the filter/results UI. `app/advisors/AdvisorsClient.tsx`

**[ADV-135]** Compound interest, FIRE, and fee simulator calculators: "Reset to defaults" button added to the inputs panel header. DebtCalculatorClient already had this (with confirmation). `app/compound-interest-calculator/CompoundInterestClient.tsx`, `app/fire-calculator/FireCalculatorClient.tsx`, `app/fee-simulator/FeeSimulatorClient.tsx`

**[ADV-137]** DebtCalculatorClient: Removing a debt shows a 5s undo toast with the debt type name, allowing recovery without re-entry. `app/debt-calculator/DebtCalculatorClient.tsx`

**[ADV-138]** CompoundInterestClient: Save button has `id="ci-save"` anchor so the results section link scrolls directly to it on mobile. `app/compound-interest-calculator/CompoundInterestClient.tsx`

**[ADV-140]** XRayClient: Broker selector label updated to "Your current broker (optional — see fee-switching savings)". `app/portfolio-xray/XRayClient.tsx`

**[ADV-141]** Edit campaign: Active hours selects disable earlier end-hour options — inline error "End hour must be after start hour" prevents invalid ranges. `app/broker-portal/campaigns/[id]/edit/page.tsx`

**[ADV-146]** ROI Estimator: "Typical LTV: $500–$2,000 · Avg CPL: $25–$80" hint shown below the customer-value input. `app/broker-portal/campaigns/new/page.tsx`

**[ADV-149]** Broker portal creatives: Active/inactive toggle has a per-creative loading state; button disabled while API call is in flight. `app/broker-portal/creatives/page.tsx`

**[ADV-150]** Edit campaign: Changed-fields summary sentence shown above the save button listing which fields were modified. `app/broker-portal/campaigns/[id]/edit/page.tsx`

**[ADV-159]** LeadsTab: Pipeline stage `<option>` elements carry `title={s.description}` so hovering reveals plain-English stage meanings. `app/advisor-portal/LeadsTab.tsx`

**[ADV-163]** AnalyticsTab: "Not enough peers" benchmark section shows a "Notify me" button; on click, shows toast confirming notification will fire when cohort reaches 5+. `app/advisor-portal/AnalyticsTab.tsx`

**[ADV-069]** Homepage: Three route cards (Compare / Advisors / Invest) added below the hero giving first-time visitors a clear guided path. `app/page.tsx`

**[ADV-126]** Invest marketplace: GetMatched embed moved to immediately after the hero, before listings. `app/invest/page.tsx`

**[ADV-127]** For-Advisors: 6 competing CTAs consolidated to 2 primaries ("Apply to join →" / "See how it works"). `app/for-advisors/page.tsx`

**[ADV-174]** Quotes post: Pre-filled fields highlighted with `border-blue-200 bg-blue-50 ring-1 ring-blue-200` when seeded from the quiz. `app/quotes/post/JobPostForm.tsx`

**[ADV-177]** For-Advisors: User-facing "How to Choose" guides replaced with advisor-perspective "What Investors Look for in an Advisor" section. `app/for-advisors/page.tsx`

**[ADV-178]** Academy: "Read our CPD guides" sidebar section with 4 curated article links added. `app/academy/page.tsx`

**[ADV-070]** Broker Register: Collapsible pricing preview ("Pricing preview — from $299/month") shown before step 2, with full tier grid in the final review step so brokers can evaluate ROI before committing. `app/broker-portal/register/page.tsx`

**[ADV-104]** BillingTab: "Boost Visibility" cards each lead with a one-line outcome benefit ("Avg. 3× more profile views & priority in search" / "Builds E-E-A-T authority & ranks on Google"). `app/advisor-portal/BillingTab.tsx`

**[ADV-115]** Article page: "Save" bookmark button added alongside the share row. Toggles via `POST /api/bookmarks/toggle` with `type="article"`; checks existing bookmark state on mount via `GET /api/bookmarks/toggle?type=article&ref=slug`; filled violet bookmark icon when saved, outline when not; flashes "Saved!" / "Removed" for 2s on toggle; 401 redirects to login. `components/ArticleBookmarkButton.tsx`, `app/api/bookmarks/toggle/route.ts`, `app/article/[slug]/page.tsx`

**[ADV-118]** Advisor Apply: 4-step progress indicator (Account type → Contact details → Your profile → Photo & submit) shown above the form for individual applications (hidden in invite flow); step dots fill violet as required fields are completed; mobile fallback shows "Step N of 4: Label" in text. `app/advisor-apply/page.tsx`

**[ADV-193]** Vault document delete: replaced native `confirm()` with inline "Delete? Yes / No" confirmation — consistent with ADV-083 pattern. `app/account/vault/VaultClient.tsx`

**[ADV-194]** Saved searches delete: replaced native `confirm()` with inline "Delete? Yes / No" confirmation. `app/account/saved-searches/SavedSearchesClient.tsx`

**[ADV-195]** Term deposits remove: replaced native `confirm()` with inline "Remove? Yes / No" confirmation. `app/account/term-deposits/TermDepositsClient.tsx`

**[ADV-196]** Account privacy — delete account: replaced `window.confirm()` with inline expandable confirmation card showing grace-period details and "Yes, schedule deletion" / "Cancel" buttons. `app/account/privacy/PrivacyClient.tsx`

**[ADV-197]** Verified products — remove: replaced `confirm()` with inline "Remove? Yes / No" row. `app/account/verified/VerifiedClient.tsx`

**[ADV-198]** Saved lists — delete: replaced `confirm()` with inline "Delete? Yes / No" row. `app/account/lists/ListsClient.tsx`

**[ADV-199]** Pros availability — remove slot: replaced `window.confirm()` with inline "Remove? Yes / No" row. `app/pros/availability/AvailabilityClient.tsx`

**[ADV-200]** Advisor portal webhooks — disable endpoint: replaced `confirm()` with inline "Disable? Yes / No" row. `app/advisor-portal/webhooks/WebhooksClient.tsx`

**[ADV-201]** Advisor portal TeamTab — remove member + revoke invite: replaced two `confirm()` calls with inline two-step confirmations; member errors surface as inline text instead of alert(). `app/advisor-portal/TeamTab.tsx`

**[ADV-202]** Broker campaigns — cancel single + bulk cancel: replaced two `confirm()` calls with inline two-step confirmations. `app/broker-portal/campaigns/page.tsx`

**[ADV-203]** Firm portal jobs — archive job: replaced `confirm()` with inline "Archive? Yes / No" row (pendingArchiveId state). `app/firm-portal/jobs/JobsClient.tsx`

**[ADV-204]** Privacy data-rights form — deletion confirm: replaced `window.confirm()` with inline warning card ("Are you sure?") shown before submitting the irreversible delete request. `app/privacy/data-rights/DataRightsForm.tsx`

**[ADV-205]** Pros intake questions editor — delete question: replaced `confirm()` with inline two-step "Delete? Yes / No" row (pendingDeleteIndex state); Discard for unsaved drafts remains immediate with no confirmation. `app/pros/settings/intake/IntakeQuestionsEditor.tsx`

**[ADV-206]** Broker review share button: replaced `alert("Link copied!")` with 2s inline "Copied!" flash via useState. `app/broker/[slug]/BrokerReviewClient.tsx`

**[ADV-207]** Compare page "Share this view": replaced `alert('Link copied!')` with 2s inline "Copied!" flash via useState. `app/compare/CompareClient.tsx`

**[ADV-208]** Advisor auctions — retract bid: replaced `window.prompt()` for retraction reason with inline reason selector (schedule_conflict / already_booked / outside_expertise / other) + confirm/cancel buttons. `app/advisor-portal/auctions/page.tsx`

**[ADV-209]** Squad inbox — hand off: replaced `window.prompt()` for handoff note with inline textarea + confirm/cancel buttons. `app/teams/[slug]/inbox/SquadInboxClaimRow.tsx`

**[ADV-139]** Dividend Reinvestment crossover chart: SVG line chart showing DRP portfolio value vs Cash total wealth (portfolio + cumulative dividends received) over time. Violet line for DRP, grey for Cash, shaded advantage area between. End-point value labels. `app/dividend-reinvestment-calculator/DividendReinvestmentClient.tsx`

**[ADV-210]** Reset button extended to 9 more calculators — Mortgage, Retirement, Savings, Franking Credits, Lump Sum, Negative Gearing, Property Yield, SMSF, and Switching calculators. Completes ADV-135 across the full calculator suite. Button appears only when inputs differ from defaults.

**[ADV-211]** VaultClient: silent delete failure now surfaces inline — `deleteError` state shows a dismissable `role="alert"` banner when a document delete API call fails. Previously the UI optimistically removed the row with no error feedback. `app/account/vault/VaultClient.tsx`

**[ADV-212]** ListsClient: toggle-public error now surfaces inline — `toggleError` state shows a `role="alert"` message when the PATCH to toggle list visibility fails. Previously the toggle reverted silently. `app/account/lists/ListsClient.tsx`

**[ADV-213]** Advisor directory filter button: replaced amber count badge + "All filters" label with dynamic "Filters (N)" text label when N > 0 — clearer on mobile and consistent with the filled-dark button state. `app/advisors/AdvisorsClient.tsx`

**[ADV-214]** Reset button extended to 5 tool calculators — DASP, ETP, FHSS, State Grants, and Visa Investment calculators. Final completion of the reset-button sweep across all calculators.

**[ADV-215]** Public list empty state — "This list is empty." replaced with structured empty state: "No items yet" heading + explanatory copy + Browse platforms / Find advisors / Explore ETFs discovery links. `app/lists/[slug]/page.tsx`

**[ADV-216]** `role="alert"` on inline errors in quiz and get-matched — quiz `fetchError` notice and get-matched plan save error were missing `role="alert"` so screen readers wouldn't announce them. `app/quiz/_components/QuizQuestionScreen.tsx`, `app/get-matched/GetMatchedClient.tsx`

**[ADV-217]** `role="alert"` sweep — CommunityVote fetchError tally notice + IntakeQuestionsEditor select validation guard (disables Save when <2 options; shows inline hint). `app/versus/CommunityVote.tsx`, `app/pros/settings/intake/IntakeQuestionsEditor.tsx`

**[ADV-218]** `role="alert"` sweep batch 2 — 14 additional files: term-deposits delete error, advisor-apply submit error, CourseBuilderTab (3 blocks), LeadsTab firm-leads error, advisor-portal dispute error, AdvisorsClient alert-save error, LessonClient mark-complete error, fee-alerts subscribe error, ProPageClient checkout error, AdvisorResultsScreen contact error, billing (subscription + settings errors), ProsJoinWizard (doc + submit errors), AdvisorProfileClient (name + email + form errors). All error displays now announce via `role="alert"` for AT users.

**[ADV-219]** BuyerAgentsClient fetch error state — DB query now destructures `{ data, error }` and sets `fetchError` boolean; renders accessible "Could not load buyer's agents / Please refresh" notice instead of silently showing an empty grid. `app/property/buyer-agents/BuyerAgentsClient.tsx`

**[ADV-220]** Calendar + office-hours empty states — discovery CTA links added (Find an advisor, Attend office hours, Join community, Get matched) so users landing on an empty screen have a clear next action instead of a dead end. `app/calendar/page.tsx`, `app/office-hours/page.tsx`

**[ADV-221]** `role="status"` on full-page loading spinners in advisor-portal and org-portal so screen readers announce the loading state. `app/advisor-portal/page.tsx`, `app/org-portal/page.tsx`

**[ADV-222]** PortfolioClient error feedback — replaced silent `catch{}` with `submitError` state; non-ok API responses and network errors now surface a `role="alert"` inline message below the submit button. `app/portfolio/PortfolioClient.tsx`

**[ADV-223]** `aria-busy` sweep across 27 async buttons — PushOptIn, CsvImportModal, TaxSummaryButton, BookmarkButton, ContextualLeadMagnet, EtfOverlapDetector, ExitIntentCapture, FollowAdvisorButton, ListsClient, SavedSearchesClient, CourseBuilderTab, EventsTab, DowngradeBanner, LedgerHistoryTable, CourseCompleteButton, ExitIntentPopup, NewsletterExitIntentModal, PillarExitIntent, PortfolioStressTest, RsvpButton, SwitchingTracker, and 6 more components. Also adds `role="alert"` on 3 error displays and converts `useRef(Date.now())` to `useState(() => Date.now())` in 3 exit-intent components.

**[ADV-224]** WCAG 1.3.1 label association — `htmlFor`/`id` pairs added to all label/input pairs in the portfolio x-ray holdings form (4 fields: xray-ticker, xray-holding-name, xray-quantity, xray-price) and the tax-optimizer holdings form (5 fields: tax-ticker, tax-buy-date, tax-buy-price, tax-current-price, tax-quantity). Eliminates Level A violations in both calculator tools. `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`

**[ADV-225]** `autoComplete="email"` added to 5 email inputs that were missing the browser-autofill hint — broker-portal login, sponsored-advisor inquiry, fee-alerts signup, savings-calculator unlock gate, portfolio-calculator unlock gate. Improves password-manager and browser autofill reliability.

**[ADV-226]** `inputMode="decimal"` sweep across 25 calculator and financial-data-entry files — shows numeric keypad (with decimal point) on mobile instead of the full keyboard, removing friction on every calculator input. Covers compound-interest, dividend-reinvestment, switching, debt, savings, portfolio, fee-impact, fire, retirement, mortgage, property-yield, smsf, super, non-resident-dividend, property-vs-shares, firb-fee-estimator, switch, switch/[type], portfolio-xray, tax-optimizer, and shared calc components (CalcShared, TotalCostCalculator, TradeCostCalculator). Total: ~70 inputs improved.

**[ADV-227]** `aria-busy` on 5 auth form submit buttons — user login (magic link + password), user signup (email + magic link), reset-password, resend-magic-link, and broker-portal login. Provides consistent screen-reader announcement of in-progress state alongside existing `disabled`. `app/auth/login/LoginClient.tsx`, `app/auth/signup/SignupClient.tsx`, `app/auth/reset-password/ResetPasswordClient.tsx`, `app/auth/auth-error/ResendMagicLinkForm.tsx`, `app/broker-portal/login/page.tsx`

**[ADV-228]** `aria-describedby` + error `id`/`role="alert"` on 3 inputs with inline errors — ResendMagicLinkForm email (resend-email-error), SavedComparisonsClient rename input (saved-rename-error), QuizInlineEmailCapture email (quiz-capture-email-error). Also adds `aria-busy` to quiz submit and Save rename buttons so screen readers announce the in-progress state.

**[ADV-229]** `aria-busy` on all advisor-portal async save/publish buttons — SettingsTab (notifications, session price, Slack), ProfileTab (Save Changes), ProfileDetailsTab (Save Changes), CaseStudiesTab (Save Draft, Publish), and advisor-portal main page (Save Draft, Submit for Review). Screen readers now announce when an async save is in progress via `aria-busy={saving}`. `app/advisor-portal/SettingsTab.tsx`, `app/advisor-portal/ProfileTab.tsx`, `app/advisor-portal/ProfileDetailsTab.tsx`, `app/advisor-portal/CaseStudiesTab.tsx`, `app/advisor-portal/page.tsx`

**[ADV-230]** `role="alert"` on 9 more error displays + a11y improvements across 8 files — advisor-signup submit error, community notify form error, compare save error, annual report upload error, score client email error, SMSF checklist email error, startup data-room (upload + add errors), subscription-audit countries/rates errors, withholding-tax client email error. Also: `aria-label` on broker review star-rating div, `role="progressbar"` with `aria-valuenow/min/max/label` on ScoreClient quiz progress bar, `aria-busy` on ScoreClient email submit, `aria-expanded` on compare save and alert buttons, "Clear all" button with `aria-label` in CompareSelectionBar, button padding improvements in CompareClient.

**[ADV-231]** Compare bar UX polish + loading skeletons for account/saved-searches and account/notifications — CompareSelectionBar: Save + Alert buttons enlarged to `min-h-11` (44px WCAG target), Save label always visible, `aria-expanded` on alert toggle, `aria-busy` on Save during save, `role="alert"` on fee-alert error, Full Compare text-xs → text-sm on mobile. CompareClient: `aria-expanded` on mobile column-expand toggle, `onClearAll` prop wired to "Clear" button in bar. Loading skeletons: shape-matched animate-pulse skeletons with `aria-busy="true"` created for `/account/saved-searches` and `/account/notifications`.

**[ADV-232]** `aria-hidden` on renderStars Unicode + broker review disclosure co-location — All renderStars() spans marked `aria-hidden="true"` across 14 pages; adjacent numeric rating text labelled `aria-label="X out of 5 stars"`. Broker review hero: affiliate + PDS disclosure moved inside the card div so it is visually adjacent to the CTA button. Also: `aria-hidden` on decorative Icon in CPDTab error banner.

**[ADV-233]** GlossarySearch live region + fee-alerts aria-busy + watchlist + brief + enroll + event buttons — GlossarySearch consolidated to single render path with `aria-live="polite" aria-atomic="true"` on results div; `type="text"` → `type="search"`; `aria-controls="glossary-results"`. CPDTab error container gets `role="alert"`. fee-alerts subscribe button gets `aria-busy`. WatchlistAlertsToggle gets `aria-busy={pending}`. MarkCompleteButton, WithdrawBriefButton (two each), SharesightConnectButton (sync + disconnect), EnrollButton, RsvpButton, broker-portal support Send all get `aria-busy`. Deals: sr-only `aria-live="polite"` region announces result count on tab change; empty state upgraded from plain text to illustrated card with "View all deals" button.

**[ADV-234]** Loading skeletons for 25 pages + `type="search"` on 20+ inputs — Animate-pulse shape-matched skeletons with `aria-busy="true"` added to account pages (watchlist, bookmarks, goals, net-worth, vault, profile, term-deposits, referrals, privacy, investor-profile, alerts, health, startup-thesis, decisions, reviews) and calculators (FIRE, compound-interest, tax-optimizer, debt, portfolio-xray, fee-simulator, dividend-reinvestment, retirement, mortgage, CGT). `type="search"` added to all search inputs across public and admin pages (VersusHubSearch ×2, DTASearchTable, StoriesClient, advisor-portal LeadsTab, org-portal OrgStudentsTab, and 16 admin pages).

**[ADV-235]** Loading skeletons for 38 more pages + `type="search"` on TagComboBox — Shape-matched animate-pulse skeletons added to remaining pages without loading states. `type="search"` added to TagComboBox component.

**[ADV-236]** Table `aria-label` sweep — WCAG 1.3.1 accessible names added to all data `<table>` elements without an existing `<caption>` or `aria-label`. ~60+ files covered: admin/automation/* (15 files), admin/* (30+ files, including subscribers, team-members, fund-reviews, switch-stories, user-reviews, affiliate-links, advisor-performance, geo, loop-status, marketplace/*, property/*, and more), public pages (api-docs, etfs/screener, export/comparison, export/fee-impact, insurance, grants/eligibility-quiz, firm-portal billing/performance, org-portal, property, teams availability/heatmap, tools/dasp-calculator, foreign-investment/DTASearchTable). All data tables now have accessible names for screen readers.

**[ADV-237]** `FloatingRightCTA` aria-hidden-focus axe fix — Added `inert={!visible}` alongside the existing `aria-hidden={!visible}`. Without `inert`, the keyboard-focusable `<Link>` and `<button>` children inside the hidden container were still reachable by screen readers (axe rule `aria-hidden-focus`). React 19 supports `inert` natively in `@types/react`; no TS errors. `components/FloatingRightCTA.tsx`

**[ADV-238]** `inputMode="decimal"` on account + additional calculator client components — Extends ADV-226's sweep to cover account client components (alerts, goals, holdings, startup-thesis, term-deposits, BusinessUpgradeForm, vault) and calculator client components (debt, mortgage, property-yield, retirement, savings, smsf). Mobile numeric keyboard now shown on all financial numeric inputs.

**[ADV-239]** Empty-state CTAs for account activity feed + referrals — `AccountActivityFeed` empty state (when no plans/matches) now shows "Build a plan" + "Match with an advisor" buttons instead of dead-end text. `ReferralsClient` empty state adds a "Copy referral link" CTA so users with no referrals still have a clear next action. `app/account/_components/AccountActivityFeed.tsx`, `app/account/referrals/ReferralsClient.tsx`

**[ADV-240]** Co-contribution page CTA + InvestorProCheckout `aria-busy` — `super/co-contribution` page was missing any conversion CTA; added a dark gradient section with "Compare Super Funds" + "Find a Financial Planner" buttons before the related-links block. InvestorProCheckout checkout button now has `aria-busy={loading || authLoading}` and uses proper `…` ellipsis. `app/super/co-contribution/page.tsx`, `app/account/upgrade/InvestorProCheckout.tsx`

**[ADV-241]** Dialog `aria-labelledby` + `<time dateTime>` + reviews empty-state CTA — QuoteBidsClient compare-bids dialog: added `aria-labelledby="compare-bids-title"` + `id` on h3 (WCAG 4.1.2). BriefActivityPanel `<time>` gets `dateTime={item.createdAt}` for AT and parser. ReviewsClient "No advisors in this category" empty state: Browse Advisors CTA button so users have a next action.

**[ADV-242]** Touch target enlargements on portal/portfolio/push-notification buttons — LeadsTab lead-status buttons (px-2 py-1 → px-3 py-1.5), PortfolioClient remove-holding button (p-1 → p-2), PushNotificationPrompt dismiss/close buttons (p-1 → p-2). WCAG 2.5.5 minimum 44×44 px.

**[ADV-243]** `role="dialog"` + `aria-modal` + `aria-labelledby` on 7 modal overlays — bd-pipeline edit deal, content-calendar AI-draft, legal edit document, finance edit transaction, marketplace packages edit, broker-portal ab-tests confirm, broker-portal creatives delete confirmation. All inner dialog panels now properly identified for screen reader modal navigation. `app/admin/bd-pipeline/page.tsx`, `app/admin/content-calendar/page.tsx`, `app/admin/legal/page.tsx`, `app/admin/finance/page.tsx`, `app/admin/marketplace/packages/page.tsx`, `app/broker-portal/ab-tests/page.tsx`, `app/broker-portal/creatives/page.tsx`

**[ADV-244]** `inputMode="decimal"` on all admin number inputs — bulk sweep across 50+ `type="number"` inputs in `app/admin/` covering all admin form pages. The `Field` component in admin/brokers/page.tsx already spreads props, so inputMode passes through correctly. Mobile/tablet admin users now see numeric keyboard instead of full qwerty.

**[ADV-245]** Empty state CTAs for FeedTab, ReviewsTab, OrgTeamTab, broker creatives — FeedTab: "Write your first post" button wired to `setComposing(true)`. ReviewsTab: "Send an invitation" button scrolls to invite form. OrgTeamTab: "Invite a team member" button scrolls to email input. Broker creatives: "Add your first asset" scrolls to URL input. All replace dead-end text messages.

**[ADV-246]** Loading skeleton files for 16 portal/compare/portfolio routes — `loading.tsx` shape-matched animate-pulse skeletons with `aria-busy="true"` created for 9 broker portal tabs (ab-tests, campaigns, creative-insights, notifications, placements, reports, sponsored-slots, support, webhooks), 2 startup portal pages (esic-verification, profile), 4 compare pages (etfs, insurance, non-residents, super), and portfolio. Reduces perceived load time and prevents layout shift.

**[ADV-247]** `aria-live="polite"` on 3 loading status texts — broker analytics inline "Loading…" span, briefs consultation panel "Loading availability…" paragraph, and firm-portal jobs "Loading…" paragraph now announce state changes to screen readers.

**[ADV-248]** Conversion CTAs on super hub and tools page — `super/page.tsx`: added "Get personalised super advice" section with "Find a Super Specialist" + "Compare Super Funds" CTAs (page previously had zero advisor-discovery touchpoints). `tools/ToolsClient.tsx`: added "Want personalised advice?" closing section with "Find a Financial Planner" + "Get matched" CTAs.

**[ADV-249]** Empty-state CTAs for goals and property-holdings + workspace router fix — GoalsClient and PropertyHoldingsClient empty states now show a styled button that smooth-scrolls to the add-form section instead of dead-end italic text. SelectWorkspaceClient replaced `window.location.href` with `router.push() + router.refresh()` for smooth client-side navigation consistent with the rest of the codebase.

**[ADV-250]** Financial planner CTAs on spouse-contributions + compare-guide super pages — both pages mentioned advisers in body copy but lacked a Link. Second CTA slot replaced with "Find a Financial Planner → /advisors/financial-planners" to provide a conversion path for complex super decisions.

**[ADV-251]** FAQ JSON-LD on /for-advisors, /for-providers, /advertise/packages — GEO pivot: FAQPage structured data added to 3 commercial pages that had FAQ sections but no schema markup, making them citable by Google AI for queries like "cost of advisor directory listing" and "CPD provider AFSL Australia".

**[ADV-252]** `aria-busy` sweep on 9 submit buttons + aria-live on 3 loading texts — ManualBalancesPanel, FeaturedPlacementBookingForm, WholesaleCertClient, ListsClient, AlertsClient, HoldingsClient, CompareSelectionBar, ComplaintsIntakeForm, DataRightsForm, SponsoredClient submit buttons all get `aria-busy`. BookConsultationPanel, broker analytics, JobsClient loading texts get `aria-live="polite" aria-atomic="true"`. Also `role="status"` on FeatureFlagsClient save confirmation span.

**[ADV-253]** `inputMode` sweep on 28 public-facing number inputs — All public `type="number"` inputs missing `inputMode` across 28 files get `inputMode="decimal"` (financial amounts) or `inputMode="numeric"` (whole-number counts). Covers 11 tool calculators (CGT, ETP, DASP, visa, mortgage-stress, salary-sacrifice-optimiser, currency-converter, alternative-returns, should-i-switch, withholding-tax, subscription-audit), 4 content calculators (lump-sum, negative-gearing, FIRB DASP, franking), compare, advisor-signup, broker-review, business-finance enquiry, rate-alert, startup-signup, get-matched, lic-screener, quote-builder, sell-business. Also fixes ternary-with-side-effects lint warning in MortgageStressTestClient.

**[ADV-254]** FAQ JSON-LD on /property/foreign-investment (FIRB guide) — GEO pivot: FAQPage structured data added to the FIRB foreign investment guide. 6 FAQ entries from FIRB_FAQS covering dwelling restrictions, approval timelines, fees, penalties, Victorian surcharges, and temporary-resident rules. Makes the page citable by AI for "can foreigners buy property in Australia" queries. `app/property/foreign-investment/page.tsx`

**[ADV-255]** `CalculatorLeadCapture` on 4 remaining tool pages — buy-vs-rent (need=mortgage), portfolio-stress-test (need=planning), etf-overlap (need=planning), salary-sacrifice decision tree (need=planning), smsf-setup decision tree (need=smsf). Every high-intent tool page now has a post-result advisor lead capture converting calculation intent into free advisor reviews.

**[ADV-256]** `CalculatorLeadCapture` on tax-optimizer, portfolio-xray, fee-simulator + replace static advisor CTAs — Adds dynamic lead-capture form to the 3 remaining calculator pages. In tax-optimizer and portfolio-xray, the existing static "Find an Advisor →" CTA blocks are replaced by `CalculatorLeadCapture` (better conversion UX). Fee-simulator gets it inserted before the SEO content section. Completes the full calculator lead-capture rollout across all 18+ tool pages. `app/tax-optimizer/TaxOptimizerClient.tsx`, `app/portfolio-xray/XRayClient.tsx`, `app/fee-simulator/FeeSimulatorClient.tsx`

**[ADV-257]** FAQ JSON-LD on SMSF checker — GEO pivot: 5-question FAQPage structured data added to the SMSF eligibility checker covering collectables sole-purpose rule (Rolex), related-party property, cryptocurrency, the sole-purpose test itself, and non-compliance penalties. Answer-first format optimised for AI citation. `app/tools/smsf-checker/page.tsx`

**[ADV-258]** `aria-busy` sweep on async buttons in account, portal, and course pages (2026-06-08) — Adds `aria-busy` to 20+ async buttons missing it: ProfileClient save, PropertyHoldingsClient add-property submit, MorningBriefToggle, DigestToggle (role="switch"), ListsClient delete, TermDepositsClient delete-confirm, StartupThesisClient save, CourseReviews submit, AvailabilityWidget status buttons, advisor marketplace template add, broker settings accept-terms, vault delete-confirm. Screen readers now announce in-progress state on every async user action.

**[ADV-259]** `aria-busy/label` on loading skeletons in account pages and portals — Root `app/loading.tsx`, AccountClient, ProfileClient, ReferralsClient, SavedComparisonsClient, SavedSearchesClient, advisor-portal loading.tsx, broker-portal loading.tsx, EarnTab, and EventsTab inline skeleton states all get `aria-busy="true"` and descriptive `aria-label`. Screen readers announce the loading region so AT users know content is being fetched. `inputMode` sweep on 29 portal number inputs (advisor/broker/org/startup portals) also completed in same session.

**[ADV-260]** `inputMode` on 29 portal number inputs (advisor/broker/org/startup portals) — Extends ADV-253's public inputMode sweep to authenticated portal pages. All `type="number"` inputs in advisor-portal (CourseBuilderTab, EventsTab, SettingsTab, ProfileDetailsTab, TeamTab, auctions), broker-portal (campaigns, settings, wallet), org-portal (OrgCoursesTab, OrgEventsTab), and startup-portal (round/new) now get `inputMode="decimal"` for mobile numeric keyboard.

**[ADV-261]** `aria-label` sweep on super guide tables (2026-06-08) — WCAG 1.3.1 accessible names added to all unlabelled `<table>` elements in 7 super subpages: compare-guide (3 tables), division-296 (1), pension-phase (3), transition-to-retirement (2), co-contribution (2), death-benefit (5), insurance (1). Labels derived from nearest h2/h3 heading. `app/super/*/page.tsx`

**[ADV-262]** `aria-label` sweep across 131 public content pages (2026-06-08) — Comprehensive WCAG 1.3.1 sweep: `aria-label` added to every unlabelled `<table>` element across all remaining public routes. ~220+ tables labelled across: invest/* (28 files, 56 tables), tax/* (16 files, 58 tables), retirement/* (11 files), smsf/* (5 files), home-loans/* (7 files), first-home-buyer/* (6 files), foreign-investment/* (10 files), global-investing/* (14 files), etfs/* (4 files), property/* (6 files), super/* (2 files), aged-care/* (3 files), insurance/* (2 files), grants/emdg, negative-gearing, mortgage, alt-assets, family-office, halal-investing, wholesale, lump-sum-investing/redundancy, and dynamic routes ([suburb]/property-investing, invest/[slug]/stocks, invest/[slug]/etfs, etfs/[ticker], etfs/vs/[slugs], property/suburbs/[slug]). Tables in admin pages, interactive screeners with `<caption>`, and rate boards with sr-only captions were left unchanged.

**[ADV-263]** FAQ JSON-LD on /foreign-investment/guides — GEO pivot: FAQPage structured data + visible `<details>/<summary>` accordion added to the FI guides hub. 4 FAQs covering foreigners+Australian shares, FIRB approval triggers, tax obligations, and super access. `app/foreign-investment/guides/page.tsx`

**[ADV-264]** FAQ JSON-LD on /non-resident-cgt-checker — GEO pivot: FAQPage schema + visible accordion added to the non-resident CGT checker page. 4 FAQs covering Section 855-10 share exemption, land-rich property rules, cryptocurrency treatment, and treaty interactions. `app/non-resident-cgt-checker/page.tsx`

**[ADV-265]** FAQ JSON-LD on /invest/private-equity and /invest/mining — GEO pivot: FAQPage schema + visible accordion on both sector pages. Private equity: retail access routes, return expectations, minimum investment, FIRB treatment. Mining: non-stock exposure, FIRB critical minerals, 2026 investment case, tax treatment. `app/invest/private-equity/page.tsx`, `app/invest/mining/page.tsx`

**[ADV-266]** FAQ JSON-LD on /costs — GEO pivot: FAQPage schema + visible accordion on the brokerage costs guide. 4 FAQs covering typical brokerage fees, annual platform cost, fee drag on returns, and cheapest way to invest. `app/costs/page.tsx`

**[ADV-267]** FAQ JSON-LD on 4 sector pages — GEO pivot: FAQPage schema + visible accordion added to /invest/hydrogen, /invest/oil-gas, /invest/lithium, /invest/uranium. Each page has 4 answer-first FAQs optimised for AI citation on sector-specific queries. `app/invest/hydrogen/page.tsx`, `app/invest/oil-gas/page.tsx`, `app/invest/lithium/page.tsx`, `app/invest/uranium/page.tsx`

**[ADV-268]** FAQ JSON-LD on /brokers/full-service — GEO pivot: FAQPage schema + visible accordion added to the full-service brokers guide. 4 FAQs covering full-service vs discount differences, ASIC regulation, fee structures, and discretionary portfolio management. `app/brokers/full-service/page.tsx`

**[ADV-269]** FAQ JSON-LD on /foreign-investment/siv — GEO pivot: FAQPage schema + visible accordion added to the Significant Investor Visa page. 4 FAQs covering what the SIV was, its 2023 closure, the complying investment framework, and country source breakdown. `app/foreign-investment/siv/page.tsx`

**[ADV-270]** FAQ JSON-LD on 3 SMSF pages — GEO pivot: FAQPage schema + visible accordion added to /smsf/investment-strategy (5 mandatory elements, Division 296, diversification), /smsf/auditors (annual audit requirement, independence rules, SAN, audit cost), /smsf/checklist (compliance obligations, annual return lodgement, audit failure penalties, trustee-member rules). `app/smsf/investment-strategy/page.tsx`, `app/smsf/auditors/page.tsx`, `app/smsf/checklist/page.tsx`

**[ADV-271]** FAQ JSON-LD on /pricing — GEO pivot: FAQPage schema + visible accordion on the advisor fee transparency page. 4 FAQs covering typical planner fees, upfront vs ongoing structure, tax-deductibility, and fee-for-service vs commission model post-FoFA reforms. `app/pricing/page.tsx`

**[ADV-272]** FAQ JSON-LD on /foreign-investment/journey — GEO pivot: FAQPage schema + visible accordion on the cross-border investing journey hub. 4 FAQs covering FIRB-exempt investment types, non-resident dividend withholding, FIRB process timeline, and unrestricted investment categories. `app/foreign-investment/journey/page.tsx`

**[ADV-273]** FAQ JSON-LD on /methodology — GEO pivot: FAQPage schema + visible accordion on the ranking methodology page. 4 FAQs covering commercial relationships, editorial rating calculation, sponsorship vs editorial independence, and data update frequency. `app/methodology/page.tsx`

**[ADV-274]** FAQ JSON-LD on /debt-calculator and /foreign-investment/compare — GEO pivot: Debt calculator: 4 FAQs covering consolidation savings, eligible debts, credit score impact, average AU rates. FI compare: 4 FAQs covering DTA country list, dividend withholding rates, country-specific FIRB variations, FX cost impact. `app/debt-calculator/page.tsx`, `app/foreign-investment/compare/page.tsx`

**[ADV-275]** FAQ JSON-LD on /about and /advisor/trust-score-methodology — GEO pivot: About page: 4 FAQs covering independence/ownership, revenue model, advisor verification process, editorial reliability. Trust Score methodology: 4 FAQs explaining Trust Score definition, high-score caveats, AFSL verification, and update frequency. `app/about/page.tsx`, `app/advisor/trust-score-methodology/page.tsx`

**[ADV-276]** FAQ JSON-LD on /fee-simulator, /editorial-policy, /how-we-earn — GEO pivot: Fee simulator: 4 FAQs covering what the simulator shows, annual vs per-trade fee importance, inactivity fees, and FX fee return drag. Editorial policy: 4 FAQs covering affiliate-independence, update cadence, error reporting, and full-market coverage. How we earn: 4 FAQs covering affiliate link cost to users, data privacy, comparison trust, and advisor directory fees. `app/fee-simulator/page.tsx`, `app/editorial-policy/page.tsx`, `app/how-we-earn/page.tsx`

**[ADV-277]** FAQ JSON-LD on /articles and /glossary — GEO pivot: Articles hub: 4 FAQs covering topic coverage, AU-specificity, guide discovery, and editorial verification — wired into the existing ItemList JSON-LD array. Glossary: 4 FAQs covering AU-specific terminology, category coverage, update cadence, and linking policy — layered on top of existing DefinedTermSet schema. `app/articles/page.tsx`, `app/glossary/page.tsx`

**[ADV-278]** FAQ JSON-LD on /advisors/[type]/[state] location pages — GEO pivot: Type-specific FAQ arrays added to all 156+ advisor-by-type-and-location pages (13 professional types × 9 states + 21 cities). Financial planners, SMSF accountants, mortgage brokers, tax agents, and property advisors each get 4 tailored FAQs covering cost, credentials, licensing verification, and Australian-specific regulatory context. Generic fallback for remaining types. Makes every location+type combination citable for "find [advisor] in [city]" queries. `app/advisors/[type]/[state]/page.tsx`

**[ADV-279]** FAQ JSON-LD on /how-we-verify, /help, /invest, /compare — GEO pivot: FAQPage structured data + visible accordions added to 4 high-traffic pages. /how-we-verify: 4 FAQs on fee-verification cadence, data sources, fee types, and impact on broker scores. /help: 4 FAQs on platform comparison, editorial independence, tools available, and contact methods. /invest: 4 FAQs on marketplace listing types, FIRB-eligible meaning, listing process, and SIV-complying definition. /compare: visible FAQ accordion added to match the existing FAQPage JSON-LD (3 FAQs) for AI extraction from human-readable content. `app/how-we-verify/page.tsx`, `app/help/page.tsx`, `app/invest/page.tsx`, `app/compare/page.tsx`

**[ADV-280]** FAQ JSON-LD on /insights — GEO pivot: FAQPage structured data + visible accordion added to the Australian Investing Index page. 4 FAQs covering what the index is, how often fee data updates, which platforms are included, and what the Investor Health Score measures. `app/insights/page.tsx`

**[ADV-281]** FAQ JSON-LD on /health-scores, /tax-optimizer, /portfolio-xray — GEO pivot: FAQPage schema + visible accordions on 3 high-intent tool pages. Health scores: 4 FAQs on what the score is, the 5 dimensions, ASIC independence, and update cadence. Tax optimizer: 4 FAQs on tool scope, personal-advice disclaimer, CGT discount mechanics, and data privacy. Portfolio X-Ray: 4 FAQs on analysis dimensions, diversification scoring, concentration risk, and browser-local data. `app/health-scores/page.tsx`, `app/tax-optimizer/page.tsx`, `app/portfolio-xray/page.tsx`

**[ADV-282]** FAQ JSON-LD on /investing-for, /benchmark — GEO pivot: FAQPage schema + visible accordions added to occupation investing hub and fee benchmarking dashboard. Investing-for: 4 FAQs on why strategy varies by occupation, what guides cover, personal-advice disclaimer, and update cadence. Benchmark: 4 FAQs on what the dashboard compares (6 dimensions), percentile ranking meaning, score methodology, and update frequency. `app/investing-for/page.tsx`, `app/benchmark/page.tsx`

**[ADV-283]** FAQ JSON-LD on /versus, /research, /tools — GEO pivot: FAQPage schema + visible accordions on comparison hub, research reports hub, and financial tools hub. Versus: 4 FAQs on comparison scope, fee currency, volume tiers, and which platform wins. Research: 4 FAQs on report types, free vs gated, editorial independence, and update cadence. Tools: 4 FAQs on tool categories, free access model, personal-advice disclaimer, and where to start. `app/versus/page.tsx`, `app/research/page.tsx`, `app/tools/page.tsx`

**[ADV-284]** FAQ JSON-LD on /reviews, /scenarios, /rba-poll, /whats-new — GEO pivot: FAQPage schema + visible accordions on 4 more pages. Reviews: how ratings work, editorial independence, complaint process. Scenarios: what scenarios are, advice disclaimer, update cadence. RBA Poll: how the prediction works, meeting schedule, advice caveat. What's New: what's tracked, update speed, fee-page label explanation. `app/reviews/page.tsx`, `app/scenarios/page.tsx`, `app/rba-poll/page.tsx`, `app/whats-new/page.tsx`

**[ADV-285]** FAQ JSON-LD on /contact, /deals, /calendar, /questions — GEO pivot: FAQPage schema + visible accordions. Contact: response times, data errors, partnerships, complaint process. Deals: deal types, verification, affiliate disclosure, how to claim. Calendar: events tracked, iCal export, date accuracy, update frequency. Questions: topic coverage, advice disclaimer, answer methodology, question submission. `app/contact/page.tsx`, `app/deals/page.tsx`, `app/calendar/page.tsx`, `app/questions/page.tsx`

**[ADV-286]** FAQ JSON-LD on /market-pulse, /press, /events, /testimonials — GEO pivot: FAQPage schema + visible accordions on 4 more pages. Market Pulse: what the dashboard shows, data cadence, fee index explainer, advice disclaimer. Press: media contact, citable data, editorial independence, correction process. Events: event types, free vs paid, how to register, adviser submission. Testimonials: verification method, suppression policy, how to submit, personal-advice disclaimer. `app/market-pulse/page.tsx`, `app/press/page.tsx`, `app/events/page.tsx`, `app/testimonials/page.tsx`

**[ADV-287]** FAQ JSON-LD on /complaints, /quick-audit, /expert — GEO pivot: FAQPage schema + visible accordions. Complaints: how to complain, AFCA escalation, editorial scope, independence disclosure. Quick Audit: what it audits (4 fee types), how the saving is calculated, portfolio size caveat, free-access confirmation. Expert Insights: author verification (AFSL + ASIC check), advice disclaimer, topic filtering, adviser submission process. `app/complaints/page.tsx`, `app/quick-audit/page.tsx`, `app/expert/page.tsx`

**[ADV-288]** FAQ JSON-LD on /community, /listings, /quotes — GEO pivot: FAQPage schema + visible accordions. Community: topic coverage, moderation policy, ask-an-adviser feature, how to post. Listings: listing types, admin-review caveat, how to post, getting matched for due diligence. Quotes: how the marketplace works, adviser verification, how to post, confidentiality policy. `app/community/page.tsx`, `app/listings/page.tsx`, `app/quotes/page.tsx`

**[ADV-289]** FAQ JSON-LD on /properties, /score, /teams, /wealth-stack — GEO pivot: FAQPage schema + visible accordions. Properties: listing types, gross yield calculation, data currency, property-investment advice disclaimer. Score: what the 6-dimension health score measures, accuracy caveat, advice disclaimer, data privacy. Teams: what an Expert Team is vs single adviser, verification process, how to engage, comparison tool. Wealth Stack: recommendation mechanics, personalisation method, affiliate disclosure, advice disclaimer. `app/properties/page.tsx`, `app/score/page.tsx`, `app/teams/page.tsx`, `app/wealth-stack/page.tsx`

**[ADV-290]** FAQ JSON-LD on /get-matched, /concierge, /office-hours, /advisor-jobs, /switch-scripts, /just — GEO pivot: FAQPage schema + visible accordions. Get Matched: tool mechanics, no auto-assignment caveat, free-service disclosure, skip-the-quiz path. Concierge: what to ask, personal-advice disclaimer, accuracy scope, free access. Office Hours: format, advice disclaimer, how to submit questions, adviser hosting process. Advisor Jobs: role types, application process, firm posting process, non-licensed roles. Switch Scripts: what a switch script is, CHESS in-specie CGT treatment, transfer timelines, negotiation-first approach. Just (life events): events covered, why timing matters, advice disclaimer, finding specialists. `app/get-matched/page.tsx`, `app/concierge/page.tsx`, `app/office-hours/page.tsx`, `app/advisor-jobs/page.tsx`, `app/switch-scripts/page.tsx`, `app/just/page.tsx`

**[ADV-291]** FAQ JSON-LD on /insights/state-of-australian-investing, /rates/today, /tools/etf-overlap, /tools/portfolio-stress-test — GEO pivot: FAQPage schema + visible accordions. State of Investing: report scope/coverage, data update frequency, average brokerage calculation methodology, media citation guidance. Rates Today: how often rates change, why rates move without RBA decisions, finding the highest rate today, accuracy/verification disclaimer. ETF Overlap: what overlap is and why it matters, weighted overlap % calculation, data currency (monthly disclosures), whether overlap should always be avoided. Portfolio Stress Test: 4 crises simulated (GFC/COVID/dot-com/2022), drawdown calculation methodology, 2022 correlation breakdown (stocks+bonds fell together), advice disclaimer. `app/insights/state-of-australian-investing/page.tsx`, `app/rates/today/page.tsx`, `app/tools/etf-overlap/page.tsx`, `app/tools/portfolio-stress-test/page.tsx`

**[ADV-294]** FAQ JSON-LD on /broker/[slug]/safety — GEO pivot: dynamic broker-specific FAQPage schema + visible accordion on every broker safety review page. 4 dynamically generated FAQs using broker.regulated_by, broker.chess_sponsored, hasAsic, hasAfsl, and safetyScore: (1) is [BrokerName] safe? (conditional on ASIC regulation and CHESS status), (2) investor protections (CHESS in your name vs custodial client money rules), (3) ASIC regulation status confirmation with AFSL details, (4) what happens to shares in insolvency (CHESS HIN vs custodial trust account treatment). `app/broker/[slug]/safety/page.tsx`

**[ADV-293]** FAQ JSON-LD on /how-to/transfer-from/[broker_slug] — GEO pivot: dynamic broker-specific FAQPage schema + visible accordion on every individual broker transfer guide. 4 dynamically generated FAQs using broker.name, guide.chess_transfer_fee, guide.supports_in_specie, and guide.estimated_timeline_days: (1) how to transfer out of [BrokerName], (2) transfer fee (exact amount from DB), (3) CGT treatment conditional on in-specie support, (4) timeline in business days. All content is broker-specific — no generic copy. `app/how-to/transfer-from/[broker_slug]/page.tsx`

**[ADV-292]** FAQ JSON-LD on /how-to/transfer-from, /methodology/invest-score, /quotes/recent-wins, /community/confessions — GEO pivot: FAQPage schema + visible accordions. Transfer From: CHESS in-specie process, CGT treatment (no disposal event), fee schedule, 3–10 day timeline. Invest Score Methodology: what the score measures, daily update cadence, why ASX/RBA data excluded, advice disclaimer. Recent Wins: how the marketplace works, whether wins are real, quote response time, who the advisers are. Confessions: what the section is, anonymity guarantees, appropriate content, general-information-only disclaimer. `app/how-to/transfer-from/page.tsx`, `app/methodology/invest-score/page.tsx`, `app/quotes/recent-wins/page.tsx`, `app/community/confessions/page.tsx`

---


**[ADV-295]** FAQ JSON-LD on /best-for/[slug], /afsl/[number], /brokers/full-service/[slug], /academy/[slug] — GEO pivot: dynamic FAQPage schema + visible accordions on 4 more high-value dynamic route pages. Best-for: 4 FAQs from scoring_weights + scenario intro/target_user — "what makes the best broker for X", ranking methodology, personal-fit caveat, update cadence — applied to 50+ scenario pages. AFSL lookup: 4 FAQs from afsl_number + status + licensee_name — what the AFSL is, whether currently licensed, ASIC Connect verification, cancelled licence consequences — applied to ~6,000 licensee pages. Full-service broker profile: 4 FAQs from fee_model + minimum_investment_cents + afsl_number — what the firm offers, minimum portfolio, ASIC regulation, full-service vs DIY comparison. Academy course: 4 FAQs from course description + price_cents + cpd_hours — what the course covers, cost (free or paid), completion time, advice disclaimer. `app/best-for/[slug]/page.tsx`, `app/afsl/[number]/page.tsx`, `app/brokers/full-service/[slug]/page.tsx`, `app/academy/[slug]/page.tsx`

**[ADV-296]** Schema + FAQ on broker changelog, advisor insights, job listings — GEO pivot: 3 more pages get structured data. Broker changelog (/broker/[slug]/changelog): FAQPage schema + 4 dynamic FAQs per broker covering fee tracking rationale, update frequency, change types logged, and fee-impact for investors. Advisor insights hub (/advisor/[slug]/insights): FAQPage schema + 4 dynamic FAQs from pro.verified + typeLabel covering what insights are, verification status, advice disclaimer, and follow feature. Advisor job listings (/advisor-jobs/[id]): JobPosting schema added for Google for Jobs eligibility — maps employment type, hiringOrganization, jobLocation, datePosted, directApply. `app/broker/[slug]/changelog/page.tsx`, `app/advisor/[slug]/insights/page.tsx`, `app/advisor-jobs/[id]/page.tsx`

**[ADV-297]** Discovery CTAs on alerts empty state — zero-alert users now see two action buttons below the "No alerts yet" copy: "Set up a fee alert" (→ /fee-alerts, primary) and "Browse current rates" (→ /rates/today, secondary). Replaces a dead-end empty state with a clear next-step path for new users. `app/account/alerts/AlertsClient.tsx`

**[ADV-298]** JobPosting schema + FAQ on careers page; discovery CTAs on lists empty state — Careers (/about/careers): 3 × JobPosting JSON-LD (FULL_TIME, remote AU) for Google for Jobs eligibility; FAQPage schema + 4-item accordion (culture, remote work, how to apply, required skills) for GEO citation on "invest.com.au jobs" queries. Lists empty state: replaced dead-end "create above" copy with 3 discovery CTA buttons (Browse brokers / Find advisors / Explore ETFs) so new users understand what the feature is for. `app/about/careers/page.tsx`, `app/account/lists/ListsClient.tsx`

**[ADV-299]** FAQ JSON-LD on /compare/[versus] — GEO pivot: FAQPage schema + visible accordion on all 66+ broker head-to-head comparison pages. 4 dynamic FAQs per page using brokerA/B names, asx_fee, chess_sponsored, and smsf_support: overview of key differences, ASX fee winner, SMSF suitability (conditional on each broker's support), and editorial independence disclosure. Makes every "[Broker A] vs [Broker B]" comparison citable by AI for "is [broker] better than [broker]" queries. `app/compare/[versus]/page.tsx`

**[ADV-300]** FAQ JSON-LD on /health-scores/[slug] — GEO pivot: FAQPage schema + visible accordion on all broker safety score detail pages. 4 dynamic FAQs using broker name, chess_sponsored, overall_score, and last_reviewed_at: is [broker] safe (conditional on CHESS status and score), what the 5-dimension score measures (with per-dimension scores), CHESS vs custodial explanation, and score update cadence (with last-reviewed date). Makes every broker health score page citable by AI for "is [broker] safe" queries. `app/health-scores/[slug]/page.tsx`

**[ADV-301]** FAQPage schema + accordion on broker review pages — GEO pivot: 4 dynamic FAQs added to every broker review page (~150+ active broker pages). (1) Is [broker] safe? — conditional on chess_sponsored, platform_type, ASIC regulation. (2) Fees/rates — conditional on platform_type (savings/TD shows rate info, others show asx_fee/us_fee/fx_rate). (3) Good for SMSF/beginners — conditional on smsf_support flag. (4) Who regulates [broker]? — ASIC mention + regulated_by field + ASIC Connect pointer. Layered on top of existing Review/FinancialProduct/ReviewArticle/AggregateRating/QAPage schema. `app/broker/[slug]/page.tsx`

**[ADV-306]** FAQPage schema + accordion on advisor office hours session pages — GEO pivot: 4 dynamic FAQs per session using session.title, description, status, max_questions, advisor name/firm: what the session is + who it's for (isTranscript conditional), general-advice disclaimer for answers, how to submit questions (max limit + anonymity), and how to find future sessions. `app/office-hours/[id]/page.tsx`

**[ADV-305]** FAQPage schema + accordion on research report pages — GEO pivot: 4 dynamic FAQs per report using title, summary, sector, sponsor_name: what the report covers, editorial independence (conditional on sponsorship), general-advice disclaimer, who publishes invest.com.au research. Accordion replaces flat prose disclaimer section; GENERAL_ADVICE_WARNING kept below. Also removed pre-existing unused Icon import. `app/research/[slug]/page.tsx`

**[ADV-304]** FAQPage schema + accordion on advisor location and suburb property pages — GEO pivot: 2 high-traffic templates covered. find-advisor/[location]: 4 city-specific FAQs — how to find the best advisor, cost ($2,500–$5,000 SOA + ongoing), AFSL licensing requirement, planner vs tax agent difference. Replaces flat prose SEO section with structured accordion. property/suburbs/[slug]: 4 dynamic FAQs using median_price_house, rental_yield_house, capital_growth_10yr — is the suburb good to invest in, current median prices, FIRB approval for foreign buyers, how to find a buyer's agent. `app/find-advisor/[location]/page.tsx`, `app/property/suburbs/[slug]/page.tsx`

**[ADV-303]** FAQPage schema + accordion on ETF ticker, glossary term, and foreign-investment country pages — GEO pivot: 3 more dynamic route templates covered. ETF ([ticker]): 4 dynamic FAQs — what the ETF invests in (benchmark + AUM), MER/fees, suitability disclaimer + adviser CTA, how to buy on ASX. Glossary ([term]): 3 additional FAQs alongside existing DefinedTerm+QAPage schema — AU investing context, portfolio impact, ASIC regulation — using entry.definition + entry.category. Foreign-investment from/[country]: 4 DTA-conditional FAQs — can residents invest, WHT rates (reduced rate if DTA applies), FIRB scope, broker acceptance — using dtaCountry.hasDTA, dividendWHT, interestWHT. `app/etfs/[ticker]/page.tsx`, `app/glossary/[term]/page.tsx`, `app/foreign-investment/from/[country]/page.tsx`

**[ADV-302]** FAQPage schema + accordion on /invest/[slug] vertical pages — GEO pivot: 4 dynamic FAQs added to every investment vertical detail page (aquaculture, carbon markets, franchise, rural property, etc.). (1) How to invest in [vertical] in Australia — combines v.description with access pathways and adviser CTA. (2) Risks — covers volatility, liquidity, currency, concentration, regulatory risk with PDS and advice disclaimers. (3) ASIC regulation — AFSL requirement, Corporations Act 2001, FIRB applicability for foreign investors. (4) Personalised advice — general-information disclaimer with adviser matching CTA to /find-advisor. `app/invest/[slug]/page.tsx`

**[ADV-307]** FAQPage schema + accordion on /best-for broker scenario hub — GEO pivot: 4 FAQs covering how scenario rankings work (weighted fields per use case, not paid placement), sponsorship disclosure (badges only, not ranking order), update cadence, and scenario vs category difference. Makes the hub citable for "how does invest.com.au rank brokers" queries. `app/best-for/page.tsx`

**[ADV-308]** FAQPage schema + accordion on /how-to guides hub — GEO pivot: 4 FAQs covering what topics the guides address (6 categories covering shares/ETFs/crypto/property/super/savings), Australia-specific scope (ATO/ASIC/ASX law), general information disclaimer, and update cadence. Visible accordion added before the CompactDisclaimerLine footer. `app/how-to/page.tsx`

**[ADV-309]** FAQPage schema + accordion on /reports/annual annual investment report — GEO pivot: 4 FAQs covering what the State of Investing report covers (broker fees, platform landscape, all tracked brokers), editorial independence disclosure, annual update cadence, and general-advice disclaimer. Accordion added before the email gate/download section. `app/reports/annual/page.tsx`

**[ADV-310]** FAQPage schema + accordions on /learn hub and all 5 learning path pages — GEO pivot: 4 FAQs added to /learn (free access, which path to start, time commitment, general-advice disclaimer) and per-topic FAQs on each of the 5 paths (new-investor, choosing-a-broker, retirement-and-super, tax-smart-investing, foreign-investor). Each path has 4 dedicated FAQs matching the most-asked questions for its audience. All 6 pages now have Course/ItemList + FAQPage JSON-LD. `app/learn/page.tsx`, `app/learn/[path]/page.tsx`

**[ADV-311]** FAQPage schema + accordion on /grants/industry-growth-program — GEO pivot: 4 FAQs covering what the IGP is (two funding streams, matched funding, Future Made in Australia sectors), who is eligible (Australian SMEs, matched funding requirement, priority sectors), the mandatory advisory engagement step (4–8 weeks, required before application), and remaining funding pool availability (~$287M, ~90% committed by June 2026). Makes the page citable for "Industry Growth Program Australia" queries. `app/grants/industry-growth-program/page.tsx`

**[ADV-312]** Aged care specialist advisor CTAs on 7 subpages — All 7 aged-care content subpages (rad-vs-dap, means-test, family-home, costs, home-care-packages, home-vs-residential, facilities) previously mentioned "consult a licensed aged care financial adviser" in their disclaimers but had no CTA to find one. Added `HubAdvisorCTA` with amber styling and aged-care-specific intent context to all 7 pages, converting the advisory recommendation into an actionable conversion path. `app/aged-care/*/page.tsx`

**[ADV-313]** Advisor CTAs on 3 high-complexity specialist pages — /tax/foreign-income (DTA + FIF rules), /first-home-buyer/shared-equity (shared equity scheme eligibility), and /global-investing/tax (FIF + CFC + CGT on foreign shares) all recommended specialist advice in their disclaimers but had no CTA. Added `HubAdvisorCTA` with appropriate intent context to each. `app/tax/foreign-income/page.tsx`, `app/first-home-buyer/shared-equity/page.tsx`, `app/global-investing/tax/page.tsx`

**[ADV-314]** Advisor CTAs on 5 retirement and lump-sum specialist pages — /retirement/annuities, /retirement/age-pension, /retirement/downsizer-contribution, /retirement/reverse-mortgage, and /lump-sum-investing/redundancy all had "consult a financial adviser" in their compliance text but no CTA. Added `HubAdvisorCTA` with retirement/planning intent context to each. `app/retirement/*/page.tsx`, `app/lump-sum-investing/redundancy/page.tsx`

**[ADV-315]** Advisor CTAs on 7 remaining retirement subpages — age-pension-assets-test, annuities-vs-abp, deeming-rates, how-much-do-you-need, income-test, pension-phase, and retirement-income all recommended specialist advice with no CTA. Added `HubAdvisorCTA` (amber, intent-tagged) to each. Every retirement subpage now has a conversion path to find a retirement income specialist. `app/retirement/*/page.tsx`

**[ADV-316]** Advisor CTAs on 3 specialist wealth pages — /alt-assets (alternative assets: whisky, wine, art, farmland), /family-office (SFO/MFO structures), and /wholesale (s708 sophisticated investor) all had compliance copy recommending advice but no CTA. Added `HubAdvisorCTA` with intent-tagged context matching each specialist area. `app/alt-assets/page.tsx`, `app/family-office/page.tsx`, `app/wholesale/page.tsx`

**[ADV-317]** Advisor CTAs on 4 SMSF specialist subpages — /smsf/crypto (ATO sole-purpose test for crypto), /smsf/property (related-party and LRBA rules), /smsf/borrowing (bare trust structures), and /smsf/wind-up (rollover and deregistration process) all had adviser mentions but no CTA. Added `HubAdvisorCTA` with SMSF-specific intent context to each. `app/smsf/*/page.tsx`

**[ADV-318]** Advisor CTAs on insurance/trauma and insurance/tpd — both pages went straight from FAQs to "Related Insurance" links with no CTA. Insurance product advice is tightly regulated; trauma and TPD definition choice (own vs any occupation) can determine whether a claim pays. Added `HubAdvisorCTA` with insurance-specific intent context to both. `app/insurance/trauma/page.tsx`, `app/insurance/tpd/page.tsx`

**[ADV-319]** Advisor CTAs on 3 global-investing sub-pages + property/positive-gearing — /global-investing/bonds, /global-investing/property, and /global-investing/lics all had "Consult a licensed financial adviser" in compliance text but no CTA. /property/positive-gearing had a mortgage broker link in the related section but no CTA form. Added `HubAdvisorCTA` with intent-tagged context matching each topic. `app/global-investing/bonds/page.tsx`, `app/global-investing/property/page.tsx`, `app/global-investing/lics/page.tsx`, `app/property/positive-gearing/page.tsx`

**[ADV-320]** Advisor CTAs on 4 hub and first-home-buyer pages — /first-home-buyer/fhss-guide (FHSS + super strategy), /first-home-buyer/stamp-duty (concessions + lender structuring), /investing-for (occupation-specific tax strategy), and /scenarios (complex multi-scenario cases) all referenced "consult a licensed financial adviser" with no CTA form. Added `HubAdvisorCTA` with appropriate intent context to each. `app/first-home-buyer/fhss-guide/page.tsx`, `app/first-home-buyer/stamp-duty/page.tsx`, `app/investing-for/page.tsx`, `app/scenarios/page.tsx`

**[ADV-321]** Advisor CTA on /just life-event hub — high-intent page (users just retired/inherited/sold a business) had "always consult a licensed financial adviser" in compliance text with no CTA. Added `HubAdvisorCTA` before the compliance note so life-event visitors have a direct path to adviser matching. `app/just/page.tsx`

**[ADV-322]** Advisor CTAs on /tools and /questions hubs — both pages had FAQ disclaimer text recommending "consult an AFSL-authorised financial adviser" with no CTA form. /tools: users who've just modelled retirement projections or CGT calculations are in the highest-intent state for advice; added `HubAdvisorCTA` between `ToolsClient` and FAQ. /questions: Q&A hub covering super/tax/property/retirement has no path from general answers to professional advice; added `HubAdvisorCTA` before FAQ section. `app/tools/page.tsx`, `app/questions/page.tsx`

**[ADV-323]** Advisor CTA on /invest investment marketplace hub — main investment listings page (alternative assets, syndicates, funds, business) had broker/tools content but no adviser conversion path despite complex product mix. Added `HubAdvisorCTA` between `HomeToolsStrip` and FAQ accordion so marketplace visitors have a direct path to specialist advice before committing to complex investments. `app/invest/page.tsx`

**[ADV-324]** A11y: FAQ accordion chevron `aria-hidden` fix (79 pages) + contrast fixes (2 pages) — FAQ accordion `▾` chevrons across 79 pages were missing `aria-hidden="true"`, causing axe to flag them as WCAG AA color-contrast failures (text character on white, 3.07:1 vs 4.5:1 required). Added `aria-hidden="true"` sitewide to all 79 files. Also fixed 5 specific `text-slate-400` on white-background informational text elements: 4 in `/foreign-investment/page.tsx` (platform type labels, "Key rule" label, country notes, disclaimer) and 1 in `/terms/page.tsx` (version/date line) — changed to `text-slate-500` (4.54:1 ratio, passes AA). Resolves the "one violation per page" a11y failures flagged on /glossary, /tools, /about, /how-we-earn (chevron) and /foreign-investment, /terms (text contrast). Note: /privacy page violation not yet identified via code search — may require axe local run.
