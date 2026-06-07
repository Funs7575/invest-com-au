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

---

### P1 — Blocks revenue or user comprehension

**[ADV-069] Homepage: 15-section feed with no primary action — first-time visitors have no guided path**
- **Problem**: Homepage chains 15+ async components with no visual hierarchy. A new visitor cannot determine in 3 seconds what to do or why they are here. Hero relies on async components, delaying the first value-prop message.
- **Fix**: Restructure above-the-fold to: (1) fast-loading hero answering "What is Invest.com.au?" with one primary CTA; (2) three route cards (Compare / Browse / Find an Advisor); (3) all teasers below an anchor. Move async teasers below fold.
- **File**: `app/page.tsx`
- **Effort**: Large (design decision + 2–3 days build)

**[ADV-070] Broker Register: No pricing transparency before commitment — brokers sign up blind**
- **Problem**: Registration flow asks for full company + verification details but never surfaces advertising package pricing until after registration is complete. Brokers cannot evaluate ROI before investing time.
- **Fix**: Add a "Pricing preview" sidebar or step before final submission showing tier options from /advertise.
- **File**: `app/broker-portal/register/page.tsx`
- **Effort**: Medium

---

### P2 — Significant friction

#### Calculators & tools

**[ADV-071] Portfolio X-Ray and Tax Optimizer: Adding a holding silently fails on invalid input**
- **Problem**: Clicking "Add" with missing/invalid fields produces no visual response. Users do not know why their holding was not added.
- **Fix**: Inline validation messages below inputs; disable Add button until minimum required fields are valid.
- **File**: `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`
- **Effort**: Small

**[ADV-072] CompoundInterestClient: Save button has no loading or disabled state**
- **Problem**: Save button has no visible loading/disabled state during submission, allowing multiple clicks.
- **Fix**: Add disabled + "Saving…" text while in flight. Toast on success.
- **File**: `app/compound-interest-calculator/CompoundInterestClient.tsx`
- **Effort**: Small

**[ADV-073] FIRE Calculator: Goal save error cannot be dismissed or retried**
- **Problem**: Error message shown inline with no dismiss or Retry. Users stuck with persistent error.
- **Fix**: Add dismiss and Retry. Auto-dismiss after 8s.
- **File**: `app/fire-calculator/FireCalculatorClient.tsx`
- **Effort**: Small

**[ADV-074] X-Ray and Tax Optimizer: Holdings have no edit option — users must delete and re-add to fix a typo**
- **Problem**: Only per-row action is remove. Mistyped values require full delete + re-entry.
- **Fix**: Add edit icon that re-populates the add form with current values.
- **File**: `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`
- **Effort**: Medium

**[ADV-075] Tax Optimizer: Marginal tax bracket selector has no context about which year's rates these are**
- **Problem**: Bracket select shows values with no label identifying them as ATO Stage 3 rates for 2024–25.
- **Fix**: Add tooltip: "ATO Stage 3 rates 2024–25 including Medicare levy."
- **File**: `app/tax-optimizer/TaxOptimizerClient.tsx`
- **Effort**: Small

**[ADV-076] FIRE Calculator: Goal saved success message is small and inline — easily missed**
- **Problem**: "Saved — view + edit on your account dashboard." is small inline text.
- **Fix**: Prominent green toast: "Goal saved — View dashboard" for 4 seconds.
- **File**: `app/fire-calculator/FireCalculatorClient.tsx`
- **Effort**: Trivial

**[ADV-077] Calculators: "Copy link" falls back to browser alert() instead of a toast**
- **Problem**: FeeSimulatorClient uses alert("Link copied!") on desktop. Intrusive and inconsistent.
- **Fix**: Replace with inline toast: "Link copied to clipboard", auto-dismiss 2s.
- **File**: `app/fee-simulator/FeeSimulatorClient.tsx`
- **Effort**: Trivial

