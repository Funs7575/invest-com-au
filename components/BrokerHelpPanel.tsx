"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface HelpEntry {
  title: string;
  items: string[];
}

const helpContent: Record<string, { description: string; tips: HelpEntry[] }> = {
  "/broker-portal": {
    description: "Your advertising command center. See wallet balance, active campaigns, click trends, and daily spend at a glance.",
    tips: [
      { title: "KPI Cards", items: [
        "Wallet Balance -- funds available for CPC charges and featured placements.",
        "Active Campaigns -- currently running campaigns out of your total.",
        "Clicks (7d) -- total click-throughs in the last 7 days with trend vs prior week.",
        "Today's Spend -- amount charged to your wallet today from campaign activity.",
      ]},
      { title: "Quick Actions", items: [
        "Create a new campaign or top up your wallet from the buttons below KPI cards.",
        "Recent Campaigns shows your 5 most recent with budget utilisation bars.",
      ]},
      { title: "Getting Started", items: [
        "1. Accept Marketplace Terms (Settings page).",
        "2. Top up your wallet with at least $100.",
        "3. Create your first campaign -- it goes to review before going live.",
      ]},
    ],
  },
  "/broker-portal/campaigns": {
    description: "View, pause, resume, or cancel your advertising campaigns. Filter by status to find what you need.",
    tips: [
      { title: "Campaign Lifecycle", items: [
        "Pending Review -- submitted, waiting for admin approval.",
        "Approved -- accepted by admin, will go live on start date.",
        "Active -- currently running and charging per click or per month.",
        "Paused -- temporarily stopped, no charges accrue.",
        "Budget Exhausted -- total budget used up, automatically stopped.",
        "Completed -- end date reached.",
        "Cancelled -- permanently stopped by you.",
      ]},
      { title: "Actions", items: [
        "Pause stops charges immediately. Resume re-submits for approval.",
        "Cancel is permanent and cannot be undone.",
        "Review notes from admin appear in amber boxes below campaigns.",
      ]},
    ],
  },
  "/broker-portal/campaigns/new": {
    description: "Create a new advertising campaign. Choose a placement, set your rate and budget, then submit for review.",
    tips: [
      { title: "Placements", items: [
        "Compare Top -- highest visibility on the comparison page.",
        "Compare CPC -- pay-per-click on the comparison page.",
        "Quiz Boost -- appear as top match in quiz results (highest intent).",
        "Homepage Featured -- premium position on the most-visited page.",
        "Articles Sidebar -- contextual ads alongside educational content.",
        "Deals Featured/CPC -- prominent placement on the deals page.",
      ]},
      { title: "Budget Strategy", items: [
        "Daily Budget caps your maximum daily spend.",
        "Total Budget caps your cumulative spend across the campaign.",
        "Leave both blank for unlimited spend (charges per click).",
        "The live preview on the right shows exactly how your ad will appear.",
      ]},
    ],
  },
  "/broker-portal/analytics": {
    description: "Deep-dive into campaign performance across four analysis tabs: Overview, Conversion Funnel, ROI & Spend, and Benchmarks.",
    tips: [
      { title: "Overview", items: [
        "Click and impression trends with daily bar charts.",
        "CTR = Clicks / Impressions x 100.",
        "Green conversion line overlays the click chart.",
      ]},
      { title: "Conversion Funnel", items: [
        "Tracks: Account Opened > Funded > First Trade.",
        "Stacked bars show daily progression through funnel stages.",
        "Drop-off bars show where users are falling off.",
      ]},
      { title: "Benchmarks", items: [
        "Your metrics vs financial services industry averages.",
        "Performance Score: CTR (30%) + Conv Rate (40%) + Cost Efficiency (30%).",
        "120+ = Excellent, 80-119 = Good, 50-79 = Fair, 0-49 = Needs Work.",
      ]},
    ],
  },
  "/broker-portal/reports": {
    description: "Export campaign reports, drill down into individual campaigns, and compare performance across date ranges.",
    tips: [
      { title: "Drill-Down", items: [
        "Click any campaign row to filter all charts and KPIs to that campaign.",
        "A dark bar appears at the top showing which campaign is selected.",
        "Click 'Clear filter' or 'Show all' to return to the full view.",
      ]},
      { title: "Export", items: [
        "Export CSV downloads daily data: date, clicks, impressions, conversions, spend.",
        "Use Custom date range for specific reporting periods.",
        "Campaign detail CSV is available when drilled into a specific campaign.",
      ]},
    ],
  },
  "/broker-portal/wallet": {
    description: "Your advertising wallet. Add funds via Stripe and view transaction history. Campaigns deduct from this balance.",
    tips: [
      { title: "How Billing Works", items: [
        "CPC campaigns deduct from your wallet each time a user clicks your ad.",
        "Featured campaigns deduct the monthly rate at the start of each billing period.",
        "Funds are available immediately after Stripe payment.",
        "Set low-balance alerts in Settings to avoid campaigns pausing unexpectedly.",
      ]},
      { title: "Top-Up", items: [
        "Use quick-select buttons ($100-$5,000) or enter a custom amount ($50-$50,000).",
        "All payments are processed securely via Stripe.",
        "Refunds appear as blue 'refund' entries in transaction history.",
      ]},
    ],
  },
  "/broker-portal/invoices": {
    description: "View invoices and receipts for wallet top-ups. Download receipts for paid invoices.",
    tips: [
      { title: "Invoice Statuses", items: [
        "Paid (green) -- payment received, receipt available.",
        "Pending (amber) -- payment initiated but not yet confirmed.",
        "Failed (red) -- payment attempt failed, funds not added.",
        "Refunded (blue) -- payment was reversed.",
      ]},
    ],
  },
  "/broker-portal/conversions": {
    description: "Track conversion events reported via the Postback API. See how ad clicks convert into account opens, funding, and first trades.",
    tips: [
      { title: "Funnel Stages", items: [
        "Opened -- user created a brokerage account.",
        "Funded -- user deposited money into their account.",
        "First Trade -- user executed their first trade.",
        "Each stage includes the click ID for attribution tracking.",
      ]},
      { title: "Postback API", items: [
        "Find your API key in Settings to report conversion events.",
        "Send POST requests with click_id, event_type, and optional value.",
        "Conversions are attributed to the campaign that generated the click.",
      ]},
    ],
  },
  "/broker-portal/creatives": {
    description: "Upload and manage brand assets (logos, banners, icons, screenshots) used in your ad placements.",
    tips: [
      { title: "Asset Types", items: [
        "Logo -- square PNG/SVG, used in comparison tables and quiz results.",
        "Banner -- 1200x300px recommended, used in featured placements.",
        "Icon -- 64x64px, used in compact layouts.",
        "Screenshot -- platform or product images for article sidebar placements.",
      ]},
      { title: "Management", items: [
        "Toggle assets active/inactive without deleting them.",
        "Copy URL to use assets in external campaigns.",
        "All images must be publicly accessible URLs.",
      ]},
    ],
  },
  "/broker-portal/ab-tests": {
    description: "Run A/B tests to optimise your CTA text, deal copy, banner images, or landing page URLs.",
    tips: [
      { title: "How It Works", items: [
        "Create a test with two variants (A = control, B = challenger).",
        "Set a traffic split (e.g. 50/50 or 70/30).",
        "Start the test -- visitors are randomly assigned to see variant A or B.",
        "Monitor impressions, clicks, CTR, and conversions for each variant.",
      ]},
      { title: "Best Practices", items: [
        "Run tests for at least 7 days to get statistically meaningful results.",
        "Only test one variable at a time (e.g. just CTA text, not text + image).",
        "Declare a winner to lock in the best-performing variant.",
        "Pausing a test preserves data -- you can resume later.",
      ]},
    ],
  },
  "/broker-portal/webhooks": {
    description: "Configure webhook endpoints to receive real-time notifications about campaign events, clicks, and conversions.",
    tips: [
      { title: "Setup", items: [
        "Add your HTTPS endpoint URL.",
        "Select which event types to receive (clicks, conversions, budget alerts).",
        "We'll send JSON payloads with event details to your endpoint.",
        "Failed deliveries are automatically retried with exponential backoff.",
      ]},
    ],
  },
  "/broker-portal/packages": {
    description: "Choose an advertising package to unlock CPC rate discounts and included featured placements.",
    tips: [
      { title: "How Packages Work", items: [
        "Higher-tier packages include CPC rate discounts (10-20% off per click).",
        "Featured placement slots are included in Growth and above.",
        "Package fees are charged monthly to your wallet.",
        "You can upgrade, downgrade, or cancel at any time.",
      ]},
      { title: "Choosing a Package", items: [
        "Starter -- free, pay-per-click only.",
        "Growth -- 10% CPC discount + 1 featured slot.",
        "Dominance -- 20% CPC discount + 3 featured slots.",
        "Enterprise -- custom pricing with dedicated account manager.",
      ]},
    ],
  },
  "/broker-portal/notifications": {
    description: "View alerts about campaign approvals, wallet balance, budget exhaustion, and support replies.",
    tips: [
      { title: "Notification Types", items: [
        "Campaign Approved/Rejected -- your campaign review decision.",
        "Low Balance -- wallet is running low (configure threshold in Settings).",
        "Budget Exhausted -- a campaign has used all its budget.",
        "Payment Received -- wallet top-up confirmed.",
        "Support Reply -- new message on your support ticket.",
      ]},
    ],
  },
  "/broker-portal/support": {
    description: "Submit support tickets and communicate with the partner team. Track ticket status and history.",
    tips: [
      { title: "Priorities", items: [
        "Low -- general questions, feature requests.",
        "Normal -- standard issues, billing queries.",
        "High -- campaign problems affecting revenue.",
        "Urgent -- critical issues requiring immediate attention.",
      ]},
      { title: "Tips", items: [
        "Include your campaign name and dates when reporting campaign issues.",
        "Attach screenshots by linking to image URLs in your message.",
        "Replying to a resolved ticket automatically re-opens it.",
      ]},
    ],
  },
  "/broker-portal/settings": {
    description: "Manage your account details, accept marketplace terms, configure API keys, and set balance alert preferences.",
    tips: [
      { title: "Postback API Key", items: [
        "Use this key to authenticate conversion event reports.",
        "Include it in the Authorization header of your POST requests.",
        "Never share your API key publicly -- treat it like a password.",
      ]},
      { title: "Low Balance Alerts", items: [
        "Enable email notifications when your wallet drops below a threshold.",
        "Default threshold is $100 -- adjust based on your daily spend.",
        "Alerts help prevent campaigns from pausing unexpectedly.",
      ]},
    ],
  },
};

export default function BrokerHelpPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Match content: try exact path, then parent path
  const content = helpContent[pathname] || helpContent[pathname?.replace(/\/[^/]+$/, "") || ""];

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
