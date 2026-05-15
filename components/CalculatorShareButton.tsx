"use client";

import { useState, useCallback } from "react";
import { buildShareableUrl } from "@/hooks/use-calculator-state";

interface CalculatorShareButtonProps {
  /** Must match the key passed to useCalculatorState. */
  calculatorKey: string;
  /** Current calculator state — passed from the parent component. */
  state: Record<string, unknown>;
  className?: string;
}

/**
 * Standalone share-link button for any calculator that uses useCalculatorState.
 *
 * Builds a deep link with all inputs encoded as query params via
 * buildShareableUrl, then copies it to the clipboard. Zero dependency on
 * CalculatorShell — drop into any calculator's JSX alongside its results panel.
 */
export default function CalculatorShareButton({
  calculatorKey,
  state,
  className,
}: CalculatorShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = buildShareableUrl(window.location.pathname, calculatorKey, state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (non-secure context) — fall back to prompt.
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [calculatorKey, state]);

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Copy shareable link to this calculation"
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-md px-3 py-1.5 transition-colors"
      }
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M1 4h3v7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Share results
        </>
      )}
    </button>
  );
}
