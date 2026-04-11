"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

type FeeChange = {
  id: number;
  broker_slug: string;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_at: string;
};

type BrokerOption = {
  slug: string;
  name: string;
};

type AlertType = "any" | "increase" | "decrease";
type Frequency = "instant" | "weekly";

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage", asx_fee_value: "ASX Fee ($)", us_fee: "US Brokerage",
  us_fee_value: "US Fee ($)", fx_rate: "FX Rate (%)", inactivity_fee: "Inactivity Fee",
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  any: "All changes",
  increase: "Fee increases only",
  decrease: "Fee decreases only",
};

function ChangeDirection({ oldVal, newVal }: { oldVal: string; newVal: string }) {
  const o = parseFloat(oldVal);
  const n = parseFloat(newVal);
  if (isNaN(o) || isNaN(n)) return <span className="text-slate-400">→</span>;
  if (n > o) return <span className="text-red-500 font-bold">↑</span>;
  if (n < o) return <span className="text-emerald-500 font-bold">↓</span>;
  return <span className="text-slate-400">→</span>;
}

export default function FeeAlertsPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>([]);
  const [alertType, setAlertType] = useState<AlertType>("any");
  const [frequency, setFrequency] = useState<Frequency>("instant");
  const [brokerOptions, setBrokerOptions] = useState<BrokerOption[]>([]);
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [changes, setChanges] = useState<FeeChange[]>([]);
  const [verified, setVerified] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [brokerNames, setBrokerNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Handle verify/unsubscribe tokens
    const verifyToken = searchParams.get("verify");
    const unsubToken = searchParams.get("unsubscribe");
    if (verifyToken) {
      fetch(`/api/fee-alerts?verify=${verifyToken}`).then(() => setVerified(true));
    }
    if (unsubToken) {
      fetch(`/api/fee-alerts?unsubscribe=${unsubToken}`).then(() => setUnsubscribed(true));
    }

    // Load recent fee changes
    const supabase = createClient();
    supabase
      .from("broker_data_changes")
      .select("id, broker_slug, field_name, old_value, new_value, changed_at")
      .in("field_name", ["asx_fee", "asx_fee_value", "us_fee", "us_fee_value", "fx_rate", "inactivity_fee"])
      .order("changed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setChanges((data as FeeChange[]) || []));

    // Load broker names (for change list display)
    supabase.from("brokers").select("slug, name").eq("status", "active").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((b) => { map[b.slug] = b.name; });
      setBrokerNames(map);
    });

    // Load top 20 brokers by rating for the multi-select
    supabase
      .from("brokers")
      .select("slug, name")
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setBrokerOptions((data as BrokerOption[]) || []);
      });
  }, [searchParams]);

  const toggleBroker = (slug: string) => {
    setSelectedBrokers((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const subscribe = async () => {
    setStatus("sending");
    try {
      const res = await fetch("/api/fee-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          brokerSlugs: selectedBrokers.length > 0 ? selectedBrokers : [],
          alertType,
          frequency,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Fee Alerts</span>
        </nav>

        {/* Verification banners */}
        {verified && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-center">
            <Icon name="check-circle" size={24} className="text-emerald-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-emerald-900">You&apos;re subscribed!</h2>
            <p className="text-sm text-emerald-700">You&apos;ll receive an email whenever an Australian broker changes their fees.</p>
          </div>
        )}
        {unsubscribed && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-slate-600">You&apos;ve been unsubscribed from fee alerts.</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-10 mb-6 md:mb-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_70%)]" />
          <div className="relative">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Icon name="bell" size={24} className="text-amber-500 md:hidden" />
              <Icon name="bell" size={32} className="text-amber-500 hidden md:block" />
            </div>
            <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-3">
              Fee Change Alerts
            </h1>
            <p className="text-sm md:text-lg text-slate-600 mb-0 leading-relaxed max-w-lg mx-auto">
              Get notified the moment any Australian broker changes their fees. Never miss a price increase — or a new deal.
            </p>
          </div>
        </div>

        {/* Subscribe form */}
        {!verified && (
          <div className="bg-slate-900 rounded-xl p-5 md:p-8 mb-8 md:mb-12">
            {status === "sent" ? (
              <div className="text-center py-2">
                <Icon name="mail" size={32} className="text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Check your email</h3>
                <p className="text-sm text-slate-300">Click the confirmation link we sent to <strong>{email}</strong> to activate your alerts.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="bell" size={20} className="text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Subscribe to Fee Alerts</h2>
                </div>
                <p className="text-sm text-slate-400 mb-4">Free. Instant notifications. Unsubscribe anytime.</p>

                {/* Email input */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    onKeyDown={(e) => e.key === "Enter" && subscribe()}
                  />
                </div>

                {/* Broker multi-select */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Brokers to watch <span className="text-slate-500 font-normal">(leave empty for all)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
                      className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-amber-400 flex items-center justify-between"
                    >
                      <span className={selectedBrokers.length > 0 ? "text-white" : "text-slate-500"}>
                        {selectedBrokers.length > 0
                          ? `${selectedBrokers.length} broker${selectedBrokers.length === 1 ? "" : "s"} selected`
                          : "All brokers"}
                      </span>
                      <Icon name="chevron-down" size={16} className="text-slate-400" />
                    </button>
                    {showBrokerDropdown && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                        {brokerOptions.map((b) => (
                          <label
                            key={b.slug}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBrokers.includes(b.slug)}
                              onChange={() => toggleBroker(b.slug)}
                              className="rounded border-slate-500 bg-white/10 text-amber-500 focus:ring-amber-400 focus:ring-offset-0"
                            />
                            <span className="text-sm text-slate-200">{b.name}</span>
                          </label>
                        ))}
                        {brokerOptions.length === 0 && (
                          <p className="px-3 py-2 text-xs text-slate-500">Loading brokers...</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Frequency toggle */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Frequency</label>
                  <div className="flex gap-2">
                    {(["instant", "weekly"] as Frequency[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          frequency === f
                            ? "bg-amber-500 text-white"
                            : "bg-white/10 text-slate-400 hover:bg-white/15"
                        }`}
                      >
                        {f === "instant" ? "Instant" : "Weekly Digest"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert type */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Alert type</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.entries(ALERT_TYPE_LABELS) as [AlertType, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAlertType(value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          alertType === value
                            ? "bg-amber-500 text-white"
                            : "bg-white/10 text-slate-400 hover:bg-white/15"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subscribe button */}
                <button
                  onClick={subscribe}
                  disabled={status === "sending" || !email}
                  className="w-full px-5 py-2.5 bg-amber-500 text-white font-semibold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {status === "sending" ? "Subscribing..." : "Subscribe to Alerts"}
                </button>
                {status === "error" && <p className="text-xs text-red-400 mt-2">Something went wrong. Please try again.</p>}
              </>
            )}
          </div>
        )}

        {/* What you get */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 md:mb-12">
          {[
            { icon: "zap", title: "Instant Alerts", desc: "Email within minutes of any fee change across 30+ platforms" },
            { icon: "shield", title: "Never Overpay", desc: "Know immediately when your broker raises fees so you can switch" },
            { icon: "trending-down", title: "Catch Deals", desc: "Be the first to know about fee reductions and promotions" },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <Icon name={item.icon} size={20} className="text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Recent fee changes */}
        <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-3 md:mb-4">Recent Fee Changes</h2>
        {changes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500">No fee changes recorded yet. Subscribe to be notified when they happen.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {changes.map((c, i) => (
              <div key={c.id} className={`flex items-center justify-between px-4 py-3 ${i < changes.length - 1 ? "border-b border-slate-100" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <ChangeDirection oldVal={c.old_value} newVal={c.new_value} />
                  <div className="min-w-0">
                    <Link href={`/broker/${c.broker_slug}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700 truncate block">
                      {brokerNames[c.broker_slug] || c.broker_slug}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {FIELD_LABELS[c.field_name] || c.field_name}: {c.old_value} → {c.new_value}
                    </div>
                  </div>
                </div>
                <span className="text-[0.62rem] text-slate-400 shrink-0 ml-2">
                  {new Date(c.changed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-xs text-slate-400 text-center">
          Fee data is sourced from official Product Disclosure Statements and broker websites. Always verify with the provider before making decisions.
        </div>
      </div>
    </div>
  );
}
