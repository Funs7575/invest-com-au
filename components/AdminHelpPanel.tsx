"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface HelpEntry {
  title: string;
  items: string[];
}

const helpContent: Record<string, { description: string; tips: HelpEntry[] }> = {
  "/admin": {
    description: "Your command center. See real-time stats, content health, and revenue forecasts at a glance.",
    tips: [
      { title: "KPI Cards", items: ["Click any card to go to its detail page.", "Sparklines show 7-day trends."] },
      { title: "Data Quality", items: ["Red = needs immediate fix (e.g. missing affiliate URLs).", "Amber = should fix soon.", "Blue = informational."] },
      { title: "Revenue Forecast", items: ["Based on your EPC values in Affiliate Links.", "Set up EPC for each broker to get accurate projections."] },
    ],
  },
  "/admin/brokers": {
    description: "Manage broker listings that appear on comparison pages. Each broker needs a name, slug, fees, and affiliate URL.",
    tips: [
      { title: "Key Fields", items: ["Slug — URL identifier, e.g. \"commbank\" makes /broker/commbank.", "Rating — 0-5 scale, determines display order.", "Status — only \"active\" brokers appear on the public site."] },
      { title: "Fees", items: ["ASX Fee — brokerage for Australian shares.", "US Fee — brokerage for US shares.", "FX Rate — currency conversion fee percentage."] },
      { title: "Sponsorship", items: ["Featured Partner — shown in prominent placements.", "Editor's Pick — shown with a badge.", "Deal — enables the deal banner on the broker page."] },
    ],
  },
  "/admin/articles": {
    description: "Create and manage editorial content. Articles can be drafted, scheduled for future publication, or published immediately.",
    tips: [
      { title: "Publishing", items: ["Draft — only visible in admin.", "Scheduled — publishes automatically at the set date (requires auto-publish cron).", "Published — live on site immediately."] },
      { title: "SEO", items: ["Meta Title & Description are critical for search rankings.", "Keep meta descriptions under 160 characters.", "Slugs should be descriptive and use hyphens."] },
      { title: "Content Tips", items: ["Link related brokers to show comparison widgets in the article.", "Evergreen articles are flagged differently in staleness reports."] },
    ],
  },
  "/admin/content-calendar": {
    description: "Plan and schedule your content pipeline. Drag items to reschedule, track what's in progress vs published.",
    tips: [
      { title: "Workflow", items: ["Idea → Drafting → Review → Scheduled → Published.", "Link calendar items to articles for auto-publishing.", "Use the AI draft generator to create starting content."] },
    ],
  },
  "/admin/scenarios": {
    description: "Investment scenario guides (e.g. \"Best broker for kids\", \"Best for day trading\"). Each scenario links to relevant brokers.",
    tips: [
      { title: "Key Fields", items: ["Slug — URL path, e.g. \"kids\" makes /scenario/kids.", "Brokers — comma-separated broker slugs to feature.", "Considerations — bullet points shown to users, one per line."] },
    ],
  },
  "/admin/quiz-questions": {
    description: "Manage the broker recommendation quiz. Users answer these questions and get matched to brokers based on quiz weights.",
    tips: [
      { title: "How It Works", items: ["Each question has options with keys (e.g. \"beginner\", \"advanced\").", "Keys are matched against Quiz Weights to score each broker.", "Order Index determines the display sequence.", "Need at least 3 active questions for a good experience."] },
    ],
  },
  "/admin/quiz-weights": {
    description: "Control how quiz answers map to broker recommendations. Higher weights = stronger match for that answer.",
    tips: [
      { title: "Scoring", items: ["Each broker has a weight (0-100) for each quiz answer key.", "The quiz totals up weights across all answers to rank brokers.", "Example: Give CommSec 90 for \"beginner\" if it's great for beginners."] },
    ],
  },
  "/admin/affiliate-links": {
    description: "Manage affiliate URLs, CTA text, and revenue tracking. These are the links users click when choosing a broker.",
    tips: [
      { title: "Revenue", items: ["EPC = Estimated Earnings Per Click. Set this from your affiliate program data.", "Revenue forecasts on the dashboard use these EPC values.", "Commission Type: CPA (per signup), RevShare (ongoing), or Hybrid."] },
      { title: "Link Health", items: ["Links are auto-checked daily (if cron is enabled).", "Broken links mean $0 revenue — fix immediately.", "You'll get email alerts when links break."] },
    ],
  },
  "/admin/deal-of-month": {
    description: "Feature one broker as the \"Deal of the Month\" with a promotional banner across the site.",
    tips: [
      { title: "Setup", items: ["Select a broker and set deal_text on their profile.", "Only one broker can be featured at a time.", "Deals auto-expire if an end date is set (cron required)."] },
    ],
  },
  "/admin/subscribers": {
    description: "View email signups from the site. Includes quiz leads (users who completed the recommendation quiz) and newsletter subscribers.",
    tips: [
      { title: "Sources", items: ["Quiz — completed the broker quiz.", "Newsletter — signed up for the weekly email.", "Footer — entered email in site footer.", "Article — signed up while reading an article."] },
    ],
  },
  "/admin/pro-subscribers": {
    description: "Manage Pro plan members. These users pay for premium content, exclusive deals, and ad-free browsing.",
    tips: [
      { title: "Management", items: ["Subscriptions are managed via Stripe.", "\"Cancel\" sets cancel_at_period_end — member keeps access until period ends.", "Use bulk actions to manage multiple members at once."] },
    ],
  },
  "/admin/pro-deals": {
    description: "Exclusive deals only visible to Pro members. These incentivise Pro signups and add value to the subscription.",
    tips: [
      { title: "Fields", items: ["Status: upcoming → active → expired.", "Featured deals are shown more prominently.", "Link to the broker's special Pro offer page."] },
    ],
  },
  "/admin/site-settings": {
    description: "Global configuration for the site — SEO defaults, hero text, social links, and trust signals.",
    tips: [
      { title: "Key Settings", items: ["Site Title & Meta Description — used as defaults for SEO.", "Hero Headline — the main text on the homepage.", "Visitor Count & User Rating — shown as trust signals.", "Media Logos — comma-separated image URLs for \"As seen in\" section."] },
    ],
  },
  "/admin/calculator-config": {
    description: "Configure the brokerage fee calculator. Each config defines fee parameters for a specific broker and trade type.",
    tips: [
      { title: "How It Works", items: ["Users enter trade value → calculator compares fees across brokers.", "Fee Type: flat (fixed $), percentage (% of trade), tiered (brackets).", "Make sure fee data matches current broker pricing."] },
    ],
  },
  "/admin/team-members": {
    description: "Manage the editorial team shown on articles and the about page. Link team members as article authors.",
    tips: [
      { title: "Fields", items: ["Role — displayed under their name on articles.", "LinkedIn/Twitter — linked from their author bio.", "Photo URL — headshot shown on articles and about page."] },
    ],
  },
  "/admin/user-reviews": {
    description: "Moderate user-submitted broker reviews. Reviews need approval before appearing on broker pages.",
    tips: [
      { title: "Moderation", items: ["Pending — awaiting review.", "Approved — visible on the broker page.", "Rejected — hidden, but kept for records.", "Reviews include a verified email check."] },
    ],
  },
  "/admin/questions": {
    description: "Moderate user-submitted questions about brokers. Approved questions appear on broker pages as an FAQ.",
    tips: [
      { title: "Workflow", items: ["Users submit questions from broker pages.", "Approve and add an answer to make them visible.", "Good questions improve SEO with user-generated content."] },
    ],
  },
  "/admin/switch-stories": {
    description: "User stories about switching brokers. These are social proof that help other users make decisions.",
    tips: [
      { title: "Moderation", items: ["Review for authenticity before approving.", "Good stories include the \"from\" and \"to\" broker with reasons.", "Featured stories get more visibility on the homepage."] },
    ],
  },
  "/admin/health-scores": {
    description: "Track broker health across regulatory, financial stability, and client money dimensions. Used to flag risky brokers.",
    tips: [
      { title: "Scoring", items: ["Overall Score — weighted average of all dimensions.", "Regulatory — AFSL status, compliance history.", "Financial Stability — balance sheet health, parent company.", "Update scores when new ASIC data is released."] },
    ],
  },
  "/admin/regulatory-alerts": {
    description: "Track regulatory changes that affect brokers — ASIC actions, license changes, new compliance requirements.",
    tips: [
      { title: "Fields", items: ["Severity: critical > high > medium > low.", "Status: active alerts are shown to users, resolved ones are archived.", "Effective Date — when the regulation takes effect."] },
    ],
  },
  "/admin/quarterly-reports": {
    description: "Manage quarterly market reports comparing broker performance, fee changes, and industry trends.",
    tips: [
      { title: "Publishing", items: ["Draft and review before publishing.", "Published reports are available to all users.", "Pro-only reports require a Pro subscription to view."] },
    ],
  },
  "/admin/broker-transfer-guides": {
    description: "Step-by-step guides for transferring shares between brokers. Covers CHESS transfer, in-specie transfers, and timelines.",
    tips: [
      { title: "Fields", items: ["Transfer Type: chess_transfer, in_specie, or full_transfer.", "Timeline — estimated business days for completion.", "Steps — numbered instructions shown to users.", "CHESS Fee — cost charged by the source broker."] },
    ],
  },
  "/admin/consultations": {
    description: "Manage 1-on-1 consultation products. Users can book paid sessions with financial experts.",
    tips: [
      { title: "Setup", items: ["Stripe Product ID — links to the payment product.", "Cal Link — the booking calendar URL.", "Featured consultations get homepage placement.", "Status: draft → published → archived."] },
    ],
  },
  "/admin/courses": {
    description: "Manage investment education courses. Courses can be free, paid, or Pro-exclusive.",
    tips: [
      { title: "Pricing", items: ["Pro Price — discounted price for Pro members.", "Revenue Share — percentage to the course creator.", "Stripe IDs link to payment products."] },
    ],
  },
  "/admin/marketplace": {
    description: "Overview of the broker advertising marketplace. Brokers deposit funds and run CPC campaigns to promote their listings.",
    tips: [
      { title: "How It Works", items: ["Brokers register → deposit funds → create campaigns.", "Campaigns are charged per click (CPC) or monthly (featured).", "Budget enforcement and stats aggregation run automatically via daily cron.", "Revenue = sum of all wallet debits from CPC clicks."] },
      { title: "KPI Cards", items: ["Total Deposits — lifetime wallet top-ups across all brokers.", "Active Campaigns — currently serving and billing.", "Pending Reviews — campaigns awaiting your approval.", "Today's Revenue — CPC charges deducted today."] },
    ],
  },
  "/admin/marketplace/campaigns": {
    description: "Review, approve, or reject broker campaigns. Filter by status to manage the review queue efficiently.",
    tips: [
      { title: "Review Workflow", items: ["Pending Review — broker submitted, needs your decision.", "Approve to set status to 'approved' (auto-activates on start date).", "Reject with a note — broker sees your feedback.", "Approved campaigns activate automatically when their start date arrives."] },
      { title: "Status Guide", items: ["Active — live and billing per click.", "Paused — broker paused, no charges.", "Budget Exhausted — total budget hit, auto-stopped.", "Completed — end date reached.", "Cancelled — permanently stopped by broker."] },
      { title: "Tips", items: ["Check the broker's wallet balance before approving — low balance means campaigns pause quickly.", "Use review notes to suggest rate or targeting improvements.", "Bulk actions let you approve/reject multiple at once."] },
    ],
  },
  "/admin/marketplace/brokers": {
    description: "Manage marketplace broker accounts, invite new brokers, view wallet balances, and make manual wallet adjustments.",
    tips: [
      { title: "Account Statuses", items: ["Active — can log in and create campaigns.", "Pending — registered but not yet approved by admin.", "Suspended — temporarily blocked from the marketplace.", "Invite brokers by entering their slug — they'll receive a registration email."] },
      { title: "Wallet Adjustments", items: ["Use manual adjustments for promotional credits (e.g. $50 welcome bonus).", "Adjustments are logged in wallet_transactions for audit trail.", "Positive = credit, negative = debit."] },
    ],
  },
  "/admin/marketplace/placements": {
    description: "Define ad inventory slots on the site. Each placement is a position on a page where broker ads can appear.",
    tips: [
      { title: "Key Fields", items: ["Slug — unique ID, e.g. 'compare-top' (cannot change after creation).", "Inventory Type — 'cpc' (pay per click) or 'featured' (flat monthly rate).", "Max Slots — how many campaigns can win simultaneously (e.g. 2 = top 2 bidders shown).", "Base Rate — minimum bid in cents. Brokers cannot bid below this."] },
      { title: "How Allocation Works", items: ["On each page load, the system picks the top N bidders (by rate) who pass budget/wallet checks.", "Higher rate = higher priority. Ties break by admin-set priority, then creation date.", "Stats (monthly impressions, avg CTR) refresh daily via cron."] },
    ],
  },
  "/admin/marketplace/packages": {
    description: "Define advertising package tiers that brokers can subscribe to for CPC discounts and included placements.",
    tips: [
      { title: "Package Tiers", items: ["Starter — free tier, standard CPC rates.", "Growth — small CPC discount + included featured slots.", "Dominance — larger discount + more slots + priority support.", "Enterprise — custom pricing, dedicated account management."] },
      { title: "Fields", items: ["CPC Rate Discount — percentage off base CPC rate for subscribers.", "Featured Slots Included — number of featured placements included in the monthly fee.", "Share of Voice — guaranteed impression percentage (enterprise only)."] },
    ],
  },
  "/admin/marketplace/decisions": {
    description: "Full audit trail of every ad allocation decision. See who won each placement auction, who was filtered out, and why.",
    tips: [
      { title: "Reading Decisions", items: ["Winners (green) — campaigns selected to show on this page load.", "Rejected (amber) — campaigns filtered out with a specific reason.", "Rejection reasons: daily_budget_hit, total_budget_exhausted, zero_wallet_balance, end_date_passed, outbid_no_slot."] },
      { title: "KPIs", items: ["Decisions with Winners — percentage of page loads that served a paid ad.", "Fallback Rate — percentage using sponsorship tier (no paid campaigns available).", "Avg Duration — allocation speed in milliseconds (should be <50ms)."] },
      { title: "Troubleshooting", items: ["High fallback rate? Check if campaigns are active and wallets have funds.", "All rejected? Look for daily_budget_hit or zero_wallet_balance patterns.", "Use date range filter to compare allocation health over time."] },
    ],
  },
  "/admin/marketplace/attribution": {
    description: "Understand where clicks and conversions originate — by page, device type, and placement. Optimise ad inventory accordingly.",
    tips: [
      { title: "Tabs", items: ["Overview — aggregate clicks, impressions, spend, and CTR.", "By Page — which site pages generate the most clicks (compare, quiz, homepage).", "By Device — mobile vs desktop vs tablet breakdown.", "By Placement — performance of each ad slot (compare-top, quiz-boost, etc.)."] },
      { title: "Using This Data", items: ["High impressions + low CTR → ad creative may need improvement.", "Mobile dominance → ensure broker landing pages are mobile-friendly.", "Export CSV for offline analysis or sharing with broker partners."] },
    ],
  },
  "/admin/marketplace/intelligence": {
    description: "AI-powered intelligence dashboard. Health-scores every broker, auto-generates consulting insights, and surfaces revenue opportunities.",
    tips: [
      { title: "Tabs", items: ["Portfolio Overview — 8 KPIs with trends and daily revenue chart.", "Broker Scorecard — A-to-F health grades based on CTR, conversions, wallet, activity, and spend momentum.", "Consulting Insights — auto-generated recommendations sorted by severity (critical → warning → info).", "Revenue Analytics — revenue breakdown by broker, placement, and daily trend.", "Performance Heatmap — broker × placement grid showing CTR or spend intensity."] },
      { title: "Health Grades", items: ["A (80+) — excellent performer, keep engaged.", "B (65-79) — good, minor optimisation opportunities.", "C (45-64) — average, needs attention.", "D (25-44) — underperforming, proactive outreach recommended.", "F (<25) — at risk of churning, immediate action needed."] },
      { title: "Acting on Insights", items: ["Critical insights (red) — take action within 24 hours.", "Warning insights (amber) — address within a week.", "Info insights (blue) — opportunities to improve, not urgent.", "Use 'Send Notification' quick action to alert brokers directly."] },
    ],
  },
  "/admin/marketplace/sponsor-billing": {
    description: "Manage monthly billing for sponsored/featured broker partnerships. Generate invoices and track payment status.",
    tips: [
      { title: "Invoice Workflow", items: ["Generate invoice → status: pending.", "Mark as paid when payment received.", "Overdue invoices are highlighted after 30 days.", "Waive for promotional or partnership arrangements."] },
      { title: "Tier Pricing", items: ["Pricing is defined per sponsorship tier (featured_partner, editors_pick, etc.).", "Custom rates can override tier defaults for individual brokers.", "Invoice periods are typically monthly or quarterly."] },
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
