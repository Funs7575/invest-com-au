"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface HelpEntry {
  title: string;
  items: string[];
}

const helpContent: Record<string, { description: string; tips: HelpEntry[] }> = {
  "/admin": {
    description: "Your command center. See real-time stats, content health, and revenue forecasts at a glance. Everything important about the site is summarised here so you can spot issues quickly.",
    tips: [
      { title: "KPI Cards", items: ["Click any card to jump directly to its detail page.", "Sparklines show 7-day trends — rising lines are green, falling are red.", "Cards refresh automatically every few minutes while the page is open.", "Hover over a sparkline to see the exact value for each day."] },
      { title: "Data Quality", items: ["Red alerts = needs immediate fix (e.g. missing affiliate URLs that cost you revenue).", "Amber alerts = should fix within a few days.", "Blue alerts = informational, no action needed.", "Resolve all red items before tackling amber ones."] },
      { title: "Revenue Forecast", items: ["Based on your EPC (Earnings Per Click) values set in Affiliate Links.", "Set up EPC for each broker to get accurate projections.", "The forecast updates daily — check it weekly to spot revenue trends.", "If a broker's EPC changes, update it immediately for accurate forecasts."] },
    ],
  },
  "/admin/brokers": {
    description: "Manage every broker listing that appears on comparison pages and individual broker profiles. Each broker needs a name, URL slug, fee details, and an affiliate link to earn revenue.",
    tips: [
      { title: "Key Fields", items: ["Slug — the URL identifier, e.g. \"commbank\" creates the page /broker/commbank.", "Rating — 0 to 5 scale; higher-rated brokers appear first in comparison tables.", "Status — only brokers set to \"active\" are visible on the public site.", "Logo URL — upload a square PNG or SVG so the broker looks professional."] },
      { title: "Fees", items: ["ASX Fee — the brokerage cost for trading Australian shares.", "US Fee — the brokerage cost for trading US shares.", "FX Rate — the currency conversion fee as a percentage.", "Always double-check fee data against the broker's official pricing page."] },
      { title: "Sponsorship", items: ["Featured Partner — shown in the most prominent ad placements across the site.", "Editor's Pick — shown with a special badge on comparison tables.", "Deal — enables the promotional deal banner on the broker's profile page.", "Only one broker should be Featured Partner at a time to maintain credibility."] },
      { title: "Common Tasks", items: ["To add a new broker: click 'Add Broker', fill in all required fields, set status to 'active'.", "To temporarily hide a broker: change status to 'inactive' (data is preserved).", "To update fees: edit the broker and save — changes appear on the site immediately.", "Always add an affiliate link after creating a broker so clicks generate revenue."] },
    ],
  },
  "/admin/articles": {
    description: "Create and manage all editorial content on the site. Articles can be saved as drafts, scheduled for future publication, or published immediately for readers to see.",
    tips: [
      { title: "Publishing Workflow", items: ["Draft — only visible here in admin, not on the public site.", "Scheduled — will publish automatically at the set date and time (auto-publish cron must be enabled).", "Published — live on the site immediately for all visitors.", "You can revert a published article back to draft if you need to make major changes."] },
      { title: "SEO Best Practices", items: ["Meta Title & Description are critical for Google search rankings.", "Keep meta descriptions under 160 characters or Google will truncate them.", "Slugs should be descriptive and use hyphens (e.g. 'best-broker-for-beginners').", "Add a featured image — articles with images get more clicks from search results."] },
      { title: "Content Tips", items: ["Link related brokers to show comparison widgets inside the article.", "Evergreen articles (not time-sensitive) are flagged differently in staleness reports.", "Use the category and tag fields to help readers discover related content.", "Articles with more than 1,500 words tend to rank better in search engines."] },
    ],
  },
  "/admin/content-calendar": {
    description: "Plan and schedule your entire content pipeline visually. Drag items to reschedule, see what is in progress versus already published, and never miss a publishing deadline.",
    tips: [
      { title: "Workflow Stages", items: ["Idea — a topic you want to cover but have not started writing.", "Drafting — someone is actively writing the article.", "Review — the article is written and needs editorial review before publishing.", "Scheduled — approved and waiting for its publish date.", "Published — live on the site for readers."] },
      { title: "Using the Calendar", items: ["Drag any item to a new date to reschedule it instantly.", "Link calendar items to articles so publishing happens automatically.", "Colour-coded status bars make it easy to see your pipeline at a glance.", "Click any item to open its details or jump to the article editor."] },
      { title: "Planning Tips", items: ["Aim for at least 2-3 articles per week for consistent SEO growth.", "Use the AI draft generator to create a starting point for new articles.", "Balance evergreen content with timely news pieces.", "Schedule seasonal content (tax time, EOFY) well in advance."] },
    ],
  },
  "/admin/scenarios": {
    description: "Investment scenario guides help users find the best broker for their specific situation (e.g. \"Best broker for kids\", \"Best for day trading\"). Each scenario page links to the most relevant brokers.",
    tips: [
      { title: "Key Fields", items: ["Slug — the URL path, e.g. \"kids\" creates the page /scenario/kids.", "Brokers — comma-separated broker slugs to feature on this scenario page.", "Considerations — bullet points shown to users explaining what matters for this scenario, one per line.", "Description — a short summary shown in search results and social media previews."] },
      { title: "Creating Good Scenarios", items: ["Focus on a real user need — 'best broker for beginners' is better than 'cheap brokers'.", "Include 3-5 brokers per scenario so users have enough choice.", "Write considerations that explain WHY each factor matters, not just what it is.", "Link to the detailed broker profiles so users can learn more."] },
    ],
  },
  "/admin/quiz-questions": {
    description: "Manage the broker recommendation quiz that helps visitors find their ideal broker. Users answer these questions and get matched to brokers based on how you configure Quiz Weights.",
    tips: [
      { title: "How It Works", items: ["Each question has options with keys (e.g. \"beginner\", \"advanced\").", "Keys are matched against Quiz Weights to score each broker.", "Order Index determines the display sequence — lower numbers appear first.", "You need at least 3 active questions for a useful quiz experience."] },
      { title: "Writing Good Questions", items: ["Keep questions simple — users should understand them instantly.", "Use plain language, avoid jargon like 'market capitalisation' or 'P/E ratio'.", "Limit to 3-5 answer options per question to avoid overwhelming users.", "Test the quiz yourself after making changes to check the flow feels natural."] },
    ],
  },
  "/admin/quiz-weights": {
    description: "Control how quiz answers map to broker recommendations. Each broker gets a score for each possible answer, and the quiz adds them up to rank brokers. Higher weights mean a stronger match.",
    tips: [
      { title: "Scoring System", items: ["Each broker has a weight from 0 to 100 for each quiz answer key.", "The quiz totals up weights across all the user's answers to rank brokers.", "Example: Give CommSec 90 for \"beginner\" if it is great for beginners.", "A weight of 0 means that answer has no influence on that broker's ranking."] },
      { title: "Best Practices", items: ["Review weights after adding a new broker to ensure it appears in relevant results.", "Test the quiz with different answer combinations to verify rankings feel right.", "Update weights when broker features change (e.g. a broker adds US share trading).", "Avoid giving every broker high weights — differentiation is key to useful results."] },
    ],
  },
  "/admin/affiliate-links": {
    description: "Manage the affiliate URLs, call-to-action button text, and revenue tracking for every broker. These are the links visitors click when they decide to sign up with a broker — they are your primary revenue source.",
    tips: [
      { title: "Revenue Tracking", items: ["EPC = Estimated Earnings Per Click. Set this from your affiliate program dashboard data.", "Revenue forecasts on the admin dashboard use these EPC values, so keep them current.", "Commission Type: CPA (one-time per signup), RevShare (ongoing percentage), or Hybrid (both).", "Update EPC values monthly for the most accurate revenue projections."] },
      { title: "Link Health", items: ["Links are auto-checked daily (if the cron job is enabled in Site Settings).", "Broken links mean $0 revenue — fix them immediately when alerted.", "You will receive email alerts when a link is detected as broken.", "Test links manually after updating them to confirm they redirect correctly."] },
      { title: "CTA Best Practices", items: ["CTA text appears on buttons across the site (e.g. 'Open Account', 'Get Started').", "Use action-oriented language that tells the user what will happen next.", "Short CTAs (2-4 words) perform better than long ones.", "A/B test different CTA text to find what converts best for each broker."] },
    ],
  },
  "/admin/deal-of-month": {
    description: "Feature one broker as the \"Deal of the Month\" with a promotional banner shown across the entire site. This is a high-visibility promotion that drives significant clicks.",
    tips: [
      { title: "Setup", items: ["Select a broker and set the deal_text field on their broker profile.", "Only one broker can be the Deal of the Month at a time.", "Deals auto-expire if an end date is set (requires the cron job to be active).", "Write compelling deal text — mention specific savings or bonuses."] },
      { title: "Best Practices", items: ["Rotate the Deal of the Month regularly to keep the site feeling fresh.", "Coordinate with the broker's marketing team for exclusive offers.", "Check that the broker's affiliate link is working before featuring them.", "Monitor click-through rates to see which deal text performs best."] },
    ],
  },
  "/admin/subscribers": {
    description: "View and manage all email signups from across the site. This includes quiz leads (visitors who completed the broker recommendation quiz), newsletter subscribers, and other email captures.",
    tips: [
      { title: "Signup Sources", items: ["Quiz — completed the broker recommendation quiz and left their email.", "Newsletter — signed up for the weekly email newsletter.", "Footer — entered their email in the site footer signup form.", "Article — signed up via the email capture form inside an article."] },
      { title: "Managing Subscribers", items: ["Use filters to segment subscribers by source, date, or status.", "Export the list as CSV for use in your email marketing platform.", "Unsubscribed users are kept in the list but marked as inactive.", "Never send emails to unsubscribed users — this violates Australian spam laws."] },
    ],
  },
  "/admin/pro-subscribers": {
    description: "Manage Pro plan members who pay for premium content, exclusive broker deals, and an ad-free browsing experience. Their subscriptions are processed through Stripe.",
    tips: [
      { title: "Subscription Management", items: ["Subscriptions are created and billed through Stripe — do not modify Stripe data directly.", "\"Cancel\" sets cancel_at_period_end — the member keeps access until their current billing period ends.", "Use bulk actions to manage multiple members at once (e.g. send a group notification).", "Check Stripe for payment failures — failed payments can cause unexpected cancellations."] },
      { title: "Member Support", items: ["If a member reports access issues, check their subscription status here first.", "Pro members can be identified by the green 'Pro' badge next to their name.", "Refunds should be processed through Stripe, not manually here.", "Monitor churn rate — if many members cancel in a short period, investigate why."] },
    ],
  },
  "/admin/pro-deals": {
    description: "Exclusive deals only visible to Pro members. These special offers incentivise new Pro signups and help retain existing members by adding tangible value to the subscription.",
    tips: [
      { title: "Deal Lifecycle", items: ["Status flow: upcoming (visible with countdown) -> active (claimable) -> expired (archived).", "Featured deals are shown more prominently at the top of the Pro deals page.", "Link each deal to the broker's special Pro-only offer landing page.", "Set clear start and end dates so deals rotate automatically."] },
      { title: "Creating Effective Deals", items: ["Negotiate exclusive offers that are genuinely better than what the public gets.", "Include a specific dollar value or percentage discount so the benefit is clear.", "Limit deals to create urgency (e.g. 'first 50 sign-ups only').", "Announce new deals via the Pro newsletter to drive engagement."] },
    ],
  },
  "/admin/site-settings": {
    description: "Global configuration for the entire site — SEO defaults, homepage hero text, social media links, and trust signals. Changes here affect every page unless overridden at the page level.",
    tips: [
      { title: "SEO Settings", items: ["Site Title — appears in the browser tab and as the default title in Google results.", "Meta Description — the default description shown in search results (keep under 160 characters).", "These defaults are used on any page that does not have its own SEO fields filled in.", "Update these if you rebrand or change the site's focus."] },
      { title: "Homepage & Trust", items: ["Hero Headline — the main text visitors see on the homepage.", "Visitor Count & User Rating — shown as trust signals to build credibility.", "Media Logos — comma-separated image URLs for the 'As seen in' section.", "Keep trust signals updated — outdated numbers reduce credibility."] },
      { title: "Technical Settings", items: ["Social links — your Twitter, Facebook, and LinkedIn profile URLs for the footer.", "Cron job toggles — enable or disable automated tasks like link checking and auto-publish.", "Changes take effect immediately after saving — no need to restart anything."] },
    ],
  },
  "/admin/calculator-config": {
    description: "Configure the brokerage fee calculator that lets visitors compare costs across brokers. Each config defines fee parameters for a specific broker and trade type (ASX, US, ETFs, etc.).",
    tips: [
      { title: "How It Works", items: ["Visitors enter a trade value and the calculator compares fees across all configured brokers.", "Fee Type: flat (fixed dollar amount), percentage (% of trade value), or tiered (different rates at different brackets).", "Make sure fee data matches the broker's current official pricing — outdated data hurts credibility.", "The calculator is one of the site's most-used tools, so accuracy is critical."] },
      { title: "Configuration Tips", items: ["Add a config for each trade type a broker supports (ASX, US, ETFs, etc.).", "For tiered pricing, define each bracket with its threshold and rate.", "Test the calculator after making changes to verify the output looks correct.", "Include a 'last updated' note so visitors know the data is current."] },
    ],
  },
  "/admin/team-members": {
    description: "Manage the editorial team displayed on articles and the about page. Team members can be linked as authors on articles, which builds trust and adds a personal touch to content.",
    tips: [
      { title: "Key Fields", items: ["Role — displayed under their name on articles (e.g. 'Senior Editor', 'Financial Analyst').", "LinkedIn/Twitter — linked from their author bio so readers can verify credentials.", "Photo URL — headshot shown on articles and the about page (use a professional photo).", "Bio — a short paragraph about their expertise, shown on the about page."] },
      { title: "Best Practices", items: ["Every published article should have an author assigned for credibility.", "Keep bios updated when team members change roles or credentials.", "Use real photos — stock photos damage trust with readers.", "Add qualifications (e.g. CFA, financial adviser licence number) where applicable."] },
    ],
  },
  "/admin/user-reviews": {
    description: "Moderate user-submitted broker reviews. Every review must be approved by an admin before it appears on the broker's public page. This protects against spam and fake reviews.",
    tips: [
      { title: "Moderation Workflow", items: ["Pending — submitted by a user, waiting for your review.", "Approved — visible on the broker's public page for all visitors.", "Rejected — hidden from the public site but kept in records for auditing.", "Reviews include a verified email check — prioritise reviews from verified emails."] },
      { title: "Review Quality", items: ["Look for specific details — genuine reviews mention features, not just 'great broker'.", "Check for competitor spam — fake negative reviews from rival broker users.", "Flag reviews that contain personal information or inappropriate language.", "High-quality user reviews improve SEO and build social proof on broker pages."] },
    ],
  },
  "/admin/questions": {
    description: "Moderate user-submitted questions about brokers. Once approved with an answer, these appear as an FAQ section on the broker's page, helping other visitors and improving search rankings.",
    tips: [
      { title: "Workflow", items: ["Users submit questions directly from broker profile pages.", "Review the question, write a helpful answer, then approve to make it visible.", "Rejected questions are hidden but kept for records.", "Good questions with thorough answers improve SEO with user-generated content."] },
      { title: "Answering Tips", items: ["Write answers in plain language — avoid financial jargon where possible.", "Include specific details like fee amounts or feature names when relevant.", "Link to related articles or the broker's official page for more information.", "Keep answers concise — aim for 2-3 sentences that directly address the question."] },
    ],
  },
  "/admin/switch-stories": {
    description: "User stories about switching brokers. These real experiences serve as powerful social proof, helping other visitors gain confidence in their decision to switch.",
    tips: [
      { title: "Moderation", items: ["Review each story for authenticity before approving — look for specific details.", "Good stories include the 'from' and 'to' broker with clear reasons for switching.", "Featured stories get more visibility on the homepage and relevant broker pages.", "Reject stories that read like marketing copy or lack genuine detail."] },
      { title: "Encouraging Submissions", items: ["Prompt users to share their story after they click a broker affiliate link.", "The best stories mention specific pain points and how the new broker solved them.", "Stories with dollar amounts (e.g. 'saving $50/month in fees') are especially compelling.", "Consider reaching out to frequent users and asking them to share their experience."] },
    ],
  },
  "/admin/health-scores": {
    description: "Track the health and trustworthiness of every broker across regulatory compliance, financial stability, and client money safety dimensions. Low scores flag risky brokers that may need warnings on their profile pages.",
    tips: [
      { title: "Score Dimensions", items: ["Overall Score — a weighted average of all dimensions combined.", "Regulatory — based on AFSL status, compliance history, and ASIC enforcement actions.", "Financial Stability — balance sheet health, parent company backing, and years in operation.", "Client Money — how client funds are held (segregated accounts, trust structures)."] },
      { title: "Maintenance", items: ["Update scores whenever new ASIC data or financial reports are released.", "Brokers with scores below 50 should have a warning banner on their profile page.", "Review all scores at least quarterly to keep information current.", "Document your reasoning when changing scores for audit trail purposes."] },
    ],
  },
  "/admin/regulatory-alerts": {
    description: "Track regulatory changes that affect brokers — ASIC enforcement actions, licence changes, new compliance requirements, and industry-wide policy updates. Active alerts are shown to site visitors.",
    tips: [
      { title: "Alert Fields", items: ["Severity: critical (licence revoked) > high (enforcement action) > medium (new requirement) > low (policy update).", "Status: active alerts are displayed to visitors on affected broker pages, resolved ones are archived.", "Effective Date — when the regulation or action takes effect.", "Affected Brokers — link the alert to specific brokers so it appears on their pages."] },
      { title: "Response Process", items: ["Critical alerts should be created within hours of the ASIC announcement.", "Update the affected broker's health score when creating a regulatory alert.", "Resolve alerts when the issue has been addressed or is no longer relevant.", "Keep a record of all alerts for compliance and editorial accountability."] },
    ],
  },
  "/admin/quarterly-reports": {
    description: "Manage quarterly market reports that compare broker performance, fee changes, and industry trends. These long-form reports establish the site as an authoritative source in the Australian brokerage space.",
    tips: [
      { title: "Publishing Workflow", items: ["Draft the report, then have it reviewed before publishing.", "Published reports are available to all visitors on the site.", "Pro-only reports are gated — only Pro subscribers can read the full content.", "Schedule reports to publish at the start of each quarter for consistency."] },
      { title: "Content Guidelines", items: ["Include fee comparison tables with data from the Calculator Config page.", "Highlight notable changes — new brokers, fee reductions, platform updates.", "Use charts and graphs to make data easier to understand.", "Link to individual broker profiles for readers who want more detail."] },
    ],
  },
  "/admin/broker-transfer-guides": {
    description: "Step-by-step guides for transferring shares between brokers. These pages cover CHESS transfers, in-specie transfers, and full account transfers with estimated timelines and costs.",
    tips: [
      { title: "Key Fields", items: ["Transfer Type: chess_transfer (CHESS-sponsored shares), in_specie (managed funds), or full_transfer (entire portfolio).", "Timeline — estimated business days for completion (be conservative, delays are common).", "Steps — numbered instructions shown to users; write each step clearly for beginners.", "CHESS Fee — the cost charged by the source broker, usually $0-$55 per holding."] },
      { title: "Writing Good Guides", items: ["Use plain language — most users have never transferred shares before.", "Include what documents or information the user needs before they start.", "Mention common pitfalls like corporate actions freezing transfers.", "Link to both the source and destination broker's profile pages for context."] },
    ],
  },
  "/admin/consultations": {
    description: "Manage 1-on-1 consultation products that users can book with financial experts. Each consultation is a paid session tied to a Stripe payment product and a booking calendar.",
    tips: [
      { title: "Setup", items: ["Stripe Product ID — links to the Stripe payment product for billing.", "Cal Link — the booking calendar URL where users choose a time slot.", "Featured consultations get prominent homepage placement.", "Status flow: draft (hidden) -> published (bookable) -> archived (no longer available)."] },
      { title: "Managing Consultations", items: ["Set a clear title and description so users know exactly what they are booking.", "Include the consultant's qualifications and experience in the description.", "Price should reflect the session length (e.g. 30 min vs 60 min).", "Archive old consultations instead of deleting them to preserve booking history."] },
    ],
  },
  "/admin/courses": {
    description: "Manage investment education courses. Courses can be free for everyone, paid with a one-time purchase, or exclusive to Pro subscribers. Each course contains structured lessons.",
    tips: [
      { title: "Pricing Models", items: ["Free — available to all visitors, great for lead generation.", "Paid — one-time purchase via Stripe; set both regular and Pro-discounted prices.", "Pro Exclusive — only accessible to Pro subscribers, adds value to the subscription.", "Revenue Share — percentage paid to the course creator (if using external authors)."] },
      { title: "Course Management", items: ["Organise lessons in a logical order using the order index field.", "Include a compelling course description and thumbnail image.", "Set prerequisites if a course builds on knowledge from another course.", "Monitor completion rates — low completion may indicate the course is too long or complex."] },
    ],
  },
  "/admin/marketplace": {
    description: "Overview of the broker advertising marketplace. Brokers deposit funds into wallets and run CPC (cost-per-click) or featured campaigns to promote their listings across the site. This is a major revenue stream.",
    tips: [
      { title: "How It Works", items: ["Brokers register for the marketplace -> deposit funds into their wallet -> create campaigns.", "CPC campaigns charge the broker each time a visitor clicks their ad.", "Featured campaigns charge a flat monthly rate for guaranteed placement.", "Budget enforcement and stats aggregation run automatically via the daily cron job."] },
      { title: "KPI Cards", items: ["Total Deposits — lifetime wallet top-ups across all participating brokers.", "Active Campaigns — number of campaigns currently serving ads and billing.", "Pending Reviews — campaigns submitted by brokers awaiting your approval.", "Today's Revenue — total CPC charges deducted from broker wallets today."] },
      { title: "Admin Responsibilities", items: ["Review and approve/reject new campaigns promptly (brokers expect 24-hour turnaround).", "Monitor broker wallet balances — low wallets cause campaigns to auto-pause.", "Check the reconciliation page weekly for any financial discrepancies.", "Use the intelligence dashboard to identify underperforming brokers who may need help."] },
    ],
  },
  "/admin/marketplace/campaigns": {
    description: "Review, approve, or reject broker advertising campaigns. This is your campaign review queue. Filter by status to manage pending reviews efficiently and keep brokers happy with fast turnaround.",
    tips: [
      { title: "Review Workflow", items: ["Pending Review — a broker submitted this campaign and it needs your decision.", "Approve to set status to 'approved' (it auto-activates when the start date arrives).", "Reject with a note — the broker sees your feedback and can revise and resubmit.", "Aim to review all pending campaigns within 24 hours of submission."] },
      { title: "Status Guide", items: ["Active — live on the site and billing per click or monthly.", "Paused — temporarily stopped by the broker, no charges accrue.", "Budget Exhausted — the campaign's total budget was used up, auto-stopped.", "Completed — the end date was reached, campaign finished normally.", "Cancelled — permanently stopped by the broker, cannot be restarted."] },
      { title: "Review Tips", items: ["Check the broker's wallet balance before approving — low balance means campaigns pause quickly.", "Use review notes to suggest improvements to the broker's rate or targeting.", "Bulk actions let you approve or reject multiple campaigns at once.", "Watch for campaigns with unrealistically low daily budgets — they will barely run."] },
    ],
  },
  "/admin/marketplace/brokers": {
    description: "Manage marketplace broker accounts, invite new brokers to join the advertising platform, view their wallet balances, and make manual wallet adjustments for credits or corrections.",
    tips: [
      { title: "Account Statuses", items: ["Active — the broker can log in, create campaigns, and top up their wallet.", "Pending — the broker has registered but needs your approval before they can participate.", "Suspended — temporarily blocked from the marketplace (existing campaigns are paused).", "Invite new brokers by entering their slug — they will receive a registration email with instructions."] },
      { title: "Wallet Adjustments", items: ["Use manual adjustments to give promotional credits (e.g. $50 welcome bonus for new brokers).", "Every adjustment is logged in the wallet_transactions table for a complete audit trail.", "Positive amounts = credit added to wallet. Negative amounts = debit removed from wallet.", "Always include a clear reason note when making manual adjustments."] },
      { title: "Onboarding New Brokers", items: ["Send the invite, then follow up to ensure they complete registration.", "Guide them to accept marketplace terms in their Settings page.", "Suggest they start with a $100-$200 deposit and a single test campaign.", "Point them to the broker portal help panel for self-service guidance."] },
    ],
  },
  "/admin/marketplace/placements": {
    description: "Define and manage ad inventory slots across the site. Each placement represents a specific position on a page where broker ads can appear. This controls where advertising revenue comes from.",
    tips: [
      { title: "Key Fields", items: ["Slug — unique identifier, e.g. 'compare-top' (cannot be changed after creation).", "Inventory Type — 'cpc' (broker pays per click) or 'featured' (flat monthly rate).", "Max Slots — how many campaigns can win simultaneously (e.g. 2 = the top 2 bidders are shown).", "Base Rate — minimum bid in cents. Brokers cannot bid below this amount."] },
      { title: "How Allocation Works", items: ["On each page load, the system picks the top N bidders (by rate) who pass budget and wallet checks.", "Higher rate = higher priority. Ties break by admin-set priority, then by creation date.", "Stats like monthly impressions and average CTR refresh daily via the cron job.", "If no paid campaigns qualify, the system falls back to sponsorship-tier placements."] },
      { title: "Optimising Inventory", items: ["Monitor fill rate — if placements often go unfilled, the base rate may be too high.", "Add new placements gradually and promote them to brokers before launch.", "High-CTR placements can command higher base rates — adjust quarterly.", "Check the attribution page to see which placements generate the most value."] },
    ],
  },
  "/admin/marketplace/packages": {
    description: "Define advertising package tiers that brokers can subscribe to. Higher tiers unlock CPC rate discounts and included featured placements, incentivising brokers to commit to larger budgets.",
    tips: [
      { title: "Package Tiers", items: ["Starter — free tier with standard CPC rates, good for brokers just testing the marketplace.", "Growth — small CPC discount plus included featured placement slots.", "Dominance — larger CPC discount, more featured slots, and priority support.", "Enterprise — custom pricing with a dedicated account manager and guaranteed impression share."] },
      { title: "Key Fields", items: ["CPC Rate Discount — percentage off the base CPC rate for package subscribers.", "Featured Slots Included — number of featured placements bundled into the monthly fee.", "Share of Voice — guaranteed impression percentage (available for enterprise tier only).", "Monthly Fee — charged to the broker's wallet at the start of each billing period."] },
      { title: "Pricing Strategy", items: ["Set package prices so that brokers spending above a threshold save money by upgrading.", "Review package pricing quarterly based on marketplace demand and fill rates.", "Offer time-limited promotions (e.g. first month free on Growth) to encourage upgrades.", "Enterprise packages should be negotiated individually — use this page to record the agreed terms."] },
    ],
  },
  "/admin/marketplace/decisions": {
    description: "Full audit trail of every ad allocation decision the system makes. See exactly which broker won each placement auction, which brokers were filtered out, and the specific reason why. Essential for debugging and revenue optimisation.",
    tips: [
      { title: "Reading Decisions", items: ["Winners (green rows) — campaigns selected to show on this particular page load.", "Rejected (amber rows) — campaigns that were filtered out, with a specific reason shown.", "Common rejection reasons: daily_budget_hit, total_budget_exhausted, zero_wallet_balance, end_date_passed, outbid_no_slot.", "Each decision record includes a timestamp, placement slug, and the full list of candidates considered."] },
      { title: "KPIs", items: ["Decisions with Winners — percentage of page loads that successfully served a paid ad.", "Fallback Rate — percentage of page loads using the sponsorship tier because no paid campaign qualified.", "Avg Duration — how fast the allocation engine runs in milliseconds (healthy = under 50ms).", "A healthy marketplace has a fallback rate below 20%."] },
      { title: "Troubleshooting", items: ["High fallback rate? Check whether campaigns are active and broker wallets have sufficient funds.", "All candidates rejected? Look for patterns like daily_budget_hit or zero_wallet_balance.", "Use the date range filter to compare allocation health across different time periods.", "If a specific broker is consistently outbid, suggest they increase their CPC rate."] },
    ],
  },
  "/admin/marketplace/attribution": {
    description: "Understand exactly where clicks and conversions originate — broken down by page, device type, and placement. Use this data to optimise ad inventory and advise brokers on where to focus their budgets.",
    tips: [
      { title: "Analysis Tabs", items: ["Overview — aggregate clicks, impressions, spend, and CTR across all placements.", "By Page — which site pages generate the most clicks (comparison, quiz, homepage, articles).", "By Device — mobile vs desktop vs tablet breakdown of all click activity.", "By Placement — performance of each ad slot (compare-top, quiz-boost, deals-featured, etc.)."] },
      { title: "Using This Data", items: ["High impressions + low CTR on a placement suggests the ad creative needs improvement.", "If mobile dominates, ensure broker landing pages are mobile-optimised.", "Export CSV for offline analysis or to share performance reports with broker partners.", "Compare attribution data month-over-month to spot trends and seasonal patterns."] },
      { title: "Revenue Optimisation", items: ["Focus on placements with high CTR — these justify higher base rates.", "Pages with many impressions but few clicks may need better ad positioning.", "Share attribution insights with brokers to help them choose the best placements.", "Use this data to inform pricing decisions for new placements you create."] },
    ],
  },
  "/admin/marketplace/intelligence": {
    description: "AI-powered intelligence dashboard that health-scores every broker, auto-generates consulting insights, and surfaces revenue opportunities. This is your strategic command centre for growing marketplace revenue.",
    tips: [
      { title: "Dashboard Tabs", items: ["Portfolio Overview — 8 KPIs with trends and a daily revenue chart.", "Broker Scorecard — A-to-F health grades based on CTR, conversions, wallet balance, activity, and spend momentum.", "Consulting Insights — auto-generated recommendations sorted by severity (critical, warning, info).", "Revenue Analytics — revenue breakdown by broker, by placement, and daily trend chart.", "Performance Heatmap — a broker-by-placement grid showing CTR or spend intensity at a glance."] },
      { title: "Health Grades", items: ["A (80+) — excellent performer, keep them engaged and renewing.", "B (65-79) — good overall, minor optimisation opportunities exist.", "C (45-64) — average performance, needs proactive attention and suggestions.", "D (25-44) — underperforming, reach out with specific recommendations.", "F (below 25) — at risk of leaving the marketplace, take immediate action."] },
      { title: "Acting on Insights", items: ["Critical insights (red) — revenue-impacting issues, take action within 24 hours.", "Warning insights (amber) — address within a week before they become critical.", "Info insights (blue) — improvement opportunities, not urgent but valuable.", "Use the 'Send Notification' quick action button to alert brokers directly from this page."] },
    ],
  },
  "/admin/marketplace/sponsor-billing": {
    description: "Manage monthly billing for sponsored and featured broker partnerships. Generate invoices, track payment status, and handle overdue accounts. This covers billing outside of the CPC wallet system.",
    tips: [
      { title: "Invoice Workflow", items: ["Generate an invoice — it starts with status 'pending'.", "Mark as 'paid' when payment is received (check your bank or payment processor).", "Overdue invoices are highlighted automatically after 30 days without payment.", "Use 'waive' for promotional arrangements or partnership credits."] },
      { title: "Tier Pricing", items: ["Pricing is defined per sponsorship tier: featured_partner, editors_pick, deal_of_month, etc.", "Custom rates can override the tier defaults for individual brokers with special agreements.", "Invoice periods are typically monthly or quarterly — set this per broker.", "Review tier pricing annually to ensure it reflects the value delivered."] },
      { title: "Collections Process", items: ["Send a reminder email when an invoice is 7 days overdue.", "Escalate at 30 days — consider pausing the broker's sponsored placement.", "At 60 days, suspend the sponsorship until payment is received.", "Keep notes on each invoice for any payment discussions or agreements."] },
    ],
  },
  "/admin/marketplace/reconciliation": {
    description: "Financial health check. Compare wallet balances against deposit/spend totals to detect discrepancies.",
    tips: [
      { title: "How It Works", items: ["Expected Balance = Lifetime Deposited − Lifetime Spent.", "If actual balance differs from expected, a discrepancy is flagged.", "Common causes: failed webhook, manual adjustment, race condition."] },
      { title: "Actions", items: ["Use 'Show Issues Only' filter to focus on discrepancies.", "Small discrepancies (<$1) are usually rounding and can be ignored.", "Larger discrepancies need investigation — check wallet_transactions table."] },
    ],
  },
  "/admin/marketplace/support": {
    description: "Handle support tickets from marketplace brokers. Respond to billing, campaign, and technical queries.",
    tips: [
      { title: "Priority Handling", items: ["Urgent — respond within 1 hour (revenue-impacting issues).", "High — respond within 4 hours.", "Normal — respond within 24 hours.", "Low — respond within 48 hours."] },
      { title: "Ticket Management", items: ["Reply to a ticket to change status to 'in_progress'.", "Set 'waiting_reply' when you need info from the broker.", "Close resolved tickets — broker can reopen by replying.", "Category helps route tickets: billing, campaigns, technical, account, general."] },
    ],
  },
  "/admin/moderation": {
    description: "Review user-submitted content across the site — reviews, questions, switch stories. Approve or reject to maintain quality.",
    tips: [
      { title: "Moderation Queue", items: ["Items are sorted by submission date (newest first).", "The badge count in the sidebar shows total pending items.", "Approve to make content live on the site.", "Reject with a reason to keep records."] },
      { title: "Best Practices", items: ["Check for spam, offensive language, and fake content.", "Verified emails are more likely to be genuine.", "Good user content improves SEO and social proof."] },
    ],
  },
  "/admin/analytics": {
    description: "Detailed view of affiliate click data, traffic sources, and conversion trends.",
    tips: [
      { title: "Metrics", items: ["Clicks — total affiliate link clicks.", "Sources — where traffic comes from.", "Use this data to optimise article placements and CTA text."] },
    ],
  },
  "/admin/audit-log": {
    description: "Chronological record of all admin actions — who changed what and when. Useful for accountability and debugging.",
    tips: [
      { title: "Actions", items: ["Create (green) — new record added.", "Update (blue) — existing record modified.", "Delete (red) — record removed.", "Filter by entity type to find specific changes."] },
    ],
  },
  "/admin/export-import": {
    description: "Backup and restore site data. Export creates a JSON/CSV snapshot, import lets you restore from a backup.",
    tips: [
      { title: "Best Practices", items: ["Export before making bulk changes.", "Keep backups in a safe location.", "Import will overwrite existing data — use with caution."] },
    ],
  },
};

