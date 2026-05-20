"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Advisor } from "./types";

type NotifPrefs = { new_lead: boolean; weekly_summary: boolean; billing_alerts: boolean; review_new: boolean };

type Props = {
  advisor: Advisor | null;
};

export default function SettingsTab({ advisor }: Props) {
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ new_lead: true, weekly_summary: true, billing_alerts: true, review_new: false });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Session pricing state (DD-03)
  const [sessionPriceDollars, setSessionPriceDollars] = useState<string>("");
  const [sessionPriceLoaded, setSessionPriceLoaded] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setNotifPrefs(d.prefs || { new_lead: true, weekly_summary: true, billing_alerts: true, review_new: false }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/advisor-portal/session-pricing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { priceInDollars?: number | null } | null) => {
        if (d && d.priceInDollars !== null && d.priceInDollars !== undefined) {
          setSessionPriceDollars(String(d.priceInDollars));
        }
        setSessionPriceLoaded(true);
      })
      .catch(() => setSessionPriceLoaded(true));
  }, []);

  const saveSessionPrice = async () => {
    setSavingPrice(true);
    setPriceError(null);
    try {
      const priceInDollars = sessionPriceDollars === "" ? null : Number.parseInt(sessionPriceDollars, 10);
      if (priceInDollars !== null && (Number.isNaN(priceInDollars) || priceInDollars < 0 || priceInDollars > 10_000)) {
        setPriceError("Enter a whole dollar amount between $1 and $10,000, or leave blank for free bookings.");
        setSavingPrice(false);
        return;
      }
      const res = await fetch("/api/advisor-portal/session-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceInDollars }),
      });
      if (res.ok) { setPriceSaved(true); setTimeout(() => setPriceSaved(false), 3000); }
      else { const d = await res.json() as { error?: string }; setPriceError(d.error ?? "Failed to save."); }
    } catch { setPriceError("Something went wrong."); }
    setSavingPrice(false);
  };

  const saveNotifPrefs = async () => {
    setSavingNotifs(true);
    try {
      const res = await fetch("/api/advisor-auth/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: notifPrefs }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      }
    } catch { /* ignore */ }
    setSavingNotifs(false);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your notification preferences.</p>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Email Notifications</h2>
        <p className="text-xs text-slate-500 mb-4">Control which emails you receive from Invest.com.au</p>
        <div className="space-y-4">
          {([
            { key: "new_lead", label: "New lead received", desc: "Instant alert when someone enquires about your services" },
            { key: "billing_alerts", label: "Billing alerts", desc: "Low credit balance warnings and payment confirmations" },
            { key: "weekly_summary", label: "Weekly performance summary", desc: "Views, enquiries, and conversion stats every Monday" },
            { key: "review_new", label: "New review submitted", desc: "Notification when a client submits a review" },
          ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${notifPrefs[key] ? "bg-violet-600" : "bg-slate-200"}`}
                role="switch"
                aria-checked={notifPrefs[key]}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${notifPrefs[key] ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={saveNotifPrefs}
            disabled={savingNotifs}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {savingNotifs ? "Saving..." : "Save Preferences"}
          </button>
          {notifSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
        </div>
      </div>

      {/* Session pricing (DD-03) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Session Pricing</h2>
        <p className="text-xs text-slate-500 mb-4">
          Set a fee for first-party booking slots. Clients pay via Stripe; invest.com.au retains a 15% platform fee.
          Leave blank to keep bookings free.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">A$</span>
            <input
              type="number"
              min={0}
              max={10000}
              step={1}
              value={sessionPriceDollars}
              onChange={(e) => setSessionPriceDollars(e.target.value)}
              placeholder={sessionPriceLoaded ? "e.g. 250" : "Loading..."}
              disabled={!sessionPriceLoaded}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-36 disabled:opacity-50"
            />
          </div>
          <button
            onClick={saveSessionPrice}
            disabled={savingPrice || !sessionPriceLoaded}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {savingPrice ? "Saving..." : "Save"}
          </button>
          {priceSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
        </div>
        {priceError && <p className="text-xs text-red-600 mt-2">{priceError}</p>}
        {sessionPriceDollars && !priceError && (
          <p className="text-xs text-slate-400 mt-2">
            Client pays A${sessionPriceDollars} → you receive ~A${Math.floor(Number(sessionPriceDollars) * 0.85)} after 15% platform fee.
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Compliance documents</h2>
        <p className="text-xs text-slate-500 mb-3">
          Upload AFSL, ABN, proof of ID and insurance certificates. Files
          are reviewed by compliance within 1 business day.
        </p>
        <Link
          href="/advisor-portal/kyc"
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Manage KYC documents →
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Account</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600">Email</p>
            <p className="text-sm text-slate-800 mt-0.5">{advisor?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Profile Status</p>
            <p className={`text-sm font-semibold mt-0.5 ${advisor?.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>{advisor?.status}</p>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="text-sm text-violet-600 hover:text-violet-800 font-medium">
              View Public Profile ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
