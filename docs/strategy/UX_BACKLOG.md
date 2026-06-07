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
All items ADV-070 through ADV-178 are shipped — see Resolved section below. Remaining open items:

---

### P1 — Blocks revenue or user comprehension

**[ADV-069] Homepage: above-the-fold restructure — async teasers below fold**
- **Status**: Partly done — route cards (Compare / Browse / Find an Advisor) added in `d80d99a1`. Remaining: move all async teasers below fold so hero is always fast-loading.
- **File**: `app/page.tsx`
- **Effort**: Large (design decision)

---

### P3 — Polish

**[ADV-139]** Dividend Reinvestment: No crossover chart showing DRP vs Cash over time — add line chart — `app/dividend-reinvestment-calculator/DividendReinvestmentClient.tsx` — **Effort**: Large

**[ADV-167]** Article comments: Flat list with no threading — `components/ArticleComments.tsx` — **Effort**: Very large (deprioritised)

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

---

