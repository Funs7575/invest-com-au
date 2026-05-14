"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { CreditPack } from "@/lib/advisor-credit-packs";

interface Props {
  advisorName: string;
  balanceCents: number;
  lifetimeCreditCents: number;
  lifetimeSpendCents: number;
  autoRechargeEnabled: boolean;
  autoRechargeThresholdCredits: number;
  autoRechargePackSlug: string | null;
  hasSavedCard: boolean;
  packs: CreditPack[];
}

function fmtAud(cents: number): string {
  return `A$${(cents / 100).toFixed(0)}`;
}

function creditsFromCents(cents: number): number {
  // 1 credit = A$1.00 in the brief-marketplace ledger.
  return Math.floor(cents / 100);
}

export default function BillingClient(props: Props) {
  const [autoEnabled, setAutoEnabled] = useState(props.autoRechargeEnabled);
  const [threshold, setThreshold] = useState(props.autoRechargeThresholdCredits);
  const [autoPack, setAutoPack] = useState<string>(
    props.autoRechargePackSlug ?? "marketplace_50",
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [topupPack, setTopupPack] = useState<string | null>(null);

  const balanceCredits = creditsFromCents(props.balanceCents);
  const isLowBalance = balanceCredits < 5;

  async function startTopup(packSlug: string) {
    setTopupPack(packSlug);
    try {
      const res = await fetch("/api/advisor-auth/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_slug: packSlug }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start checkout");
      }
      window.location.href = json.url;
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setTopupPack(null);
    }
  }

  async function saveAutoRecharge() {
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      const res = await fetch("/api/pros/billing/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoEnabled,
          threshold_credits: threshold,
          pack_slug: autoPack,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save settings");
      }
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <section
        data-tour="balance"
        className={`rounded-2xl border p-5 sm:p-6 ${
          isLowBalance
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-slate-200"
        }`}
      >
        <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1">
          Current balance
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-1">
          {balanceCredits} <span className="text-base font-bold text-slate-500">credits</span>
        </p>
        <p className="text-xs text-slate-500">
          A${(props.balanceCents / 100).toFixed(2)} available · 1 credit = A$1
        </p>
        {isLowBalance && (
          <p className="text-xs text-amber-700 mt-3 font-semibold">
            ⚠ Low balance — top up below to keep accepting Match Requests.
          </p>
        )}
      </section>

      {/* Top-up packs */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Top up credits</h2>
        <p className="text-sm text-slate-500 mb-5">
          One-off payment via Stripe. Your card is saved for auto-recharge if you turn it on below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {props.packs.map((p) => (
            <article
              key={p.slug}
              className={`relative rounded-xl border p-4 ${
                p.badge ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2 left-3 inline-block text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                  {p.badge}
                </span>
              )}
              <p className="text-base font-bold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500 mb-2">{p.description}</p>
              <p className="text-2xl font-extrabold text-slate-900">{fmtAud(p.priceCents)}</p>
              <p className="text-[10px] text-slate-400 mb-3">
                A${(p.perLeadCents / 100).toFixed(2)} per credit
              </p>
              <button
                type="button"
                disabled={topupPack !== null}
                onClick={() => void startTopup(p.slug)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-bold px-3 py-2 rounded-lg"
              >
                {topupPack === p.slug ? "Loading…" : "Buy"}
                <Icon name="arrow-right" size={12} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Auto-recharge */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Auto-recharge</h2>
        <p className="text-sm text-slate-500 mb-5">
          Automatically buy credits when your balance falls below a threshold. Uses the card you last paid with.
        </p>

        {!props.hasSavedCard ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            Make a top-up purchase above first — Stripe will save your card for auto-recharge.
          </div>
        ) : (
          <div className="space-y-4">
            <label data-tour="auto-recharge" className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={autoEnabled}
                onChange={(e) => setAutoEnabled(e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900">Enable auto-recharge</span>
                <p className="text-xs text-slate-500">
                  When enabled, we&apos;ll charge your saved card and add credits automatically when the balance is below your threshold.
                </p>
              </div>
            </label>

            <fieldset disabled={!autoEnabled} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Recharge when balance falls below</span>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="mt-1 block w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50"
                >
                  <option value={5}>5 credits (A$5)</option>
                  <option value={10}>10 credits (A$10)</option>
                  <option value={25}>25 credits (A$25)</option>
                  <option value={50}>50 credits (A$50)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Top-up pack</span>
                <select
                  value={autoPack}
                  onChange={(e) => setAutoPack(e.target.value)}
                  className="mt-1 block w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50"
                >
                  {props.packs.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({fmtAud(p.priceCents)})
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void saveAutoRecharge()}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg"
              >
                {savingSettings ? "Saving…" : "Save"}
              </button>
              {settingsSaved && (
                <span className="text-xs text-emerald-700 font-semibold">Saved ✓</span>
              )}
              {settingsError && (
                <span className="text-xs text-red-700">{settingsError}</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Lifetime stats */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Lifetime
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total purchased</p>
            <p className="text-xl font-extrabold text-slate-900">
              {fmtAud(props.lifetimeCreditCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Total spent on briefs</p>
            <p className="text-xl font-extrabold text-slate-900">
              {fmtAud(props.lifetimeSpendCents)}
            </p>
          </div>
        </div>
      </section>

      {/* Settings links */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Settings
        </h2>
        <ul className="divide-y divide-slate-100">
          <li>
            <a
              href="/pros/settings/pricing-tier"
              className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Pricing tier</p>
                <p className="text-xs text-slate-500">
                  Standard credits or success-only (pay at outcome).
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </a>
          </li>
          <li>
            <a
              href="/pros/settings/intake"
              className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Intake questions</p>
                <p className="text-xs text-slate-500">
                  Customise what consumers answer after you accept.
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </a>
          </li>
        </ul>
      </section>

      <p className="text-[10px] text-slate-400 text-center">
        Payments processed by Stripe. Receipts are emailed automatically. <a href="/account/notifications" className="underline">Email preferences</a>.
      </p>
    </div>
  );
}
