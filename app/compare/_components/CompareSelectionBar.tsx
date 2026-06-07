"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { renderStars } from "@/lib/tracking";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";
import { getSessionId } from "@/lib/session";

interface Props {
  brokers: Broker[];
  selected: Set<string>;
  showMobileCompare: boolean;
  onToggleMobileCompare: () => void;
  onToggleSelected: (slug: string) => void;
  onClearAll?: () => void;
}

export default function CompareSelectionBar({
  brokers,
  selected,
  showMobileCompare,
  onToggleMobileCompare,
  onToggleSelected,
  onClearAll,
}: Props) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (selected.size < 2) return null;

  const selectedBrokers = Array.from(selected)
    .map(slug => brokers.find(b => b.slug === slug))
    .filter((b): b is Broker => b !== undefined);

  async function handleSaveShortlist() {
    if (saveStatus !== "idle") return;
    setSaveStatus("saving");
    const sessionId = getSessionId();
    try {
      await Promise.all(
        selectedBrokers.map(b =>
          fetch("/api/account/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "broker", ref: b.slug, label: b.name, session_id: sessionId }),
          })
        )
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("idle");
    }
  }

  async function handleAlertSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = alertEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setAlertStatus("sending");
    try {
      const res = await fetch("/api/fee-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          brokerSlugs: Array.from(selected),
          alertType: "any",
          frequency: "immediate",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlertStatus("done");
    } catch {
      setAlertStatus("error");
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white shadow-lg bounce-in-up"
      style={{ paddingBottom: "max(0rem, env(safe-area-inset-bottom))" }}
    >
      {/* Fee alert tray — expandable above the main bar row */}
      {alertOpen && (
        <div className="border-b border-slate-700/60 py-2.5">
          <div className="container-custom">
            {alertStatus === "done" ? (
              <p className="text-xs text-emerald-400 font-semibold">
                ✓ Subscribed — we&apos;ll email you if any of these platforms change their fees.
              </p>
            ) : (
              <form onSubmit={handleAlertSubmit} className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300 shrink-0 hidden sm:inline">
                  Fee alerts for {selectedBrokers.map(b => b.name).join(", ")}:
                </span>
                <span className="text-xs text-slate-300 shrink-0 sm:hidden">
                  🔔 Fee alerts:
                </span>
                <input
                  type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  value={alertEmail}
                  onChange={e => setAlertEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  disabled={alertStatus === "sending"}
                  className="flex-1 min-w-[130px] rounded-lg border border-slate-600 bg-slate-800 text-white placeholder-slate-500 px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={alertStatus === "sending"}
                  aria-busy={alertStatus === "sending"}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 text-slate-900 text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {alertStatus === "sending" ? "Saving…" : "Alert me"}
                </button>
                {alertStatus === "error" && (
                  <span role="alert" className="text-xs text-red-400 w-full">Failed — please try again.</span>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main compare bar row */}
      <div className="container-custom py-2.5 md:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-1.5 shrink-0 md:hidden">
            {Array.from(selected).slice(0, 4).map(slug => {
              const br = brokers.find(b => b.slug === slug);
              if (!br) return null;
              return (
                <BrokerLogo key={slug} broker={br} size="xs" className="border-2 border-slate-900 rounded-full" />
              );
            })}
          </div>
          <span className="text-xs md:text-sm font-semibold truncate">
            {selected.size}/4 selected
          </span>
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[0.62rem] font-semibold text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              aria-label="Clear all selected platforms"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Save shortlist */}
          <button
            onClick={handleSaveShortlist}
            disabled={saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            title={saveStatus === "saved" ? "Shortlist saved to bookmarks" : "Save all to bookmarks"}
            className={`shrink-0 px-3 py-2 min-h-11 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              saveStatus === "saved"
                ? "bg-emerald-600 text-white"
                : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Icon name={saveStatus === "saved" ? "check-circle" : "bookmark"} size={14} />
            <span>{saveStatus === "saved" ? "Saved" : "Save"}</span>
          </button>

          {/* Fee alert toggle */}
          <button
            onClick={() => setAlertOpen(o => !o)}
            aria-expanded={alertOpen}
            title="Get fee-change alerts for these platforms"
            className={`shrink-0 px-3 py-2 min-h-11 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
              alertOpen ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            <Icon name="bell" size={14} />
            <span className="hidden sm:inline">Alerts</span>
          </button>

          {/* Mobile: Quick Compare inline */}
          <button
            onClick={onToggleMobileCompare}
            className="md:hidden shrink-0 px-3 py-2 min-h-11 inline-flex items-center bg-slate-700 text-white font-bold text-xs rounded-lg"
          >
            {showMobileCompare ? "Close" : "Quick Compare"}
          </button>
          <Link
            href={`/versus?vs=${Array.from(selected).join(",")}`}
            className="shrink-0 px-4 py-2 min-h-11 inline-flex items-center md:px-5 md:py-2 bg-white text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Full Compare →
          </Link>
        </div>
      </div>

      {/* Mobile swipe comparison panel */}
      {showMobileCompare && (
        <div className="md:hidden mt-2 pb-1">
          <div className="container-custom">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 flex gap-2 snap-x snap-mandatory">
              {Array.from(selected).map(slug => {
                const br = brokers.find(b => b.slug === slug);
                if (!br) return null;
                return (
                  <div key={slug} className="snap-center shrink-0 w-[70vw] bg-white rounded-xl p-3 text-slate-900">
                    <div className="flex items-center gap-2 mb-2">
                      <BrokerLogo broker={br} size="xs" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{br.name}</div>
                        <div className="text-amber-700 text-xs"><span aria-hidden="true">{renderStars(br.rating || 0)}</span> <span aria-label={`${br.rating} out of 5 stars`}>{br.rating}</span></div>
                      </div>
                      <button onClick={() => onToggleSelected(br.slug)} aria-label={`Remove ${br.name} from comparison`} className="ml-auto text-slate-400 hover:text-red-500 shrink-0">
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.62rem]">
                      <div><span className="text-slate-400">ASX Fee</span><div className="font-bold text-slate-800">{br.asx_fee || "N/A"}</div></div>
                      <div><span className="text-slate-400">US Fee</span><div className="font-bold text-slate-800">{br.us_fee || "N/A"}</div></div>
                      <div><span className="text-slate-400">FX Rate</span><div className="font-bold text-slate-800">{br.fx_rate != null ? `${br.fx_rate}%` : "N/A"}</div></div>
                      <div><span className="text-slate-400">CHESS</span><div className="font-bold text-slate-800">{br.chess_sponsored ? "Yes" : "No"}</div></div>
                    </div>
                    <Link href={`/broker/${br.slug}`} className="block mt-2 text-center text-[0.62rem] font-semibold text-violet-600 hover:text-violet-800">
                      Full Review →
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="text-[0.56rem] text-slate-400 text-center mt-1.5">Swipe to compare</p>
          </div>
        </div>
      )}
    </div>
  );
}
