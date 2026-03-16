"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";

interface Props {
  brokers: Broker[];
  asxTrades: string;
  usTrades: string;
  avgTradeSize: string;
  portfolioValue: string;
  currentBrokerSlug: string;
  isPro: boolean;
  user: unknown;
  saving: boolean;
  saveStatus: "idle" | "saved" | "error";
  onAsxTradesChange: (v: string) => void;
  onUsTradesChange: (v: string) => void;
  onAvgTradeSizeChange: (v: string) => void;
  onPortfolioValueChange: (v: string) => void;
  onCurrentBrokerSlugChange: (v: string) => void;
  onSaveProfile: () => void;
  InputField: React.ComponentType<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; suffix?: string }>;
  SelectField: React.ComponentType<{ label: string; value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }>;
}

export default function FeeImpactInputs({
  brokers,
  asxTrades,
  usTrades,
  avgTradeSize,
  portfolioValue,
  currentBrokerSlug,
  isPro,
  user,
  saving,
  saveStatus,
  onAsxTradesChange,
  onUsTradesChange,
  onAvgTradeSizeChange,
  onPortfolioValueChange,
  onCurrentBrokerSlugChange,
  onSaveProfile,
  InputField,
  SelectField,
}: Props) {
  return (
    <div className="lg:col-span-4">
      <h2 className="text-lg font-bold text-slate-900 mb-1">
        Your Trading Profile
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Adjust the inputs to match your real trading activity.
      </p>

      <div className="space-y-5">
        <InputField
          label="ASX Trades per Month"
          value={asxTrades}
          onChange={onAsxTradesChange}
          placeholder="4"
        />
        <InputField
          label="US Trades per Month"
          value={usTrades}
          onChange={onUsTradesChange}
          placeholder="0"
        />
        <InputField
          label="Average Trade Size"
          value={avgTradeSize}
          onChange={onAvgTradeSizeChange}
          placeholder="5000"
          prefix="$"
        />
        <InputField
          label="Portfolio Value (optional)"
          value={portfolioValue}
          onChange={onPortfolioValueChange}
          placeholder="50000"
          prefix="$"
        />
        <SelectField
          label="Your Current Platform"
          value={currentBrokerSlug}
          onChange={onCurrentBrokerSlugChange}
          placeholder="Select your platform..."
        >
          {brokers.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </SelectField>
      </div>

      {/* Quick info */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-700">How it works:</strong> We
        multiply your trade frequency by each platform&apos;s published
        fees — including brokerage, FX conversion, and inactivity
        charges — to calculate your real annual cost.
      </div>

      {/* Save profile button (logged-in users) */}
      {!!user && (
        <button
          onClick={onSaveProfile}
          disabled={saving}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            "Saving..."
          ) : saveStatus === "saved" ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile Saved!
            </>
          ) : saveStatus === "error" ? (
            "Error — Try Again"
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save My Profile
            </>
          )}
        </button>
      )}
    </div>
  );
}