**[ADV-078] Multi-input calculators: No distinction between required and optional fields**
- **Problem**: XRayClient, TaxOptimizerClient, DebtCalculatorClient do not mark required vs optional fields.
- **Fix**: Add * to required labels, "(optional)" to optional ones. Form-level note "* Required fields".
- **File**: `app/portfolio-xray/XRayClient.tsx`, `app/tax-optimizer/TaxOptimizerClient.tsx`, `app/debt-calculator/DebtCalculatorClient.tsx`
- **Effort**: Small

#### Broker portal

**[ADV-079] Broker portal: Success toast may disappear before redirect is noticed**
- **Fix**: Delay redirect by 2s after toast, or show success banner at redirect destination.
- **File**: `app/broker-portal/campaigns/new/page.tsx` — **Effort**: Small

**[ADV-080] Broker portal: "Save as Template" uses native browser prompt() — inconsistent UI**
- **Fix**: Replace with modal dialog containing a labelled text input, char count, and validation.
- **File**: `app/broker-portal/campaigns/new/page.tsx` — **Effort**: Medium

**[ADV-081] A/B test "End" action has no confirmation — permanently stops test without warning**
- **Fix**: Confirmation modal before End only: "This will end the test permanently. Continue?"
- **File**: `app/broker-portal/ab-tests/page.tsx` — **Effort**: Small

**[ADV-082] Creative image URL gives no error feedback if URL is invalid or image fails to load**
- **Fix**: URL validation before save; error toast if image fails to load.
- **File**: `app/broker-portal/creatives/page.tsx` — **Effort**: Medium

**[ADV-083] Creative deletion uses native confirm() — no undo path**
- **Fix**: Replace confirm() with modal; post-delete toast with creative name.
- **File**: `app/broker-portal/creatives/page.tsx` — **Effort**: Medium

**[ADV-084] Analytics page shows no loading state when switching date ranges**
- **Fix**: Skeleton or spinner overlay during fetch. Disable range selector during fetch.
- **File**: `app/broker-portal/analytics/page.tsx` — **Effort**: Small

**[ADV-085] Edit campaign: Read-only fields for live campaigns not visually disabled**
- **Fix**: Explicitly disable placement + start-date fields for live campaigns with disabled styling + tooltip.
- **File**: `app/broker-portal/campaigns/[id]/edit/page.tsx` — **Effort**: Small

**[ADV-086] Budget-exhausted campaigns show no inline recovery path**
- **Fix**: Add "Increase Budget" button next to budget-exhausted campaigns.
- **File**: `app/broker-portal/page.tsx` — **Effort**: Small

**[ADV-087] Dayparting UI allows start hour without end hour — produces misleading "All day" summary**
- **Fix**: Require both when either is set. Real-time preview: "9:00 AM – [end required]". Validation on submit.
- **File**: `app/broker-portal/campaigns/new/page.tsx` — **Effort**: Small

**[ADV-088] Dashboard "This Week vs Last Week" uses ambiguous "prev" label**
- **Fix**: Show explicit date labels: "Previous 7 days (May 25–31)" vs "This week (Jun 1–7)".
- **File**: `app/broker-portal/page.tsx` — **Effort**: Small

#### Account / user dashboard

**[ADV-089] Subscription processing banner disappears without explaining what changed**
- **Fix**: After polling resolves, replace banner with: "Your subscription is now active. Premium features are enabled."
- **File**: `app/account/AccountClient.tsx` — **Effort**: Small

**[ADV-090] Refund success message does not state the processing timeline**
- **Fix**: "Refund processed. Expect the amount within 5–10 business days."
- **File**: `app/account/AccountClient.tsx` — **Effort**: Small

**[ADV-091] Goals form: No validation for target date in the past**
- **Fix**: Validate on submit: if target_date < today, show "Target date must be in the future".
- **File**: `app/account/goals/GoalsClient.tsx` — **Effort**: Small

