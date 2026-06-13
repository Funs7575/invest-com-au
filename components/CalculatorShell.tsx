"use client";

import { useState, useCallback } from "react";
import Icon from "@/components/Icon";

export interface EmailGateConfig {
  source: string;
  prompt?: string;
  ctaLabel?: string;
}

export interface CalculatorShellProps {
  title: string;
  iconName?: string;
  disclaimer?: string;
  leadForm?: React.ReactNode;
  shareResults?: boolean;
  emailGate?: EmailGateConfig;
  className?: string;
  children: React.ReactNode;
  /**
   * Optional Scenario Workspace affordance (e.g. `<ScenarioBar … />`). Rendered
   * below the calculator body. Omitted by default ⇒ zero behaviour change for
   * every calculator that doesn't opt in. ScenarioBar self-gates on the
   * `scenario_workspace` flag and sign-in state, so passing it is always safe.
   */
  scenario?: React.ReactNode;
}

export default function CalculatorShell({
  title,
  iconName = "calculator",
  disclaimer,
  leadForm,
  shareResults,
  emailGate,
  className,
  children,
  scenario,
}: CalculatorShellProps) {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, []);

  const handleEmailSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed, source: emailGate?.source ?? "calculator", name: "" }),
    }).catch(() => {});
    setEmailSubmitted(true);
  }, [email, emailGate?.source]);

  return (
    <div
      data-testid="calculator-shell"
      className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden${className ? ` ${className}` : ""}`}
    >
      <div className="bg-slate-900 px-6 py-4 text-white flex items-center gap-3">
        <Icon name={iconName} size={20} className="text-amber-400" />
        <h3 className="text-lg md:text-xl font-extrabold">{title}</h3>
      </div>

      <div className="p-6 md:p-8 space-y-7">
        {children}

        {scenario}

        {shareResults && (
          <button
            onClick={handleShare}
            data-testid="share-button"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon name="share-2" size={12} />
            {copied ? "Copied!" : "Share Results"}
          </button>
        )}

        {emailGate && !emailSubmitted && (
          <div
            data-testid="email-gate"
            className="rounded-xl bg-slate-900 text-white p-4 md:p-5"
          >
            <div className="flex items-start gap-3">
              <Icon name="mail" size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold mb-1">
                  {emailGate.prompt ?? "Get these results emailed to you"}
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="email"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 text-sm rounded-lg text-slate-900 border-0 focus:outline-none"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    data-testid="email-submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-lg shrink-0 transition-colors"
                  >
                    {emailGate.ctaLabel ?? "Send Results"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {emailGate && emailSubmitted && (
          <p
            data-testid="email-confirmation"
            className="text-sm text-emerald-600 font-bold"
          >
            Results sent — check your inbox.
          </p>
        )}

        {leadForm && <div data-testid="lead-form-slot">{leadForm}</div>}

        {disclaimer && (
          <p
            data-testid="disclaimer"
            className="text-[11px] text-slate-500 leading-relaxed"
          >
            {disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