// Map routes to their walkthrough localStorage keys
const walkthroughKeys: Record<string, string> = {
  "/admin": "wt_admin_dashboard",
};

export default function AdminHelpPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const content = helpContent[pathname];
  const walkthroughKey = walkthroughKeys[pathname || ""];

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!content) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-lg font-bold transition-all ${
          open
            ? "bg-slate-800 text-white rotate-45 scale-110"
            : "bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 hover:shadow-md"
        }`}
        aria-label={open ? "Close help" : "Help for this page"}
        title="Page help & tips"
      >
        {open ? "+" : "?"}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/10 md:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-16 right-4 z-40 w-80 max-h-[70vh] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">💡</span>
                <h3 className="text-sm font-bold text-slate-900">Page Guide</h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{content.description}</p>
            </div>

            {/* Tips */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {content.tips.map((section) => (
                <div key={section.title}>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {section.title}
                  </h4>
                  <ul className="space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                        <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-[0.6rem] text-slate-400">
                  Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[0.55rem] font-mono">Esc</kbd> to close
                </p>
                {walkthroughKey && (
                  <button
                    onClick={() => {
                      localStorage.removeItem(walkthroughKey);
                      setOpen(false);
                      window.location.reload();
                    }}
                    className="text-[0.6rem] text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    Replay Page Tour
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
