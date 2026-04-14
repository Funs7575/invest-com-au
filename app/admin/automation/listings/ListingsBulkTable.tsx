"use client";

import { useState, useCallback } from "react";
import SignalsPopover from "@/components/admin/automation/SignalsPopover";
import OverrideButton from "@/components/admin/automation/OverrideButton";
import BulkActionToolbar from "@/components/admin/automation/BulkActionToolbar";

interface ListingRow {
  id: number;
  title: string;
  vertical: string;
  status: string;
  contact_email: string;
  auto_classified_verdict: string | null;
  auto_classified_risk_score: number | null;
  auto_classified_reasons: string[] | null;
  created_at: string;
}

/**
 * Client component wrapping the listings table so we can have
 * multi-select + bulk actions + CSV export on one page while the
 * outer page stays a server component for data fetch + chart.
 */
export default function ListingsBulkTable({ initialRows }: { initialRows: ListingRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleOne = useCallback((id: number) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((s) => {
      if (s.size === rows.length) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }, [rows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Removes bulk-acted rows from the table so the UI matches server state
  const onDone = useCallback(() => {
    setRows((rs) => rs.filter((r) => !selected.has(r.id)));
  }, [selected]);

  const selectedIds = [...selected];

  const csvRows = rows.map((r) => ({
    id: r.id,
    title: r.title,
    vertical: r.vertical,
    status: r.status,
    contact_email: r.contact_email,
    auto_classified_verdict: r.auto_classified_verdict,
    auto_classified_risk_score: r.auto_classified_risk_score,
    auto_classified_reasons: (r.auto_classified_reasons || []).join(";"),
    created_at: r.created_at,
  }));

  return (
    <>
      <BulkActionToolbar
        feature="listing_scam"
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onDone={onDone}
        actions={[
          { value: "active", label: "Approve → active" },
          { value: "rejected", label: "Reject" },
          { value: "pending", label: "Re-queue → pending" },
        ]}
        csvRows={csvRows}
        csvFilename="listings.csv"
      />

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Recent listings</h2>
          <p className="text-xs text-slate-500">
            Sorted by risk score descending. Tick rows to bulk-action.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-3 py-2 w-6">
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">ID</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Title</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Vertical</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Contact</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Verdict</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Risk</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Signals</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...rows]
                .sort(
                  (a, b) =>
                    (b.auto_classified_risk_score || 0) - (a.auto_classified_risk_score || 0),
                )
                .map((r) => {
                  const isSelected = selected.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/50 ${isSelected ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-500">#{r.id}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-[200px] truncate" title={r.title}>
                        {r.title}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{r.vertical}</td>
                      <td
                        className="px-4 py-2 text-[0.65rem] text-slate-500 max-w-[180px] truncate"
                        title={r.contact_email}
                      >
                        {r.contact_email}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[0.65rem] font-semibold ${
                            r.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600 text-[0.7rem]">
                        {r.auto_classified_verdict || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {r.auto_classified_risk_score !== null ? (
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-100 rounded overflow-hidden">
                              <div
                                className={`h-full ${
                                  (r.auto_classified_risk_score || 0) > 70
                                    ? "bg-red-500"
                                    : (r.auto_classified_risk_score || 0) > 40
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${r.auto_classified_risk_score}%` }}
                              />
                            </div>
                            <span className="text-[0.65rem] font-mono text-slate-600">
                              {r.auto_classified_risk_score}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <SignalsPopover reasons={r.auto_classified_reasons || null} />
                      </td>
                      <td className="px-4 py-2">
                        {r.status === "pending" ? (
                          <div className="flex gap-1">
                            <OverrideButton
                              feature="listing_scam"
                              rowId={r.id}
                              targetVerdict="active"
                              label="Approve"
                            />
                            <OverrideButton
                              feature="listing_scam"
                              rowId={r.id}
                              targetVerdict="rejected"
                              label="Reject"
                            />
                          </div>
                        ) : r.status === "active" ? (
                          <OverrideButton
                            feature="listing_scam"
                            rowId={r.id}
                            targetVerdict="rejected"
                            label="→ Unpublish"
                            requireReason
                          />
                        ) : (
                          <OverrideButton
                            feature="listing_scam"
                            rowId={r.id}
                            targetVerdict="active"
                            label="→ Publish"
                            requireReason
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                    No listings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
