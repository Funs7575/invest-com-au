"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Package {
  id: number;
  slug: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_fee_cents: number;
  cpc_rate_discount_pct: number;
  featured_slots_included: number;
  support_level: string;
  sort_order: number;
}

const TIER_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  starter: { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-200 text-slate-700" },
  growth: { bg: "bg-slate-50", border: "border-slate-300", badge: "bg-slate-300 text-slate-800" },
  dominance: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-200 text-purple-800" },
  enterprise: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-200 text-amber-800" },
};

const TIER_FEATURES: Record<string, string[]> = {
  starter: ["CPC advertising across all placements", "Pay-per-click billing", "Basic reporting dashboard", "Standard support"],
  growth: ["Everything in Starter", "1 featured placement included", "10% CPC rate discount", "Priority support"],
  dominance: ["Everything in Growth", "3 featured placements included", "20% CPC rate discount", "Share-of-voice targeting", "Priority support"],
  enterprise: ["Everything in Dominance", "Custom rate card", "Dedicated account manager", "Quarterly benchmark reports", "Custom integrations"],
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPackageId, setCurrentPackageId] = useState<number | null>(null);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, package_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);
      setCurrentPackageId(account.package_id || null);

      const { data: pkgs } = await supabase
        .from("broker_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setPackages((pkgs || []) as Package[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleSelect = async (pkgId: number) => {
    setSelecting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("broker_accounts")
      .update({
        package_id: pkgId,
        package_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    setCurrentPackageId(pkgId);
    setSelecting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Advertising Packages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose a package to unlock discounts and featured placements.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => {
          const colors = TIER_COLORS[pkg.tier] || TIER_COLORS.starter;
          const features = TIER_FEATURES[pkg.tier] || [];
          const isCurrent = pkg.id === currentPackageId;
          const isEnterprise = pkg.tier === "enterprise";

          return (
            <div
              key={pkg.id}
              className={`relative rounded-xl border-2 p-6 flex flex-col ${
                isCurrent
                  ? "border-slate-900 ring-2 ring-slate-200"
                  : colors.border
              } ${colors.bg}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-slate-900 text-white text-[0.6rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4">
                <span className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase tracking-wider ${colors.badge}`}>
                  {pkg.tier}
                </span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900">{pkg.name}</h3>

              <div className="mt-2 mb-4">
                {pkg.monthly_fee_cents > 0 ? (
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">
                      ${(pkg.monthly_fee_cents / 100).toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500">/mo</span>
                  </div>
                ) : isEnterprise ? (
                  <span className="text-lg font-bold text-slate-700">Custom Pricing</span>
                ) : (
                  <span className="text-lg font-bold text-slate-700">Free</span>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-4">{pkg.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isEnterprise ? (
                <a
                  href="mailto:partners@invest.com.au"
                  className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500 text-slate-900 hover:bg-amber-600 transition-colors"
                >
                  Contact Us
                </a>
              ) : isCurrent ? (
                <div className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700">
                  Active
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(pkg.id)}
                  disabled={selecting}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {selecting ? "Selecting..." : "Select Package"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-2">Package Details</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div>
            <p className="font-medium text-slate-800 mb-1">CPC Rate Discounts</p>
            <p>Package discounts are applied automatically to all CPC campaigns.</p>
          </div>
          <div>
            <p className="font-medium text-slate-800 mb-1">Featured Placements</p>
            <p>Included featured slots are deducted from your monthly fee, not your wallet.</p>
          </div>
          <div>
            <p className="font-medium text-slate-800 mb-1">Billing</p>
            <p>Package fees are charged monthly to your wallet. CPC clicks are billed per click.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
