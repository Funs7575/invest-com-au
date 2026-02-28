"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { MarketplacePlacement } from "@/lib/types";

/* ─────────────────────── Placement visual metadata ─────────────────────── */
const PLACEMENT_VISUALS: Record<string, {
  icon: string;
  color: string;
  reach: string;
  avgCtr: string;
  mockup: "compare" | "quiz" | "homepage" | "article" | "deals";
  tip: string;
}> = {
  "compare-top": {
    icon: "award",
    color: "amber",
    reach: "15,000+",
    avgCtr: "4.2%",
    mockup: "compare",
    tip: "Highest visibility — your brand appears above all competitors",
  },
  "compare-cpc": {
    icon: "mouse-pointer",
    color: "blue",
    reach: "15,000+",
    avgCtr: "2.8%",
    mockup: "compare",
    tip: "Pay only when users click through to your site",
  },
  "quiz-boost": {
    icon: "zap",
    color: "purple",
    reach: "5,000+",
    avgCtr: "6.1%",
    mockup: "quiz",
    tip: "Reach users with the highest purchase intent",
  },
  "homepage-featured": {
    icon: "star",
    color: "amber",
    reach: "25,000+",
    avgCtr: "3.5%",
    mockup: "homepage",
    tip: "Premium position on the most-visited page",
  },
  "articles-sidebar": {
    icon: "book-open",
    color: "green",
    reach: "20,000+",
    avgCtr: "1.9%",
    mockup: "article",
    tip: "Contextual placement alongside educational content",
  },
  "deals-featured": {
    icon: "tag",
    color: "red",
    reach: "8,000+",
    avgCtr: "5.3%",
    mockup: "deals",
    tip: "Showcase your promotional offers to deal-seekers",
  },
  "deals-cpc": {
    icon: "tag",
    color: "blue",
    reach: "8,000+",
    avgCtr: "3.1%",
    mockup: "deals",
    tip: "Pay per click on the deals page",
  },
};

/* ─────────────────────── Mockup components ─────────────────────── */

function MockupShell({ title, url, children }: { title: string; url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden" style={{ animation: "resultCardIn 0.4s ease-out" }}>
      {/* Browser chrome */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded-md px-3 py-1 text-[0.6rem] text-slate-400 font-mono truncate border border-slate-200">
          {url}
        </div>
      </div>
      {/* Page title */}
      <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center">
          <span className="text-slate-900 font-extrabold text-[0.5rem]">I</span>
        </div>
        <span className="text-white text-xs font-bold">{title}</span>
      </div>
      {/* Content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

function CompareMockup({ brokerName, isHighlighted }: { brokerName: string; isHighlighted: boolean }) {
  return (
    <MockupShell title="Compare Brokers" url="invest.com.au/compare">
      <p className="text-[0.6rem] text-slate-400 mb-2 font-medium">Compare Australian Share Trading Platforms</p>
      {/* Table header */}
      <div className="grid grid-cols-5 gap-1 text-[0.5rem] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-slate-100">
        <span className="col-span-2">Broker</span><span>ASX Fee</span><span>Rating</span><span />
      </div>
      {/* Highlighted broker row */}
      <div className={`grid grid-cols-5 gap-1 items-center px-2 py-2 rounded-lg my-1 transition-all duration-500 ${isHighlighted ? "bg-amber-50 border border-amber-200 ring-2 ring-amber-300/50 scale-[1.02]" : "bg-slate-50 border border-transparent"}`}>
        <div className="col-span-2 flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[0.45rem] font-bold ${isHighlighted ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
            {brokerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[0.6rem] font-bold text-slate-900 leading-tight">{brokerName || "Your Broker"}</p>
            {isHighlighted && <span className="text-[0.45rem] font-bold text-amber-600 bg-amber-100 px-1 rounded">SPONSORED</span>}
          </div>
        </div>
        <span className="text-[0.6rem] font-semibold text-slate-700">$5.00</span>
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= 4 ? "bg-amber-400" : "bg-slate-200"}`} />
          ))}
        </div>
        <div className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded text-center ${isHighlighted ? "bg-amber-500 text-white" : "bg-slate-900 text-white"}`}>
          Visit →
        </div>
      </div>
      {/* Other rows */}
      {["Competitor A", "Competitor B", "Competitor C"].map((name, i) => (
        <div key={i} className="grid grid-cols-5 gap-1 items-center px-2 py-1.5 opacity-40">
          <div className="col-span-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-slate-100" />
            <span className="text-[0.6rem] text-slate-400">{name}</span>
          </div>
          <span className="text-[0.6rem] text-slate-300">$X.XX</span>
          <div className="flex gap-0.5">{[1,2,3].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}</div>
          <div className="text-[0.5rem] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-center">Visit</div>
        </div>
      ))}
    </MockupShell>
  );
}

