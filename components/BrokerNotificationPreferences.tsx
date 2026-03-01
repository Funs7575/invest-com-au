"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

interface BrokerPrefs {
  campaign_approved: boolean;
  campaign_rejected: boolean;
  low_balance: boolean;
  daily_performance: boolean;
  weekly_summary: boolean;
  system_announcements: boolean;
}

const defaultPrefs: BrokerPrefs = {
  campaign_approved: true,
  campaign_rejected: true,
  low_balance: true,
  daily_performance: true,
  weekly_summary: true,
  system_announcements: true,
};

const prefsMeta: {
  key: keyof BrokerPrefs;
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    key: "campaign_approved",
    label: "Campaign Approved",
    description: "Get notified when your campaigns are approved and ready to go live",
    icon: "check-circle",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    key: "campaign_rejected",
    label: "Campaign Rejected",
    description: "Get notified when a campaign needs changes before approval",
    icon: "x-circle",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    key: "low_balance",
    label: "Low Balance Warnings",
    description: "Email alerts when your wallet drops below the configured threshold",
    icon: "alert-triangle",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    key: "daily_performance",
    label: "Daily Performance Digest",
    description: "Daily email with clicks, conversions, and spend across all campaigns",
    icon: "bar-chart-2",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    key: "weekly_summary",
    label: "Weekly Summary",
    description: "Weekly rollup of campaign performance and marketplace activity",
    icon: "calendar",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    key: "system_announcements",
    label: "System Announcements",
    description: "Important platform updates, maintenance notices, and policy changes",
    icon: "info",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

/**
 * Broker notification email preferences component.
 * Stores preferences in the broker_accounts JSON column `email_preferences`.
 * Falls back to defaults if no preferences are saved.
 */
export default function BrokerNotificationPreferences({
  brokerSlug,
}: {
  brokerSlug: string;
}) {
  const [prefs, setPrefs] = useState<BrokerPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPrefs = useCallback(async () => {
    if (!brokerSlug) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("broker_accounts")
        .select("email_preferences")
        .eq("broker_slug", brokerSlug)
        .maybeSingle();

      if (data?.email_preferences) {
        setPrefs({ ...defaultPrefs, ...data.email_preferences });
      }
    } catch {
      // Fall back to defaults
    } finally {
      setLoading(false);
    }
  }, [brokerSlug]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const savePrefs = useCallback(
    async (newPrefs: BrokerPrefs) => {
      if (!brokerSlug) return;
      setSaving(true);
      setSaved(false);
      setError(null);

      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("broker_accounts")
          .update({
            email_preferences: newPrefs,
            updated_at: new Date().toISOString(),
          })
          .eq("broker_slug", brokerSlug);

        if (updateError) throw updateError;

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError("Failed to save. Please try again.");
        setTimeout(() => setError(null), 3000);
      } finally {
        setSaving(false);
      }
    },
    [brokerSlug]
  );

  const togglePref = (key: keyof BrokerPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    // Debounce the save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePrefs(newPrefs), 400);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {prefsMeta.map((item) => (
        <div
          key={item.key}
          className="flex items-start justify-between gap-3 py-3"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
            >
              <Icon name={item.icon} size={14} className={item.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </div>
          </div>
          <button
            onClick={() => togglePref(item.key)}
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-1 ${
              prefs[item.key] ? "bg-green-500" : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={prefs[item.key]}
            aria-label={`${item.label} ${prefs[item.key] ? "enabled" : "disabled"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                prefs[item.key] ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      ))}

      {/* Status line */}
      <div className="h-5 flex items-center">
        {saving && <span className="text-xs text-slate-400">Saving...</span>}
        {saved && <span className="text-xs text-green-600 font-medium">Preferences saved</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
