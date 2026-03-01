"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "broker_getting_started_dismissed";

interface ChecklistItem {
  label: string;
  href: string;
  done: boolean;
}

interface Props {
  brokerSlug: string;
  hasAcceptedTerms: boolean;
  walletBalanceCents: number;
  campaignCount: number;
  hasCreatives: boolean;
  hasConversions: boolean;
}

export default function GettingStartedChecklist({
  brokerSlug,
  hasAcceptedTerms,
  walletBalanceCents,
  campaignCount,
  hasCreatives,
  hasConversions,
}: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const items: ChecklistItem[] = [
    {
      label: "Accept Marketplace Terms",
      href: "/broker-portal/settings",
      done: hasAcceptedTerms,
    },
    {
      label: "Add Funds to Wallet (min $50)",
      href: "/broker-portal/wallet",
      done: walletBalanceCents >= 5000,
    },
    {
      label: "Upload Brand Assets",
      href: "/broker-portal/creatives",
      done: hasCreatives,
    },
    {
      label: "Create Your First Campaign",
      href: "/broker-portal/campaigns/new",
      done: campaignCount > 0,
    },
    {
      label: "Track Conversions",
      href: "/broker-portal/webhooks",
      done: hasConversions,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  // Auto-hide after all complete (show confetti message briefly)
  useEffect(() => {
    if (allComplete && !dismissed) {
      setShowComplete(true);
      const timer = setTimeout(() => {
        setShowComplete(false);
        setDismissed(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, "true");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  if (dismissed && !showComplete) return null;

  // All-complete confetti message
  if (showComplete) {
    return (
      <div className="fixed bottom-20 left-4 z-50">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 px-5 py-4 w-72">
          <p className="text-sm font-bold text-slate-800 text-center">
            {"\uD83C\uDF89"} All set! You&apos;re ready to go.
          </p>
        </div>
      </div>
    );
  }

  // SVG progress ring constants
  const ringSize = 48;
  const strokeWidth = 3.5;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Collapsed: progress ring only
  if (!expanded) {
    return (
      <div className="fixed bottom-20 left-4 z-50">
        <button
          onClick={() => setExpanded(true)}
          className="w-12 h-12 rounded-full bg-white shadow-xl border border-slate-200 flex items-center justify-center hover:shadow-2xl transition-shadow group relative"
          aria-label="Open getting started checklist"
        >
          <svg
            width={ringSize}
            height={ringSize}
            className="absolute inset-0"
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            {/* Background ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              className="transition-all duration-500"
            />
          </svg>
          <span className="text-xs font-bold text-slate-700 relative z-10">
            {completedCount}/{totalCount}
          </span>
        </button>
      </div>
    );
  }

  // Expanded: full checklist card
  return (
    <div className="fixed bottom-20 left-4 z-50">
      <div className="w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              Getting Started
            </h3>
            <button
              onClick={() => setExpanded(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Collapse checklist"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {completedCount} of {totalCount} complete
          </p>
        </div>

        {/* Checklist items */}
        <div className="px-4 pb-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 py-2 border-t border-slate-100 first:border-t-0"
            >
              {/* Checkbox */}
              <div
                className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-200"
                }`}
              >
                {item.done && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              {/* Label */}
              {item.done ? (
                <span className="text-xs text-slate-400 line-through flex-1">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-xs font-bold text-slate-800 hover:text-amber-600 transition-colors flex-1"
                >
                  {item.label}
                </Link>
              )}

              {/* Arrow link for incomplete items */}
              {!item.done && (
                <Link
                  href={item.href}
                  className="text-slate-300 hover:text-amber-500 transition-colors shrink-0"
                  aria-label={`Go to ${item.label}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Dismiss link */}
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