**[ADV-092] Holdings form: Ticker field accepts any text — malformed tickers show "—" with no explanation**
- **Fix**: Client-side format validation. Error: "Enter a valid ticker (e.g. BHP.AX)".
- **File**: `app/account/holdings/HoldingsClient.tsx` — **Effort**: Small

**[ADV-093] Holdings: Price shown as "—" with no explanation of why**
- **Fix**: Add title attr: "Price unavailable — may be invalid ticker, unsupported exchange, or temporary data issue."
- **File**: `app/account/holdings/HoldingsClient.tsx` — **Effort**: Trivial

**[ADV-094] Holdings: Stale price indicator is too subtle — users may act on outdated prices**
- **Fix**: Warning icon adjacent to the price value itself with tooltip.
- **File**: `app/account/holdings/HoldingsClient.tsx` — **Effort**: Small

**[ADV-095] Account page: Saved comparisons count shows "Loading…" indefinitely on API failure**
- **Fix**: In catch block, set count to 0 or "—". Add 3s timeout fallback.
- **File**: `app/account/AccountClient.tsx` — **Effort**: Small

**[ADV-096] Goals form: No warning when current balance exceeds target — confusing >100% progress bar**
- **Fix**: Validate on submit: if current_balance > target, warn "Consider increasing target amount".
- **File**: `app/account/goals/GoalsClient.tsx` — **Effort**: Small

#### Advisor portal

**[ADV-097]** Analytics: Article Performance heading shows when section is empty — **Fix**: Conditionally render or unify heading + empty state — `app/advisor-portal/AnalyticsTab.tsx`

**[ADV-098]** Dashboard: Lead actions require scrolling right + navigating to Leads tab — **Fix**: Click-to-expand row with inline quick-actions — `app/advisor-portal/DashboardTab.tsx` — **Effort**: Medium

**[ADV-099]** Leads: "Your Lead Account" card is a wall of conditional text — **Fix**: Colour-coded primary status line — `app/advisor-portal/LeadsTab.tsx` — **Effort**: Medium

**[ADV-100]** Profile: Service/certification add has no immediate success feedback — **Fix**: Toast or client-side list update on add — `app/advisor-portal/ProfileDetailsTab.tsx` — **Effort**: Medium

**[ADV-101]** Settings: Session pricing shows "Loading…" placeholder — **Fix**: Skeleton loader instead — `app/advisor-portal/SettingsTab.tsx` — **Effort**: Small

**[ADV-102]** Team analytics: Spinner in centre with no skeleton — **Fix**: Replace with layout-matching skeleton — `app/advisor-portal/TeamTab.tsx` — **Effort**: Small

**[ADV-103]** Team: Seat request input silently disables below minimum — **Fix**: Inline validation explaining the minimum — `app/advisor-portal/TeamTab.tsx` — **Effort**: Small

**[ADV-104]** Billing: "Boost Visibility" cards lack benefit statements — **Fix**: One-line benefit per card — `app/advisor-portal/BillingTab.tsx` — **Effort**: Medium

**[ADV-105]** Profile: Specialisations/Languages have dual affordances (chips + text input) — **Fix**: Unify as searchable combo-box — `app/advisor-portal/ProfileDetailsTab.tsx` — **Effort**: Medium

**[ADV-106]** Leads: "Hot leads only" filter doesn't explain the threshold — **Fix**: Tooltip: "quality score 70+" — `app/advisor-portal/LeadsTab.tsx` — **Effort**: Small

**[ADV-107]** Dashboard: Profile completeness pills too small to tap on mobile — **Fix**: Stack fields vertically on mobile — `app/advisor-portal/DashboardTab.tsx` — **Effort**: Small

**[ADV-108]** Leads: Notes auto-save has no loading or success feedback — **Fix**: "Saving…" + "Saved" inline indicator — `app/advisor-portal/LeadsTab.tsx` — **Effort**: Small

**[ADV-109]** Dashboard: Weekly enquiries chart hidden entirely when no data — new advisors miss the feature — **Fix**: Always render section with empty state copy — `app/advisor-portal/DashboardTab.tsx` — **Effort**: Small

