"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentAustralianTaxYear } from "@/lib/holdings/tax-summary";

/**
 * Tax-year summary download + advisor-handoff card.
 *
 * Calls /api/account/holdings/tax-summary?tax_year=N, turns the CSV blob
 * into an object-URL anchor, and clicks it programmatically so the
 * download triggers without leaving the page. The advisor handoff is
 * just a deep-link into /find-advisor with an `intent` query — no data
 * is transmitted (X5f explicitly defers the structured handoff blob to a
 * follow-up PR).
 *
 * Compliance: comparison-only / general information disclaimer is in the
 * card footer, matching the rest of the holdings UI.
 */
export default function TaxSummaryButton() {
  // Compute tax-year options client-side. Anchor the "current" option to
  // the AU fiscal year rather than the calendar year so users in July
  // get FY 2026-27 by default, not the previous one.
  const currentTaxYear = useMemo(() => getCurrentAustralianTaxYear(new Date()), []);
  const yearOptions = useMemo(
    () => [currentTaxYear, currentTaxYear - 1, currentTaxYear - 2],
    [currentTaxYear],
  );

  const [taxYear, setTaxYear] = useState<number>(currentTaxYear);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/account/holdings/tax-summary?tax_year=${encodeURIComponent(taxYear)}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        throw new Error(`download_failed_${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invest-com-au-tax-summary-${taxYear}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Release the object URL on the next tick — Safari sometimes
      // discards the download if revoked synchronously.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith("download_failed")
          ? "Could not generate the summary. Try again or refresh the page."
          : "Could not generate the summary. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Tax-year summary
      </h2>
      <p className="text-sm text-slate-600 mb-3">
        Download a CSV of your holdings (with cost basis in AUD) for the
        selected Australian financial year. Hand it to your accountant or
        match an advisor below.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-700">
          <span className="block font-medium mb-1">Tax year</span>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            aria-label="Australian tax year"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                FY {y - 1}-{String(y).slice(2)} (ends 30 Jun {y})
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={busy}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {busy ? "Generating…" : "Download CSV"}
        </button>

        <Link
          href="/find-advisor?intent=tax-prep"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          Send to my advisor →
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-700 mt-2" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-500 mt-3">
        General information only — see your accountant for the formal tax
        return.
      </p>
    </section>
  );
}
