"use client";

import { useState, useCallback, useMemo } from "react";

interface BulkActionOption {
  value: string;
  label: string;
}

interface Props {
  feature: string;
  subSurface?: string;
  selectedIds: number[];
  onClearSelection: () => void;
  onDone: () => void;
  /** Feature-specific target verdicts — dropdown options */
  actions: BulkActionOption[];
  /**
   * CSV rows to export when the "Export CSV" button is clicked.
   * Each row is a flat object; headers are inferred from the first row.
   */
  csvRows?: Array<Record<string, string | number | null>>;
  csvFilename?: string;
}

/**
 * Sticky bulk-action toolbar that appears when rows are selected
 * on a drill-down page. Supports:
 *
 *   - Bulk approve / bulk reject with a confirmation prompt
 *   - CSV export of the current page's rows (client-side download)
 *
 * The toolbar is intentionally dumb about the row rendering — the
 * parent page keeps a Set<number> of selected ids and passes it in.
 */
export default function BulkActionToolbar({
  feature,
  subSurface,
  selectedIds,
  onClearSelection,
  onDone,
  actions,
  csvRows,
  csvFilename,
}: Props) {
  const [targetVerdict, setTargetVerdict] = useState(actions[0]?.value || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const exportCsv = useCallback(() => {
    if (!csvRows || csvRows.length === 0) return;
    const headers = Object.keys(csvRows[0]);
    const lines = [
      headers.join(","),
      ...csvRows.map((row) =>
        headers
          .map((h) => {
            const v = row[h];
            if (v == null) return "";
            const s = String(v);
            // Quote if contains comma, quote, or newline
            if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvFilename || `${feature}-export.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [csvRows, csvFilename, feature]);

  const runBulk = useCallback(async () => {
    setError(null);
    setFlash(null);
    if (selectedIds.length === 0) return;
    const reason = window.prompt(
      `Bulk ${targetVerdict} ${selectedIds.length} ${feature} rows. Reason (audit-logged):`,
      "",
    );
    if (reason == null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/automation/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature,
          subSurface,
          targetVerdict,
          rowIds: selectedIds,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFlash(`${data.updated} rows updated${data.failed ? `, ${data.failed} failed` : ""}`);
      onClearSelection();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "bulk_failed");
    } finally {
      setBusy(false);
    }
  }, [feature, subSurface, targetVerdict, selectedIds, onClearSelection, onDone]);

  const hasSelection = selectedIds.length > 0;

  const selectionLabel = useMemo(
    () => (hasSelection ? `${selectedIds.length} selected` : "None selected"),
    [hasSelection, selectedIds.length],
  );

  return (
    <div className="sticky top-2 z-20 bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
      <div className="text-xs font-semibold text-slate-700">{selectionLabel}</div>

      <div className="flex items-center gap-2">
        <select
          value={targetVerdict}
          onChange={(e) => setTargetVerdict(e.target.value)}
          className="px-2 py-1 border border-slate-300 rounded text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runBulk}
          disabled={!hasSelection || busy}
          className="px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "…" : "Apply"}
        </button>
        {hasSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2 py-1 text-[0.65rem] rounded text-slate-600 hover:bg-slate-100"
          >
            clear
          </button>
        )}
      </div>

      {csvRows && csvRows.length > 0 && (
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto px-3 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          ↓ Export CSV ({csvRows.length})
        </button>
      )}

      {error && <span className="text-[0.65rem] text-red-700">{error}</span>}
      {flash && <span className="text-[0.65rem] text-emerald-700">{flash}</span>}
    </div>
  );
}
