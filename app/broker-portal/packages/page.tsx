"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";

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

const TIER_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string; iconBg: string; iconColor: string }> = {
  starter: { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-200 text-slate-700", icon: "zap", iconBg: "bg-slate-100", iconColor: "text-slate-500" },
  growth: { bg: "bg-slate-50", border: "border-slate-300", badge: "bg-slate-300 text-slate-800", icon: "trending-up", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  dominance: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-200 text-purple-800", icon: "trophy", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  enterprise: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-200 text-amber-800", icon: "building", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
};

const TIER_FEATURES: Record<string, string[]> = {
  starter: ["CPC advertising across all placements", "Pay-per-click billing", "Basic reporting dashboard", "Standard support"],
  growth: ["Everything in Starter", "1 featured placement included", "10% CPC rate discount", "Priority support"],
  dominance: ["Everything in Growth", "3 featured placements included", "20% CPC rate discount", "Share-of-voice targeting", "Priority support"],
  enterprise: ["Everything in Dominance", "Custom rate card", "Dedicated account manager", "Quarterly benchmark reports", "Custom integrations"],
};

const CANCELLATION_REASONS = [
  "Too expensive",
  "Not seeing enough ROI",
  "Switching to another platform",
  "Reducing ad spend temporarily",
  "Missing features I need",
  "Other",
];

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentPackageId, setCurrentPackageId] = useState<number | null>(null);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const { toast } = useToast();

  // Change/cancel confirmation dialog
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<"upgrade" | "downgrade" | "cancel">("upgrade");
  const [targetPackage, setTargetPackage] = useState<Package | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonOther, setCancelReasonOther] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [confirming, setConfirming] = useState(false);

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

  const currentPkg = packages.find(p => p.id === currentPackageId);

  const initiateChange = (pkg: Package) => {
    const currentOrder = currentPkg?.sort_order ?? 0;
    const targetOrder = pkg.sort_order;

    if (targetOrder > currentOrder) {
      setDialogAction("upgrade");
    } else if (targetOrder < currentOrder) {
      setDialogAction("downgrade");
    } else {
      setDialogAction("upgrade");
    }

    setTargetPackage(pkg);
    setCancelReason("");
    setCancelReasonOther("");
    setCancelFeedback("");
    setShowDialog(true);
  };

  const initiateCancellation = () => {
    // Find the starter/free package
    const starterPkg = packages.find(p => p.tier === "starter") || packages[0];
    setTargetPackage(starterPkg);
    setDialogAction("cancel");
    setCancelReason("");
    setCancelReasonOther("");
    setCancelFeedback("");
    setShowDialog(true);
  };

  const handleConfirm = async () => {
    if (!targetPackage) return;
    if (dialogAction !== "upgrade" && !cancelReason) {
      toast("Please select a reason", "error");
      return;
    }
    setConfirming(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const reasonText = cancelReason === "Other" ? cancelReasonOther : cancelReason;

    // Update package
    await supabase
      .from("broker_accounts")
      .update({
        package_id: dialogAction === "cancel" ? null : targetPackage.id,
        package_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", user.id);

    // Log the change/cancellation to admin notifications
    if (dialogAction === "downgrade" || dialogAction === "cancel") {
      await supabase.from("broker_notifications").insert({
        broker_slug: brokerSlug,
        type: "system",
        title: dialogAction === "cancel" ? "Package Cancelled" : "Package Downgraded",
        message: dialogAction === "cancel"
          ? `You've cancelled your ${currentPkg?.name || "current"} plan. You can re-subscribe at any time.`
          : `You've switched from ${currentPkg?.name || "your plan"} to ${targetPackage.name}.`,
        link: "/broker-portal/packages",
        is_read: false,
        email_sent: false,
      });

      // Log cancellation reason for admin visibility
      await supabase.from("admin_audit_log").insert({
        action: dialogAction === "cancel" ? "package_cancelled" : "package_downgraded",
        entity_type: "broker_account",
        entity_id: brokerSlug,
        entity_name: brokerSlug,
        details: {
          previous_package: currentPkg?.name || null,
          new_package: dialogAction === "cancel" ? null : targetPackage.name,
          reason: reasonText,
          feedback: cancelFeedback || null,
        },
        admin_email: "self-service",
      });
    }

    setCurrentPackageId(dialogAction === "cancel" ? null : targetPackage.id);
    setShowDialog(false);
    setConfirming(false);

    if (dialogAction === "cancel") {
      toast("Package cancelled", "success");
    } else if (dialogAction === "downgrade") {
      toast(`Switched to ${targetPackage.name}`, "success");
    } else {
      toast(`Upgraded to ${targetPackage.name}`, "success");
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Advertising Packages</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a package to unlock discounts and featured placements.
          </p>
        </div>
        {currentPkg && currentPkg.tier !== "starter" && (
          <button
            onClick={initiateCancellation}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            Cancel subscription
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 portal-stagger">
        {packages.map((pkg) => {
          const colors = TIER_COLORS[pkg.tier] || TIER_COLORS.starter;
          const features = TIER_FEATURES[pkg.tier] || [];
          const isCurrent = pkg.id === currentPackageId;
          const isEnterprise = pkg.tier === "enterprise";
          const isDowngrade = currentPkg ? pkg.sort_order < currentPkg.sort_order : false;

          return (
            <div
              key={pkg.id}
              className={`relative rounded-xl border-2 p-6 flex flex-col hover-lift transition-all ${
                isCurrent
                  ? "border-slate-900 ring-2 ring-slate-200"
                  : colors.border
              } ${colors.bg}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-slate-900 text-white text-[0.69rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                  <Icon name={colors.icon} size={16} className={colors.iconColor} />
                </div>
                <span className={`inline-block px-2 py-0.5 rounded text-[0.69rem] font-bold uppercase tracking-wider ${colors.badge}`}>
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
                    <Icon name="check-circle" size={13} className="text-amber-500 mt-0.5 shrink-0" />
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
                  onClick={() => initiateChange(pkg)}
                  disabled={selecting}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    isDowngrade
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {selecting ? "Processing..." : isDowngrade ? "Downgrade" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-2">Package Details</h3>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Icon name="dollar-sign" size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">CPC Rate Discounts <InfoTip text="Your discount is automatically applied to every CPC campaign click. A 10% discount on a $2.00 CPC means you pay $1.80 per click." /></p>
              <p>Package discounts are applied automatically to all CPC campaigns.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="star" size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Featured Placements <InfoTip text="Included featured slots let you run featured campaigns without per-slot charges. Additional slots are billed to your wallet." /></p>
              <p>Included featured slots are deducted from your monthly fee, not your wallet.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Icon name="wallet" size={14} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-1">Billing</p>
              <p>Package fees are charged monthly to your wallet. CPC clicks are billed per click.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showDialog && targetPackage && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 bounce-in-up" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {dialogAction === "cancel"
                  ? "Cancel Your Subscription"
                  : dialogAction === "downgrade"
                  ? "Confirm Downgrade"
                  : "Confirm Upgrade"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {dialogAction === "cancel"
                  ? `You're about to cancel your ${currentPkg?.name || ""} plan.`
                  : dialogAction === "downgrade"
                  ? `Switch from ${currentPkg?.name} to ${targetPackage.name}.`
                  : `Upgrade from ${currentPkg?.name || "Free"} to ${targetPackage.name}.`}
              </p>
            </div>

            {/* What happens section */}
            {dialogAction === "cancel" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">What happens when you cancel</p>
                <ul className="space-y-1.5 text-xs text-red-600">
                  <li className="flex items-start gap-2"><span>•</span> CPC rate discounts will be removed</li>
                  <li className="flex items-start gap-2"><span>•</span> Included featured placements will end</li>
                  <li className="flex items-start gap-2"><span>•</span> You keep your wallet balance and active campaigns</li>
                  <li className="flex items-start gap-2"><span>•</span> Standard (pay-per-click) billing remains available</li>
                </ul>
              </div>
            )}

            {dialogAction === "downgrade" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">What changes</p>
                <ul className="space-y-1.5 text-xs text-amber-700">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      Discount: {currentPkg?.cpc_rate_discount_pct || 0}% → {targetPackage.cpc_rate_discount_pct || 0}%
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      Featured slots: {currentPkg?.featured_slots_included || 0} → {targetPackage.featured_slots_included || 0}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      Monthly fee: ${((currentPkg?.monthly_fee_cents || 0) / 100).toFixed(0)} → ${(targetPackage.monthly_fee_cents / 100).toFixed(0)}
                    </span>
                  </li>
                </ul>
              </div>
            )}

            {dialogAction === "upgrade" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">What you get</p>
                <ul className="space-y-1.5 text-xs text-emerald-700">
                  {targetPackage.cpc_rate_discount_pct > 0 && (
                    <li className="flex items-start gap-2"><span>✓</span> {targetPackage.cpc_rate_discount_pct}% CPC rate discount</li>
                  )}
                  {targetPackage.featured_slots_included > 0 && (
                    <li className="flex items-start gap-2"><span>✓</span> {targetPackage.featured_slots_included} featured placement{targetPackage.featured_slots_included !== 1 ? "s" : ""} included</li>
                  )}
                  <li className="flex items-start gap-2"><span>✓</span> {targetPackage.support_level} support</li>
                </ul>
              </div>
            )}

            {/* Reason (for downgrade/cancel) */}
            {dialogAction !== "upgrade" && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">
                  Why are you {dialogAction === "cancel" ? "cancelling" : "downgrading"}? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {CANCELLATION_REASONS.map(reason => (
                    <label key={reason} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                        className="w-3.5 h-3.5 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm text-slate-700">{reason}</span>
                    </label>
                  ))}
                </div>
                {cancelReason === "Other" && (
                  <input
                    type="text"
                    value={cancelReasonOther}
                    onChange={(e) => setCancelReasonOther(e.target.value)}
                    placeholder="Please specify..."
                    className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  />
                )}
                <textarea
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  placeholder="Any additional feedback? (optional)"
                  rows={2}
                  className="mt-3 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/30 resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Keep Current Plan
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || (dialogAction !== "upgrade" && !cancelReason) || (cancelReason === "Other" && !cancelReasonOther.trim())}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
                  dialogAction === "cancel"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : dialogAction === "downgrade"
                    ? "bg-amber-500 text-slate-900 hover:bg-amber-600"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {confirming
                  ? "Processing..."
                  : dialogAction === "cancel"
                  ? "Cancel Subscription"
                  : dialogAction === "downgrade"
                  ? "Confirm Downgrade"
                  : "Confirm Upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
