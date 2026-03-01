"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Preferences {
  fee_alerts: boolean;
  weekly_digest: boolean;
  deal_alerts: boolean;
  campaign_updates: boolean;
  marketing: boolean;
}

const defaultPreferences: Preferences = {
  fee_alerts: true,
  weekly_digest: true,
  deal_alerts: true,
  campaign_updates: true,
  marketing: false,
};

const preferencesMeta: {
  key: keyof Preferences;
  label: string;
  description: string;
  pro?: boolean;
}[] = [
  {
    key: "weekly_digest",
    label: "Weekly Digest",
    description: "Fee changes, new articles, and broker deals every Monday",
  },
  {
    key: "fee_alerts",
    label: "Fee Change Alerts",
    description: "Get notified when any broker changes their fees",
    pro: true,
  },
  {
    key: "deal_alerts",
    label: "Deal Alerts",
    description: "New broker promotions and limited-time offers",
  },
  {
    key: "campaign_updates",
    label: "Product Updates",
    description: "New features, tools, and improvements on Invest.com.au",
  },
  {
    key: "marketing",
    label: "Marketing Emails",
    description: "Occasional partner offers and sponsored content",
  },
];

export default function NotificationPreferences({ isPro }: { isPro?: boolean }) {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notification-preferences");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (data.preferences) {
        setPrefs(data.preferences);
      }
    } catch {
      // Fall back to defaults silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const savePrefs = useCallback(async (newPrefs: Preferences) => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrefs),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      if (data.preferences) {
        setPrefs(data.preferences);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save preferences. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }, []);

  const togglePref = (key: keyof Preferences) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    // Debounce the save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePrefs(newPrefs), 400);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {preferencesMeta.map((item) => {
        const isProLocked = item.pro && !isPro;

        return (
          <div
            key={item.key}
            className="flex items-start justify-between gap-3 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                {item.pro && (
                  <span className="text-[0.62rem] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={() => togglePref(item.key)}
              disabled={isProLocked}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                isProLocked
                  ? "bg-slate-100 cursor-not-allowed"
                  : prefs[item.key]
                  ? "bg-green-500"
                  : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={prefs[item.key]}
              aria-label={`${item.label} ${prefs[item.key] ? "enabled" : "disabled"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs[item.key] && !isProLocked ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}

      {/* Status indicators */}
      <div className="h-5 flex items-center">
        {saving && (
          <span className="text-xs text-slate-400">Saving...</span>
        )}
        {saved && (
          <span className="text-xs text-green-600 font-medium">Saved</span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}
