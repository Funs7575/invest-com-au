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
      { title: "How It Works", items: ["Brokers register → deposit funds → create campaigns.", "Campaigns are charged per click (CPC).", "Budget enforcement and stats aggregation run automatically (cron required)."] },
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

export default function AdminHelpPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const content = helpContent[pathname];

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
              <p className="text-[0.6rem] text-slate-400">
                Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[0.55rem] font-mono">Esc</kbd> to close · Help is page-specific
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