**[ADV-110]** Analytics: "Tips to Improve" hidden for complete advisors — **Fix**: Always render with next-level recommendations — `app/advisor-portal/AnalyticsTab.tsx` — **Effort**: Small

#### Empty states and content

**[ADV-111]** Academy empty state has no next step — **Fix**: Waitlist or "Browse guides" CTA — `app/academy/page.tsx` — **Effort**: Small

**[ADV-112]** Community empty state asks for email without showing what the forum will contain — **Fix**: Show anticipated forum category cards above waitlist — `app/community/page.tsx` — **Effort**: Medium

**[ADV-113]** Articles hub: No-results state has no escape hatch — **Fix**: Show trending articles + "Browse all" reset — `app/articles/ArticlesClient.tsx` — **Effort**: Medium

**[ADV-114]** Article share row: Missing WhatsApp and Facebook — **Fix**: Add `https://wa.me/?text={url}` and Facebook sharer links — `components/ArticleShareRow.tsx` — **Effort**: Small

**[ADV-115]** Articles: No "Save for later" / bookmark feature — **Fix**: Bookmark icon to /account/saved — `components/ArticleComments.tsx` — **Effort**: Medium

**[ADV-116]** Related articles grid returns null on no data — users hit content dead end — **Fix**: Fallback "You might also like" with 3–5 trending articles — `components/RelatedContentGrid.tsx` — **Effort**: Small

#### Revenue flows

**[ADV-117]** Advisor Apply: Photo upload is first in form — causes early abandonment — **Fix**: Move photo upload to final review step — `app/advisor-apply/page.tsx` — **Effort**: Small

**[ADV-118]** Advisor Apply: Long form has no progress indicator — **Fix**: Step-based progress e.g. "Step 2 of 4" — `app/advisor-apply/page.tsx` — **Effort**: Medium

**[ADV-119]** Broker Register: Success message doesn't explain what happens after approval — **Fix**: Add expected timeline + CTA to preview placements — `app/broker-portal/register/page.tsx` — **Effort**: Small

**[ADV-120]** Quotes post: No social proof at conversion point — **Fix**: Trust banner above form — `app/quotes/post/JobPostForm.tsx` — **Effort**: Small

**[ADV-121]** Quotes post: Success screen secondary CTA "Browse marketplace" distracts — **Fix**: Replace with "Share with an advisor you know" + expected quote timeline — `app/quotes/post/JobPostForm.tsx` — **Effort**: Small

**[ADV-122]** Get Matched quiz: No estimated time to complete — **Fix**: Add "~2 min remaining" adjacent to progress indicator — `app/get-matched/GetMatchedClient.tsx` — **Effort**: Small

**[ADV-123]** Advertise page: Pricing lacks CPC rates, minimums, and contract terms — **Fix**: Add small-print per tier — `app/advertise/page.tsx` — **Effort**: Small

**[ADV-124]** Advertise page: Placement listing has no "best for" guidance or CTR — **Fix**: Add "Recommended for" badges + estimated CTR — `app/advertise/page.tsx` — **Effort**: Medium

#### Discovery / navigation

**[ADV-125]** Advisors: GetMatched CTA positioned below filter UI — **Fix**: Reorder Hero → GetMatched → Filters → Results — `app/advisors/AdvisorsClient.tsx` — **Effort**: Small

**[ADV-126]** Invest marketplace: GetMatched appears after 8+ listings — **Fix**: Move to immediately after hero — `app/invest/page.tsx` — **Effort**: Small

**[ADV-127]** For-Advisors page: 6 competing CTAs cause decision paralysis — **Fix**: Consolidate to 2 primary CTAs — `app/for-advisors/page.tsx` — **Effort**: Small

**[ADV-128]** For-Advisors: Social proof stats appear after "How It Works" — **Fix**: Move stats band into or after hero — `app/for-advisors/page.tsx` — **Effort**: Small