function QuizMockup({ brokerName, isHighlighted }: { brokerName: string; isHighlighted: boolean }) {
  return (
    <MockupShell title="Quiz Results" url="invest.com.au/quiz">
      <p className="text-[0.6rem] text-slate-400 mb-2 font-medium">Your Top Broker Matches</p>
      <div className="space-y-1.5">
        {["Best Overall Match", "Runner Up", "Also Great"].map((label, i) => {
          const isYou = i === 0 && isHighlighted;
          return (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-500 ${isYou ? "bg-purple-50 border border-purple-200 ring-2 ring-purple-300/50 scale-[1.02]" : "bg-slate-50 border border-transparent opacity-40"}`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[0.5rem] font-bold ${isYou ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                {isYou ? (brokerName.charAt(0).toUpperCase() || "?") : "#"}
              </div>
              <div className="flex-1">
                <p className={`text-[0.6rem] font-bold ${isYou ? "text-slate-900" : "text-slate-400"}`}>{isYou ? (brokerName || "Your Broker") : `Broker ${i + 1}`}</p>
                <p className="text-[0.45rem] text-slate-400">{label}</p>
              </div>
              {isYou && <span className="text-[0.45rem] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">BOOSTED</span>}
              <div className={`text-[0.5rem] font-bold px-2 py-1 rounded ${isYou ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                {i === 0 ? "98%" : i === 1 ? "91%" : "85%"} Match
              </div>
            </div>
          );
        })}
      </div>
    </MockupShell>
  );
}

function HomepageMockup({ brokerName, isHighlighted }: { brokerName: string; isHighlighted: boolean }) {
  return (
    <MockupShell title="Homepage" url="invest.com.au">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-3 mb-2">
        <p className="text-[0.65rem] font-bold text-white">Compare Australia&apos;s Best Brokers</p>
        <p className="text-[0.45rem] text-slate-400 mt-0.5">Find the right platform for your investing style</p>
      </div>
      {/* Table */}
      <p className="text-[0.5rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Top Brokers</p>
      {["", "Broker B", "Broker C"].map((bName, i) => {
        const isYou = i === 0 && isHighlighted;
        return (
          <div key={i} className={`flex items-center gap-2 p-1.5 rounded-lg mb-1 transition-all duration-500 ${isYou ? "bg-amber-50 border border-amber-200 ring-2 ring-amber-300/50 scale-[1.02]" : "bg-slate-50 opacity-40"}`}>
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[0.45rem] font-bold ${isYou ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400"}`}>
              {isYou ? (brokerName.charAt(0).toUpperCase() || "?") : "#"}
            </div>
            <span className={`text-[0.6rem] font-bold flex-1 ${isYou ? "text-slate-900" : "text-slate-400"}`}>{isYou ? (brokerName || "Your Broker") : bName}</span>
            {isYou && <span className="text-[0.4rem] font-bold text-amber-600 bg-amber-100 px-1 rounded">FEATURED</span>}
            <div className={`text-[0.45rem] font-bold px-1.5 py-0.5 rounded ${isYou ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}>Visit</div>
          </div>
        );
      })}
    </MockupShell>
  );
}

function ArticleMockup({ brokerName, isHighlighted }: { brokerName: string; isHighlighted: boolean }) {
  return (
    <MockupShell title="Guide: How to Start Investing" url="invest.com.au/article/start-investing">
      <div className="flex gap-3">
        {/* Article content */}
        <div className="flex-1">
          <p className="text-[0.65rem] font-bold text-slate-900 mb-1">How to Start Investing in 2026</p>
          <div className="space-y-1">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-1.5 bg-slate-100 rounded-full" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {[1,2,3].map(i => (
              <div key={i} className="h-1.5 bg-slate-100 rounded-full" style={{ width: `${85 - i * 15}%` }} />
            ))}
          </div>
        </div>
        {/* Sidebar widget */}
        <div className={`w-24 shrink-0 rounded-lg p-2 transition-all duration-500 ${isHighlighted ? "bg-green-50 border border-green-200 ring-2 ring-green-300/50 scale-[1.03]" : "bg-slate-50 border border-slate-200 opacity-40"}`}>
          <p className="text-[0.4rem] font-bold text-slate-400 uppercase tracking-wider mb-1">Sponsored</p>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1 text-[0.5rem] font-bold ${isHighlighted ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
            {brokerName.charAt(0).toUpperCase() || "?"}
          </div>
          <p className={`text-[0.5rem] font-bold text-center ${isHighlighted ? "text-slate-900" : "text-slate-400"}`}>{brokerName || "Your Broker"}</p>
          <p className="text-[0.4rem] text-slate-400 text-center mt-0.5">$0 brokerage</p>
          <div className={`text-[0.4rem] font-bold text-center px-1 py-0.5 rounded mt-1 ${isHighlighted ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
            Visit →
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function DealsMockup({ brokerName, isHighlighted }: { brokerName: string; isHighlighted: boolean }) {
  return (
    <MockupShell title="Deals & Promotions" url="invest.com.au/deals">
      <p className="text-[0.6rem] text-slate-400 mb-2 font-medium">Current Broker Deals</p>
      <div className="grid grid-cols-2 gap-2">
        {/* Featured deal */}
        <div className={`rounded-lg p-2 transition-all duration-500 ${isHighlighted ? "bg-red-50 border border-red-200 ring-2 ring-red-300/50 scale-[1.03] col-span-2" : "bg-slate-50 border border-transparent opacity-40"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[0.45rem] font-bold ${isHighlighted ? "bg-red-500 text-white" : "bg-slate-200 text-slate-400"}`}>
              {brokerName.charAt(0).toUpperCase() || "?"}
            </div>
            <span className={`text-[0.6rem] font-bold ${isHighlighted ? "text-slate-900" : "text-slate-400"}`}>{brokerName || "Your Broker"}</span>
            {isHighlighted && <span className="text-[0.4rem] font-bold text-red-600 bg-red-100 px-1 rounded ml-auto">FEATURED DEAL</span>}
          </div>
          <div className={`text-[0.5rem] px-2 py-1 rounded ${isHighlighted ? "bg-amber-100 text-amber-800 font-semibold" : "bg-slate-100 text-slate-400"}`}>
            {isHighlighted ? "$0 brokerage for 30 days — Sign up today" : "Deal text here"}
          </div>
          {isHighlighted && (
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[0.4rem] text-red-500 font-medium">Expires in 14 days</span>
              <div className="text-[0.45rem] font-bold bg-red-500 text-white px-2 py-0.5 rounded">Claim Deal →</div>
            </div>
          )}
        </div>
        {/* Other deals */}
        {[1, 2].map(i => (
          <div key={i} className="bg-slate-50 rounded-lg p-2 opacity-30">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-4 h-4 rounded bg-slate-200" />
              <span className="text-[0.5rem] text-slate-400">Other Broker</span>
            </div>
            <div className="h-2 bg-slate-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

const MOCKUP_COMPONENTS = {
  compare: CompareMockup,
  quiz: QuizMockup,
  homepage: HomepageMockup,
  article: ArticleMockup,
  deals: DealsMockup,
};

/* ─────────────────────── Budget estimator ─────────────────────── */
function BudgetEstimator({ rate, dailyBudget, totalBudget, type, reach, avgCtr }: {
  rate: number; dailyBudget: number; totalBudget: number;
  type: string; reach: string; avgCtr: string;
}) {
  if (!rate) return null;
  const monthlyReach = parseInt(reach.replace(/[^0-9]/g, "")) || 0;
  const ctr = parseFloat(avgCtr) / 100 || 0.03;
  const estClicksMonth = Math.round(monthlyReach * ctr);
  const estMonthlyCost = type === "cpc" ? estClicksMonth * rate : rate;
  const daysToExhaust = totalBudget > 0 && dailyBudget > 0
    ? Math.ceil(totalBudget / dailyBudget)
    : totalBudget > 0 && estMonthlyCost > 0
      ? Math.ceil(totalBudget / (estMonthlyCost / 30))
      : null;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 space-y-3" style={{ animation: "resultCardIn 0.3s ease-out" }}>
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <Icon name="trending-up" size={12} className="text-amber-500" />
        Estimated Performance
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2.5 border border-slate-200">
          <p className="text-[0.6rem] text-slate-400 font-medium">Monthly Reach</p>
          <p className="text-sm font-extrabold text-slate-900">{reach}</p>
          <p className="text-[0.5rem] text-slate-400">visitors/mo</p>
        </div>
        <div className="bg-white rounded-lg p-2.5 border border-slate-200">
          <p className="text-[0.6rem] text-slate-400 font-medium">Avg. CTR</p>
          <p className="text-sm font-extrabold text-slate-900">{avgCtr}</p>
          <p className="text-[0.5rem] text-slate-400">click-through rate</p>
        </div>
        {type === "cpc" && (
          <div className="bg-white rounded-lg p-2.5 border border-slate-200">
            <p className="text-[0.6rem] text-slate-400 font-medium">Est. Clicks/mo</p>
            <p className="text-sm font-extrabold text-blue-700">~{estClicksMonth.toLocaleString()}</p>
            <p className="text-[0.5rem] text-slate-400">at {avgCtr} CTR</p>
          </div>
        )}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200">
          <p className="text-[0.6rem] text-slate-400 font-medium">Est. Cost/mo</p>
          <p className="text-sm font-extrabold text-slate-900">${(estMonthlyCost / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-[0.5rem] text-slate-400">{type === "cpc" ? "based on avg clicks" : "flat rate"}</p>
        </div>
      </div>
      {daysToExhaust && (
        <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
          <Icon name="clock" size={12} className="text-amber-600" />
          <p className="text-[0.6rem] text-amber-800 font-medium">Budget runs ~{daysToExhaust} days at current rate</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Main page ─────────────────────── */
export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<MarketplacePlacement[]>([]);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [placementId, setPlacementId] = useState<number | null>(null);
  const [rateCents, setRateCents] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, company_name, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account) return;
      setBrokerSlug(account.broker_slug);
      setBrokerName(account.company_name || account.full_name || account.broker_slug);

      const { data: p } = await supabase
        .from("marketplace_placements")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setPlacements((p || []) as MarketplacePlacement[]);
      setLoading(false);
    };
    load();
  }, []);

  const selectedPlacement = placements.find((p) => p.id === placementId);
  const visualMeta = selectedPlacement?.slug ? PLACEMENT_VISUALS[selectedPlacement.slug] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!placementId || !name || !rateCents || !startDate) {
      setError("Please fill in all required fields.");
      return;
    }

    const rate = Math.round(parseFloat(rateCents) * 100);
    if (rate <= 0) {
      setError("Rate must be greater than $0.");
      return;
    }

    if (selectedPlacement?.base_rate_cents && rate < selectedPlacement.base_rate_cents) {
      setError(`Minimum rate for this placement is $${(selectedPlacement.base_rate_cents / 100).toFixed(2)}`);
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: insertErr } = await supabase.from("campaigns").insert({
        broker_slug: brokerSlug,
        placement_id: placementId,
        name,
        inventory_type: selectedPlacement?.inventory_type || "cpc",
        rate_cents: rate,
        daily_budget_cents: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : null,
        total_budget_cents: totalBudget ? Math.round(parseFloat(totalBudget) * 100) : null,
        start_date: startDate,
        end_date: endDate || null,
        status: "pending_review",
      });

      if (insertErr) {
        setError(insertErr.message);
        setSubmitting(false);
        return;
      }

      toast("Campaign submitted for review", "success");
      router.push("/broker-portal/campaigns");
    } catch {
      setError("Failed to create campaign.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* ─────── LEFT: Form ─────── */}
      <div className="flex-1 min-w-0 max-w-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">New Campaign</h1>
        <p className="text-sm text-slate-500 mb-6">
          Choose a placement and set your budget. Campaigns are reviewed before going live.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <Icon name="alert-circle" size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campaign name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Campaign Name *
              <InfoTip text="A name for your reference only -- not shown to users. Use something descriptive like 'Compare Page Q1 2025'." />
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Compare Page Featured"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            />
          </div>

          {/* Placement selection — card grid */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Placement *</label>
            <div className="grid gap-3">
              {placements.map((p) => {
                const vis = PLACEMENT_VISUALS[p.slug];
                const isSelected = placementId === p.id;
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover-lift ${
                      isSelected
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="placement"
                      value={p.id}
                      checked={isSelected}
                      onChange={() => {
                        setPlacementId(p.id);
                        if (p.base_rate_cents) {
                          setRateCents((p.base_rate_cents / 100).toFixed(2));
                        }
                      }}
                      className="mt-1 accent-slate-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {vis && <Icon name={vis.icon} size={14} className={`text-${vis.color}-500`} />}
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.inventory_type === "featured"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {p.inventory_type.toUpperCase()}
                        </span>
                        {p.base_rate_cents && (
                          <span className="text-xs text-slate-500">
                            from ${(p.base_rate_cents / 100).toFixed(2)}{p.inventory_type === "cpc" ? "/click" : "/mo"}
                          </span>
                        )}
                        {vis && (
                          <span className="text-xs text-slate-400">
                            {vis.reach} visitors/mo
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {p.max_slots} slot{p.max_slots > 1 ? "s" : ""}
                        </span>
                      </div>
                      {isSelected && vis && (
                        <p className="text-xs text-slate-500 mt-1.5 italic">{vis.tip}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Rate */}
          {selectedPlacement && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rate (AUD) * — {selectedPlacement.inventory_type === "cpc" ? "per click" : "per month"}
                {selectedPlacement.inventory_type === "cpc"
                  ? <InfoTip text="The amount you pay each time a user clicks your ad. Higher rates may win more placement opportunities." />
                  : <InfoTip text="Fixed monthly fee for this featured placement. Charged to your wallet at the start of each billing period." />
                }
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rateCents}
                  onChange={(e) => setRateCents(e.target.value)}
                  required
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {/* Budget */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Daily Budget (AUD)
                <span className="text-xs text-slate-400 ml-1">optional</span>
                <InfoTip text="Maximum amount that can be charged per day. Prevents unexpected high-spend days. Leave blank for unlimited." />
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                  placeholder="No limit"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Total Budget (AUD)
                <span className="text-xs text-slate-400 ml-1">optional</span>
                <InfoTip text="Maximum cumulative spend for the entire campaign. Campaign automatically pauses when reached." />
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
                <span className="text-xs text-slate-400 ml-1">optional</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Campaigns are reviewed by our team before going live. You&apos;ll be notified once approved.
          </p>
        </form>
      </div>

      {/* ─────── RIGHT: Live Preview ─────── */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0">
        <div className="lg:sticky lg:top-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="eye" size={14} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Live Preview</h3>
          </div>

          {!selectedPlacement ? (
            /* Empty state */
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Icon name="layout" size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Select a placement</p>
              <p className="text-xs text-slate-400">
                See a live preview of how your ad will appear on invest.com.au
              </p>
            </div>
          ) : visualMeta ? (
            <>
              {/* Mockup */}
              {(() => {
                const MockupComponent = MOCKUP_COMPONENTS[visualMeta.mockup];
                return <MockupComponent brokerName={brokerName} isHighlighted={true} />;
              })()}

              {/* Budget estimator */}
              <BudgetEstimator
                rate={rateCents ? Math.round(parseFloat(rateCents) * 100) : 0}
                dailyBudget={dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : 0}
                totalBudget={totalBudget ? Math.round(parseFloat(totalBudget) * 100) : 0}
                type={selectedPlacement.inventory_type}
                reach={visualMeta.reach}
                avgCtr={visualMeta.avgCtr}
              />
            </>
          ) : (
            /* Fallback for unknown placements */
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <Icon name="image" size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">{selectedPlacement.name}</p>
              <p className="text-xs text-slate-400 mt-1">{selectedPlacement.description || "Preview not available for this placement"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
