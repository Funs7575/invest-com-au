"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

type NotifPrefs = {
  new_enrollment: boolean;
  weekly_summary: boolean;
  payout_alerts: boolean;
};

type Props = {
  org: Organisation | null;
};

export default function OrgSettingsTab({ org }: Props) {
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    new_enrollment: true,
    weekly_summary: true,
    payout_alerts: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/settings");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.notification_prefs) {
            setNotifPrefs({
              new_enrollment: data.notification_prefs.new_enrollment ?? true,
              weekly_summary: data.notification_prefs.weekly_summary ?? true,
              payout_alerts: data.notification_prefs.payout_alerts ?? true,
            });
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/org-auth/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_prefs: notifPrefs }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const togglePref = (key: keyof NotifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your notification preferences and account settings.</p>

      {/* Notifications */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Email Notifications</h2>
        <p className="text-xs text-slate-500 mb-4">Control which emails you receive from Invest.com.au</p>
        <div className="space-y-4">
          {([
            {
              key: "new_enrollment" as keyof NotifPrefs,
              label: "New enrollment",
              desc: "Email when a student enrolls in one of your courses",
            },
            {
              key: "weekly_summary" as keyof NotifPrefs,
              label: "Weekly digest",
              desc: "Weekly summary of enrollments, revenue, and student progress",
            },
            {
              key: "payout_alerts" as keyof NotifPrefs,
              label: "Payout alerts",
              desc: "Stripe payout notifications and payment events",
            },
          ]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => togglePref(key)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${notifPrefs[key] ? "bg-teal-600" : "bg-slate-200"}`}
                role="switch"
                aria-checked={notifPrefs[key]}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${notifPrefs[key] ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={savePrefs}
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <Icon name="check-circle" size={16} />
              Saved!
            </span>
          )}
        </div>
      </div>

      {/* Account */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Account</h2>
        <div className="space-y-3">
          {org?.email && (
            <div>
              <p className="text-xs font-semibold text-slate-600">Email</p>
              <p className="text-sm text-slate-800 mt-0.5">{org.email}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-600">Status</p>
            <p className={`text-sm font-semibold mt-0.5 ${org?.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>
              {org?.status ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Verification</p>
            <p className={`text-sm font-semibold mt-0.5 ${org?.verification_status === "verified" ? "text-emerald-600" : "text-amber-600"}`}>
              {org?.verification_status ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white border border-red-100 rounded-xl p-5">
        <h2 className="text-sm font-bold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-slate-500">
          To delete your organisation account, please contact{" "}
          <a href="mailto:support@invest.com.au" className="text-teal-600 hover:underline font-medium">
            support@invest.com.au
          </a>
          . Account deletion is irreversible and will remove all courses, student records, and payout history.
        </p>
      </div>
    </div>
  );
}
