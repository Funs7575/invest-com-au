"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { BrokerAccount } from "@/lib/types";
import BrokerNotificationPreferences from "@/components/BrokerNotificationPreferences";

export default function SettingsPage() {
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  // Terms acceptance
  const [termsChecked, setTermsChecked] = useState(false);

  // API key
  const [showApiKey, setShowApiKey] = useState(false);

  // Low-balance alerts
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(100);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: acc } = await supabase
        .from("broker_accounts")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (acc) {
        const a = acc as BrokerAccount;
        setAccount(a);
        setFullName(a.full_name);
        setCompanyName(a.company_name || "");
        setPhone(a.phone || "");

        // Fetch wallet for low-balance alert settings
        const { data: wallet } = await supabase
          .from("broker_wallets")
          .select("low_balance_alert_enabled, low_balance_threshold_cents")
          .eq("broker_slug", a.broker_slug)
          .maybeSingle();

        if (wallet) {
          setAlertEnabled(wallet.low_balance_alert_enabled ?? true);
          setAlertThreshold((wallet.low_balance_threshold_cents ?? 10000) / 100);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("broker_accounts")
      .update({
        full_name: fullName,
        company_name: companyName || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    setSaving(false);
    toast("Settings saved", "success");
  };

  const handleAcceptTerms = async () => {
    if (!account) return;
    setSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("broker_accounts")
      .update({
        terms_accepted_at: now,
        terms_version: "1.0",
        updated_at: now,
      })
      .eq("id", account.id);
    setAccount({ ...account, terms_accepted_at: now, terms_version: "1.0" } as BrokerAccount);
    setSaving(false);
    toast("Terms accepted", "success");
  };

  const handleSaveAlerts = async () => {
    if (!account) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("broker_wallets")
      .update({
        low_balance_alert_enabled: alertEnabled,
        low_balance_threshold_cents: alertThreshold * 100,
      })
      .eq("broker_slug", account.broker_slug);
    setSaving(false);
    toast("Alert preferences saved", "success");
  };

  if (loading) {
    return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;
  }

  if (!account) {
    return <p className="text-slate-500">Account not found.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your broker account details</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon name="user" size={14} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-900">Account Details</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={account.email}
            disabled
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
          />
          <p className="text-xs text-slate-400 mt-1">Contact support to change your email.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
            placeholder="+61 4xx xxx xxx"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Broker</label>
            <input
              type="text"
              value={account.broker_slug}
              disabled
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <input
              type="text"
              value={account.role}
              disabled
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Account Info */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-2">
        <p className="text-xs text-slate-500">
          Account created: {new Date(account.created_at).toLocaleDateString("en-AU")}
        </p>
        {account.last_login_at && (
          <p className="text-xs text-slate-500">
            Last login: {new Date(account.last_login_at).toLocaleDateString("en-AU")}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Need help? Contact{" "}
          <a href="mailto:partners@invest.com.au" className="text-slate-700 underline">
            partners@invest.com.au
          </a>
        </p>
      </div>

      {/* Terms Acceptance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
            <Icon name="shield-check" size={14} className="text-green-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Marketplace Terms</h3>
        </div>
        {account?.terms_accepted_at ? (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
            <Icon name="check-circle" size={16} className="text-green-600" />
            <span className="text-sm">Terms accepted on {new Date(account.terms_accepted_at).toLocaleDateString("en-AU")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">You must accept the marketplace terms before creating campaigns.</p>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} className="mt-1" />
              <span className="text-sm text-slate-700">I accept the <a href="/terms" className="text-slate-900 underline">Marketplace Terms and Conditions</a> (v1.0)</span>
            </label>
            <button
              onClick={handleAcceptTerms}
              disabled={!termsChecked || saving}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Accept Terms
            </button>
          </div>
        )}
      </div>

      {/* Postback API Key */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Icon name="key" size={14} className="text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Postback API Key</h3>
          <InfoTip text="Use this key in the Authorization header when sending conversion events to our API. Keep it secret -- never expose in client-side code." />
        </div>
        <p className="text-sm text-slate-600 mb-3">Use this key to report conversions via the postback API.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-xs font-mono text-slate-700 truncate">
            {showApiKey ? account?.postback_api_key : "••••••••••••••••••••••••"}
          </code>
          <button onClick={() => setShowApiKey(!showApiKey)} className="px-3 py-2 text-xs bg-slate-200 rounded hover:bg-slate-300">
            {showApiKey ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(account?.postback_api_key || ""); toast("API key copied", "success"); }}
            className="px-3 py-2 text-xs bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Low-Balance Alerts */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <Icon name="bell" size={14} className="text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Low Balance Alerts</h3>
          <InfoTip text="Get emailed when your wallet drops below the threshold. Prevents campaigns from pausing due to insufficient funds." />
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">Email me when my wallet balance is low</span>
          </label>
          {alertEnabled && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">Alert when balance drops below <InfoTip text="We recommend setting this to at least 2x your average daily spend to give you time to top up." /></label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  type="number"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  min={10}
                  step={10}
                />
              </div>
            </div>
          )}
          <button onClick={handleSaveAlerts} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Save Alert Preferences
          </button>
        </div>
      </div>

      {/* Email Notification Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
            <Icon name="mail" size={14} className="text-green-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Email Notifications</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Choose which email notifications you'd like to receive. Changes save automatically.
        </p>
        <BrokerNotificationPreferences brokerSlug={account.broker_slug} />
      </div>
    </div>
  );
}