**[ADV-129]** For-Advisors pricing: "Most Popular" card has weak visual treatment — **Fix**: Gradient background, stronger button, scale/shadow — `app/for-advisors/page.tsx` — **Effort**: Small

**[ADV-130]** Compare page: GetMatched renders before the H1 — **Fix**: Reorder: H1 → intro → GetMatched below — `app/compare/page.tsx` — **Effort**: Small

**[ADV-131]** Advisors page: Alert signup widget appears twice — **Fix**: Remove duplicate from EmptyState — `app/advisors/AdvisorsClient.tsx` — **Effort**: Small

**[ADV-132]** Homepage: GetMatchedEmbed and ResumeBanner co-located without clear separation — **Fix**: Separate sections; ResumeBanner conditional on returning logged-in users — `app/page.tsx` — **Effort**: Small

---

### P3 — Polish

**[ADV-133]** X-Ray: No guidance between adding holdings and Analyse — add "X holdings added. Ready?" status line — `app/portfolio-xray/XRayClient.tsx`

**[ADV-134]** CGT Calculator: No live-update signal — add "Updated" micro-badge on input change — `app/tools/cgt-calculator/CGTCalculatorClient.tsx`

**[ADV-135]** All calculators: No "Reset to defaults" button — affects 8 calculator files

**[ADV-136]** Fee Simulator: Slider tick labels overlap on mobile — show only min/max on narrow screens — `app/fee-simulator/FeeSimulatorClient.tsx`

**[ADV-137]** Debt Calculator: Removing a debt is instant with no undo — add 5s undo toast — `app/debt-calculator/DebtCalculatorClient.tsx`

**[ADV-138]** Compound/FIRE: Save feature not visible above fold — add anchor link in results — `app/compound-interest-calculator/CompoundInterestClient.tsx`

**[ADV-139]** Dividend Reinvestment: No crossover chart — add line chart with DRP vs Cash over time — `app/dividend-reinvestment-calculator/DividendReinvestmentClient.tsx`

**[ADV-140]** X-Ray: Broker selector has no "optional" label — add "Optional — select to see fee-switching savings" — `app/portfolio-xray/XRayClient.tsx`

**[ADV-141]** Broker portal: Active hours allows invalid time range — disable earlier end-time options — `app/broker-portal/campaigns/[id]/edit/page.tsx`

**[ADV-142]** A/B test create form lacks placeholder guidance — add placeholders + per-field requirement notes — `app/broker-portal/ab-tests/page.tsx`

**[ADV-143]** Analytics CSV export: No completion feedback — add toast "CSV export started" — `app/broker-portal/analytics/page.tsx`

**[ADV-144]** Campaign form required-field asterisks not visually distinct — style red, italicise "(optional)" — `app/broker-portal/campaigns/new/page.tsx`

**[ADV-145]** Campaign: Placement must be selected to see ad preview — show thumbnail in each placement card — `app/broker-portal/campaigns/new/page.tsx`

**[ADV-146]** ROI Estimator accepts extreme values — add "Typical customer value: $500–$2,000" hint — `app/broker-portal/campaigns/new/page.tsx`

**[ADV-147]** Copy creative URL shows no per-button state change — briefly change button text to "Copied!" — `app/broker-portal/creatives/page.tsx`

**[ADV-148]** Campaign status colour codes have no legend or tooltip — `app/broker-portal/page.tsx`

**[ADV-149]** Creative toggle has no loading state during API request — `app/broker-portal/creatives/page.tsx`

**[ADV-150]** Edit campaign form shows no diff of changed fields — `app/broker-portal/campaigns/[id]/edit/page.tsx`

**[ADV-151]** Goals: "0" balance/contribution looks missing rather than intentional — show "—" for not-set values — `app/account/goals/GoalsClient.tsx`

**[ADV-152]** Notifications: Mark-as-read shows no success confirmation — add toast — `app/account/notifications/NotificationsList.tsx`

