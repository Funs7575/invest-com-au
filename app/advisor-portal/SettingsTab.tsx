"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PushCommandCentre from "./PushCommandCentre";
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

  // Slack integration state
  const [slackUrl, setSlackUrl] = useState(advisor?.slack_webhook_url ?? "");
  const [savingSlack, setSavingSlack] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<"success" | "failure" | null>(null);

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

  const saveSlackUrl = async () => {
    setSavingSlack(true);
    setSlackError(null);
    setSlackTestResult(null);
    try {
      const res = await fetch("/api/advisor-portal/slack-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack_webhook_url: slackUrl.trim() || null }),
      });
      if (res.ok) {
        setSlackSaved(true);
        setTimeout(() => setSlackSaved(false), 3000);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setSlackError(d.error ?? "Failed to save.");
      }
    } catch {
      setSlackError("Network error — please try again.");
    }
    setSavingSlack(false);
  };

  const testSlackWebhook = async () => {
    if (!slackUrl.trim()) return;
    setTestingSlack(true);
    setSlackTestResult(null);
    try {
      const res = await fetch("/api/advisor-portal/slack-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack_webhook_url: slackUrl.trim() }),
      });
      setSlackTestResult(res.ok ? "success" : "failure");
    } catch {
      setSlackTestResult("failure");
    }
    setTestingSlack(false);
    setTimeout(() => setSlackTestResult(null), 5000);
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

      {/* Adviser Push Command Centre — renders only when the advisor_push flag
          is on for this advisor (the component self-hides otherwise). */}
      <PushCommandCentre />

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
            aria-busy={savingNotifs}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingNotifs ? "Saving..." : "Save Preferences"}
          </button>
          {notifSaved && <span role="status" className="text-sm text-emerald-600 font-medium">Saved!</span>}
        </div>
      </div>

      {/* Session pricing (DD-03) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Session Pricing</h2>
        <p className="text-xs text-slate-500 mb-4">
          Set a fee for first-party booking slots. Clients pay via Stripe; invest.com.au retains a 15% platform fee.
          Leave blank to keep bookings free.
        </p>
        {!sessionPriceLoaded ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-36 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-9 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">A$</span>
              <input
                type="number" inputMode="decimal"
                min={0}
                max={10000}
                step={1}
                value={sessionPriceDollars}
                onChange={(e) => setSessionPriceDollars(e.target.value)}
                placeholder="e.g. 250"
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-36"
              />
            </div>
            <button
              onClick={saveSessionPrice}
              disabled={savingPrice}
              aria-busy={savingPrice}
              className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingPrice ? "Saving..." : "Save"}
            </button>
            {priceSaved && <span role="status" className="text-sm text-emerald-600 font-medium">Saved!</span>}
          </div>
        )}
        {priceError && <p role="alert" className="text-xs text-red-600 mt-2">{priceError}</p>}
        {sessionPriceDollars && !priceError && (
          <p className="text-xs text-slate-500 mt-2">
            Client pays A${sessionPriceDollars} → you receive ~A${Math.floor(Number(sessionPriceDollars) * 0.85)} after 15% platform fee.
          </p>
        )}
      </div>

      {/* Slack integration (ADV-160) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Slack Integration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Get an instant Slack message every time a lead is matched to you.</p>
          </div>
        </div>

        {/* Numbered setup steps (ADV-160) */}
        <ol className="space-y-3 mb-4">
          <li className="flex gap-3 text-xs text-slate-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[11px]">1</span>
            <span className="pt-0.5">
              Open Slack and create an incoming webhook.{" "}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-violet-600 hover:underline font-medium"
                aria-label="Open Slack incoming webhooks docs (opens in new tab)"
              >
                Open Slack docs
                <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
                  <path d="M3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5A1.75 1.75 0 0 1 12.25 14H8.5a.75.75 0 0 1 0-1.5h3.75a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25V7a.75.75 0 0 1-1.5 0V3.75A1.75 1.75 0 0 1 3.75 2Zm6.78 5.22-6 6a.75.75 0 1 1-1.06-1.06l6-6a.75.75 0 0 1 1.06 1.06Z"/>
                </svg>
              </a>
            </span>
          </li>
          <li className="flex gap-3 text-xs text-slate-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[11px]">2</span>
            <span className="pt-0.5">Copy the webhook URL from Slack (starts with <span className="font-mono bg-slate-100 px-1 rounded">https://hooks.slack.com/</span>).</span>
          </li>
          <li className="flex gap-3 text-xs text-slate-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[11px]">3</span>
            <span className="pt-0.5">Paste it below and click <strong>Save</strong>.</span>
          </li>
        </ol>

        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={slackUrl}
            onChange={(e) => { setSlackUrl(e.target.value); setSlackTestResult(null); }}
            placeholder="https://hooks.slack.com/services/T.../B.../..."
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono min-w-0"
          />
          <button
            onClick={saveSlackUrl}
            disabled={savingSlack}
            aria-busy={savingSlack}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {savingSlack ? "Saving…" : "Save"}
          </button>
        </div>

        {slackUrl.trim() && (
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={testSlackWebhook}
              disabled={testingSlack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testingSlack ? (
                <>
                  <svg className="w-3 h-3 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Testing…
                </>
              ) : "Test connection"}
            </button>
            {slackTestResult === "success" && (
              <span role="status" className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
                </svg>
                Test message sent!
              </span>
            )}
            {slackTestResult === "failure" && (
              <span role="alert" className="text-xs text-red-600 font-medium flex items-center gap-1">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm-.75 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm.75 7.25a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z"/>
                </svg>
                Could not reach webhook — check the URL.
              </span>
            )}
          </div>
        )}

        {slackError && <p role="alert" className="text-xs text-red-600 mt-1">{slackError}</p>}
        {slackSaved && <p role="status" className="text-xs text-emerald-600 font-medium mt-1">Slack connected! You&rsquo;ll get a ping for every new lead.</p>}
        {slackUrl && !slackSaved && !slackError && !slackTestResult && (
          <p className="text-xs text-slate-500 mt-1">Connected — to disconnect, clear the URL and save.</p>
        )}

        <Link
          href="/advisor-portal/webhooks"
          className="inline-block mt-3 text-xs text-violet-600 hover:text-violet-800"
        >
          Need HubSpot / Salesforce / Zapier? Set up a full webhook →
        </Link>
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
            <Link href={`/advisor/${advisor?.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 hover:text-violet-800 font-medium">
              View Public Profile ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
