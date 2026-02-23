"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BrokerAccount } from "@/lib/types";

export default function SettingsPage() {
  const [account, setAccount] = useState<BrokerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

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
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setSaving(true);
    setSaved(false);

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
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
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
            className="px-6 py-2.5 bg-green-700 text-white font-bold text-sm rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-700 font-medium">✓ Saved</span>
          )}
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
          <a href="mailto:partners@invest.com.au" className="text-green-700 underline">
            partners@invest.com.au
          </a>
        </p>
      </div>
    </div>
  );
}