**[ADV-153]** Manual balances: Amount label format ambiguity — update to "Amount (AUD, e.g. 25000)" — `app/account/net-worth/ManualBalancesPanel.tsx`

**[ADV-154]** Net worth: "X of Y holdings priced" label unexplained — add tooltip — `app/account/net-worth/page.tsx`

**[ADV-155]** Watchlist alerts toggle: Disabled state has no explanation — add title="Add watchlist items first to enable alerts" — `app/account/watchlist/page.tsx`

**[ADV-156]** Health score: Dimensionless "0" scores look like poor performance — show "—" for no-data dimensions — `app/account/health/page.tsx`

**[ADV-157]** Goals/Holdings "Adding…" button without spinner looks frozen — add spinner icon — `app/account/goals/GoalsClient.tsx`

**[ADV-158]** Net worth goal: 0% progress bar has no label — always show percentage label — `app/account/net-worth/page.tsx`

**[ADV-159]** Leads pipeline stage dropdown uses CRM jargon — add stage descriptions/tooltips — `app/advisor-portal/LeadsTab.tsx`

**[ADV-160]** Slack webhook setup requires multiple app switches on mobile — restructure as numbered steps + "Test connection" — `app/advisor-portal/SettingsTab.tsx`

**[ADV-161]** Earn: Zero-referral state shows all-zeros grid — add onboarding card explaining the programme — `app/advisor-portal/EarnTab.tsx`

**[ADV-162]** Dashboard: Leaderboard ranked/unranked styling inconsistent — apply consistent border/background — `app/advisor-portal/DashboardTab.tsx`

**[ADV-163]** Analytics: "Not enough peers" benchmark has no timeline or notification option — `app/advisor-portal/AnalyticsTab.tsx`

**[ADV-164]** Billing: "Outstanding" card has no explanation or action path — add sub-text + link to ledger — `app/advisor-portal/BillingTab.tsx`

**[ADV-165]** Academy breadcrumb doesn't reflect category depth — `app/academy/page.tsx`

**[ADV-166]** Social share buttons: No click feedback or analytics tracking — `components/ArticleShareRow.tsx`

**[ADV-167]** Article comments: Flat list with no threading (large effort) — `components/ArticleComments.tsx`

**[ADV-168]** Authors empty state: Generic copy — replace with "Write for us" CTA — `app/authors/page.tsx`

**[ADV-169]** Article detail: No print view — add print CSS class + button — `app/article/[slug]/page.tsx`

**[ADV-170]** Article detail: No reading progress indicator — add thin linear progress bar — `app/article/[slug]/page.tsx`

**[ADV-171]** Article detail: Table of Contents disappears while scrolling — make TOC sticky sidebar — `app/article/[slug]/page.tsx`

**[ADV-172]** About/Authors pages: No links into article library — add contextual guide links — `app/about/page.tsx`

**[ADV-173]** Broker Register: Slug field guidance insufficient — add tooltip explaining what a slug is — `app/broker-portal/register/page.tsx`

**[ADV-174]** Get Matched pre-fill banner: Doesn't highlight which fields are pre-filled — apply bg-blue-50 to pre-filled fields — `app/quotes/post/JobPostForm.tsx`

**[ADV-175]** Compare meta description says "safety" but H1 doesn't — align meta and H1 copy — `app/compare/page.tsx`

**[ADV-176]** Advisors page cards: Mix emoji and Icon components — replace emoji with Icon equivalents — `app/advisors/AdvisorsClient.tsx`

**[ADV-177]** For-Advisors: Contains user-facing "How to Choose" guides irrelevant to advisors — remove or reframe — `app/for-advisors/page.tsx`

**[ADV-178]** Academy: No links to related article guides — add "Read our CPD guides" sidebar section — `app/academy/page.tsx`

---

## Resolved / Shipped — 2026-06-07 UX sweep

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

---

